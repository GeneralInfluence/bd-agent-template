'use strict';

/**
 * Lead Agent Bot — Lightweight Telegram Handler
 *
 * Architecture:
 * - Grammy.js handles ALL Telegram messages (cheap)
 * - Only invokes LLM when: @mentioned, bot added to group, or /ask command
 * - All other messages: just log the user to Supabase (free)
 *
 * Cost model:
 * - Supabase upserts: free
 * - LLM calls: only when needed (mention / intro trigger)
 */

require('dotenv').config();

const { Bot } = require('grammy');
const db = require('./src/supabase');
const llm = require('./src/llm');
const ditto = require('./src/ditto');
const prism = require('./src/prism');
const steward = require('./src/steward');
const webhook = require('./src/webhook');
const reminders = require('./src/reminders');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BD_STEWARD_ID = process.env.BD_STEWARD_TELEGRAM_ID;

if (!BOT_TOKEN) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

// Init services
db.init();
try { llm.init(); } catch (e) { console.warn('⚠️  LLM disabled:', e.message); }

const bot = new Bot(BOT_TOKEN);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isMentioned(ctx) {
  const text = ctx.message?.text || '';
  const username = ctx.me?.username;
  return ctx.message?.entities?.some(
    e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).toLowerCase() === `@${username}`.toLowerCase()
  );
}

async function notifySteward(bot, lead, groupName) {
  if (!BD_STEWARD_ID) return;
  const msg =
    `🌀 *New Lead Confirmed*\n\n` +
    `*Client:* ${lead.client_name || 'Unknown'}\n` +
    `*Contact:* ${lead.client_contact || 'Unknown'}\n` +
    `*Introducer:* ${lead.introducer || 'Unknown'}\n` +
    `*Type:* ${lead.opportunity_type}\n` +
    `*Group:* ${groupName}\n` +
    `*Summary:* ${lead.description || '(none)'}`;
  try {
    await bot.api.sendMessage(BD_STEWARD_ID, msg, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Failed to notify steward:', e.message);
  }
}

// ─────────────────────────────────────────────
// Bot added to group
// ─────────────────────────────────────────────

bot.on('my_chat_member', async (ctx) => {
  const newStatus = ctx.myChatMember?.new_chat_member?.status;
  if (!['member', 'administrator'].includes(newStatus)) return;

  const chat = ctx.chat;
  console.log(`[bot-added] Added to group ${chat.id} (${chat.title})`);
  // Note in Ditto that a potential intro group was created
  await ditto.saveMemory(
    `${process.env.ORG_NAME || 'Lead agent'} bot added to Telegram group "${chat.title}" — potential warm intro`,
    `group_id: ${chat.id}`
  );

  // Trigger LLM greeting
  try {
    const reply = await llm.respond({
      chatId: chat.id,
      userMessage: `[System: Bot was just added to this group. Greet everyone warmly and indicate you're here to help with introductions to ${process.env.ORG_NAME || 'our organization'}.]]`,
      senderName: 'System',
      groupName: chat.title || 'group',
      trigger: 'bot-added',
    });
    if (reply && reply !== 'NO_REPLY') {
      await ctx.api.sendMessage(chat.id, llm.stripLeadBlock(reply));
    }
  } catch (e) {
    console.error('LLM error on bot-added:', e.message);
    await ctx.api.sendMessage(chat.id,
      `👋 Hey! I'm here to help with warm introductions. Feel free to introduce anyone you think would be a good fit — I'll take it from there.`
    );
  }
});

// ─────────────────────────────────────────────
// All messages
// ─────────────────────────────────────────────

// Catch-all for debugging — fires on every update
bot.use(async (ctx, next) => {
  if (ctx.update?.message) {
    const u = ctx.update.message;
    console.log(`[update] type=${ctx.updateType} from=${u.from?.first_name}(${u.from?.id}) text=${u.text?.slice(0,40)}`);
  }
  return next();
});

bot.on('message', async (ctx) => {
  const msg = ctx.message;
  const user = ctx.from;
  const chat = ctx.chat;

  if (!msg?.text || !user) return;

  console.log(`[msg] ${chat.type} | ${user.first_name} (${user.id}) | ${msg.text?.slice(0,50)}`);

  // ── 1. Always: log the user (free, no LLM) ──────────────────
  const optedOut = await db.isOptedOut(user.id).catch(() => false);
  if (!optedOut) {
    await db.upsertUser({
      telegram_id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      group_id: chat.type !== 'private' ? chat.id : null,
    }).catch(e => console.error('upsertUser failed:', e.message));
  }

  // ── 2. Check for active steward /add session in DM ──────────
  const isDM = chat.type === 'private';
  const mentioned = isMentioned(ctx);

  if (isDM && steward.isSteward(user.id) && steward.addSessions.has(user.id)) {
    return steward.handleAdd(ctx, msg.text, true);
  }

  if (!isDM && !mentioned) return; // Not for us — skip LLM entirely

  // ── 3. LLM response ─────────────────────────────────────────
  try {
    // Fetch Prism context in parallel (won't block if unavailable)
    const prismCtx = await prism.getBDContext().catch(() => null);

    const reply = await llm.respond({
      chatId: chat.id,
      userMessage: msg.text,
      senderName: user.first_name || user.username || String(user.id),
      groupName: chat.title || 'DM',
      trigger: isDM ? 'dm' : 'mention',
      prismContext: prismCtx?.summary || null,
    });

    if (!reply || reply === 'NO_REPLY') return;

    // Check if LLM confirmed a lead
    const leadData = llm.extractLeadConfirmation(reply);
    const cleanReply = llm.stripLeadBlock(reply);

    if (cleanReply) {
      await ctx.reply(cleanReply, { reply_to_message_id: msg.message_id }).catch(() =>
        ctx.api.sendMessage(chat.id, cleanReply)
      );
    }

    if (leadData) {
      console.log('[lead-confirmed]', leadData);
      try {
        const lead = await db.createLead({
          ...leadData,
          introducer_id: null,
          source_group_id: chat.type !== 'private' ? chat.id : null,
        });
        await db.logEvent({
          lead_id: lead.id,
          event_type: 'qualification',
          actor: 'Lead Agent Bot',
          details: 'Lead confirmed by LLM after qualifying conversation',
        });
        // Save to Ditto knowledge graph (optional — only if DITTO_API_KEY is set)
        await ditto.saveMemory(
          `${lead.introducer || 'Someone'} introduced ${lead.client_name || 'a client'} to ${process.env.ORG_NAME || 'the org'} — lead qualified. ${lead.description || ''}`,
          `lead_id: ${lead.id}, group: ${chat.title || 'DM'}, opportunity: ${lead.opportunity_type}`
        );
        await notifySteward(bot, lead, chat.title || 'DM');
        console.log('[lead-saved]', lead.id);
      } catch (e) {
        console.error('Failed to save lead:', e.message);
      }
    }
  } catch (e) {
    console.error('LLM error:', e.message);
  }
});

// ─────────────────────────────────────────────
// BD Steward commands (DM only, privileged)
// ─────────────────────────────────────────────

bot.command('pipeline', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  return steward.handlePipeline(ctx);
});

bot.command('add', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  return steward.handleAdd(ctx, null, false);
});

bot.command('note', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const args = ctx.message.text.split(' ').slice(1);
  return steward.handleNote(ctx, args);
});

bot.command('confirm', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const args = ctx.message.text.split(' ').slice(1);
  return steward.handleConfirm(ctx, args);
});

bot.command('close', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const args = ctx.message.text.split(' ').slice(1);
  return steward.handleClose(ctx, args);
});

bot.command('update', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const args = ctx.message.text.split(' ').slice(1);
  return steward.handleUpdate(ctx, args);
});

bot.command('query', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const args = ctx.message.text.split(' ').slice(1);
  return steward.handleQuery(ctx, args);
});

bot.command('help', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return;
  return ctx.reply(
    `🌀 *BD Steward Commands*\n\n` +
    `/pipeline — view all active leads\n` +
    `/add — add a new lead (conversational)\n` +
    `/update <id> <field> <value> — update a lead field\n` +
    `/note <id> <text> — add a note to a lead\n` +
    `/confirm <id> — mark a lead as qualified\n` +
    `/close <id> [won|lost|stale] — close a lead\n` +
    `/query <question> — search Prism + pipeline\n` +
    `/remind YYYY-MM-DD <text> — set a follow-up reminder\n` +
    `/reminders — list pending reminders\n`,
    { parse_mode: 'Markdown' }
  );
});

// ─────────────────────────────────────────────
// /optout command
// ─────────────────────────────────────────────

bot.command('optout', async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  await db.client().from('opt_out_users').upsert({ user_id: user.id }, { onConflict: 'user_id' });
  await ctx.reply('You have been opted out. Your messages will no longer be logged.');
});

// ─────────────────────────────────────────────
// /remind command (steward only)
// ─────────────────────────────────────────────

bot.command('remind', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  // Usage: /remind YYYY-MM-DD Your reminder text
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) {
    return ctx.reply('Usage: /remind YYYY-MM-DD Your reminder text\nExample: /remind 2026-04-14 Follow up with Rich at Livepeer');
  }
  const dateStr = args[0];
  const text = args.slice(1).join(' ');
  const fireAt = new Date(dateStr);
  if (isNaN(fireAt.getTime())) {
    return ctx.reply(`Invalid date: ${dateStr}. Use YYYY-MM-DD format.`);
  }
  const r = reminders.addReminder({
    text,
    isoDate: fireAt.toISOString(),
    chatId: ctx.chat.id,
  });
  return ctx.reply(`⏰ Reminder set for ${fireAt.toDateString()}\n"${text}"\n\nID: \`${r.id}\``, { parse_mode: 'Markdown' });
});

bot.command('reminders', async (ctx) => {
  if (!steward.isSteward(ctx.from?.id)) return ctx.reply('This command is for the BD steward only.');
  const all = reminders.loadReminders();
  if (!all.length) return ctx.reply('No reminders set.');
  const lines = all.map(r =>
    `• ${new Date(r.fireAt).toDateString()} — ${r.text.slice(0, 60)}\n  \`${r.id}\``
  ).join('\n\n');
  return ctx.reply(`⏰ *Pending Reminders*\n\n${lines}`, { parse_mode: 'Markdown' });
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────

bot.catch(err => console.error('Bot error:', err));

// Start webhook server (Supabase → Ditto + steward notifications, no LLM)
webhook.start(bot);

// Start cron scheduler (reminders, stale detection, weekly pipeline)
reminders.start(bot);

bot.start({
  allowed_updates: ['message', 'my_chat_member'],
  onStart: info => console.log(`✅ @${info.username} is running`),
});

console.log('🌀 Lead Agent Bot starting...');
