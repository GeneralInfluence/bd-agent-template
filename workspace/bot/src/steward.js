'use strict';

/**
 * BD Steward Interface
 * Special privileges for the configured BD_STEWARD_TELEGRAM_ID.
 * Handles /pipeline, /add, /update, /note, /confirm, /close, /query commands.
 */

const db = require('./supabase');
const prism = require('./prism');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

let anthropic;
function initLLM() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
}

function isSteward(userId) {
  return String(userId) === String(process.env.BD_STEWARD_TELEGRAM_ID);
}

// Format a lead for display
function formatLead(lead, short = false) {
  const status = {
    'warm-intro': '🟡 warm-intro',
    'qualified': '🟢 qualified',
    'proposal': '🔵 proposal',
    'funded': '💰 funded',
    'closed-won': '✅ closed-won',
    'closed-lost': '❌ closed-lost',
    'stale': '⚫ stale',
  }[lead.status] || lead.status;

  if (short) {
    return `${status} | *${lead.client_name || 'Unknown'}* | ${lead.opportunity_type} | via ${lead.introducer || '?'}`;
  }

  return [
    `*${lead.client_name || 'Unknown'}*`,
    `Status: ${status}`,
    `Type: ${lead.opportunity_type}`,
    `Contact: ${lead.client_contact || 'unknown'}`,
    `Introducer: ${lead.introducer || 'unknown'}`,
    `Member: ${lead.assigned_member || 'unassigned'}`,
    lead.description ? `Summary: ${lead.description}` : null,
    lead.notes ? `Notes: ${lead.notes}` : null,
    `ID: \`${lead.id}\``,
  ].filter(Boolean).join('\n');
}

// /pipeline — show all active leads
async function handlePipeline(ctx) {
  const db_ = db.client();
  const { data: leads, error } = await db_
    .from('leads')
    .select('*')
    .not('status', 'in', '("closed-won","closed-lost")')
    .order('created_at', { ascending: false });

  if (error) return ctx.reply('❌ Error fetching pipeline: ' + error.message);
  if (!leads?.length) return ctx.reply('Pipeline is empty.');

  const grouped = {};
  for (const lead of leads) {
    if (!grouped[lead.status]) grouped[lead.status] = [];
    grouped[lead.status].push(lead);
  }

  const order = ['warm-intro', 'qualified', 'proposal', 'funded', 'stale'];
  let msg = `🌀 *BD Pipeline* (${leads.length} active)\n\n`;

  for (const status of order) {
    if (!grouped[status]?.length) continue;
    msg += `*${status.toUpperCase()}*\n`;
    for (const lead of grouped[status]) {
      msg += `• ${formatLead(lead, true)}\n`;
    }
    msg += '\n';
  }

  msg += `_Use /add to add a lead, /update <id> to change status_`;
  return ctx.reply(msg, { parse_mode: 'Markdown' });
}

// /note <lead_id> <text> — quick note
async function handleNote(ctx, args) {
  const [leadId, ...rest] = args;
  const note = rest.join(' ');
  if (!leadId || !note) return ctx.reply('Usage: /note <lead_id> <text>');

  await db.logEvent({
    lead_id: leadId,
    event_type: 'note',
    actor: 'BD Steward',
    details: note,
  });
  return ctx.reply('✅ Note added.');
}

// /confirm <lead_id> — mark as qualified
async function handleConfirm(ctx, args) {
  const [leadId] = args;
  if (!leadId) return ctx.reply('Usage: /confirm <lead_id>');

  const db_ = db.client();
  const { error } = await db_
    .from('leads')
    .update({ status: 'qualified', updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return ctx.reply('❌ ' + error.message);
  await db.logEvent({ lead_id: leadId, event_type: 'status_change', actor: 'BD Steward', details: 'Marked as qualified' });
  return ctx.reply('✅ Lead marked as qualified.');
}

// /close <lead_id> [won|lost|stale] — close a lead
async function handleClose(ctx, args) {
  const [leadId, outcome = 'closed-lost'] = args;
  if (!leadId) return ctx.reply('Usage: /close <lead_id> [won|lost|stale]');

  const status = outcome === 'won' ? 'closed-won' : outcome === 'stale' ? 'stale' : 'closed-lost';
  const db_ = db.client();
  const { error } = await db_
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return ctx.reply('❌ ' + error.message);
  await db.logEvent({ lead_id: leadId, event_type: 'status_change', actor: 'BD Steward', details: `Closed: ${status}` });
  return ctx.reply(`✅ Lead closed as ${status}.`);
}

// /query <text> — search Prism + Supabase
async function handleQuery(ctx, args) {
  initLLM();
  const q = args.join(' ');
  if (!q) return ctx.reply('Usage: /query <question>');

  await ctx.reply('🔍 Searching...');

  // Search Prism
  const [prismResults, bdContext] = await Promise.all([
    prism.searchKnowledge(q, { limit: 3 }).catch(() => null),
    prism.getBDContext().catch(() => null),
  ]);

  // Get open leads for context
  const db_ = db.client();
  const { data: leads } = await db_.from('leads').select('client_name,status,description,opportunity_type')
    .not('status', 'in', '("closed-won","closed-lost","stale")').limit(10);

  const prismText = prismResults?.results?.map(r => `- ${r.title}: ${r.summary}`).join('\n') || 'No results';
  const leadsText = leads?.map(l => `- ${l.client_name} (${l.status}, ${l.opportunity_type}): ${l.description || ''}`).join('\n') || 'No active leads';

  const resp = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 500,
    system: `You are the RaidGuild BD agent. Answer the steward's question using the provided context. Be concise.`,
    messages: [{
      role: 'user',
      content: `Question: ${q}\n\nActive leads:\n${leadsText}\n\nPrism knowledge:\n${prismText}\n\nRecent community context:\n${bdContext?.summary || 'unavailable'}`,
    }],
  });

  return ctx.reply(resp.content[0].text, { parse_mode: 'Markdown' });
}

// /add — conversational lead creation using LLM extraction
const addSessions = new Map(); // userId → { step, data }

async function handleAdd(ctx, text, isFollowUp = false) {
  initLLM();
  const userId = ctx.from.id;

  if (!isFollowUp) {
    // Start a new add session
    addSessions.set(userId, { step: 'gathering', data: {}, messages: [] });
    await ctx.reply(
      '➕ *Adding a new lead.*\n\nDescribe the lead in plain language — client name, what they need, who introduced them, current status, opportunity type. As much or as little as you know.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const session = addSessions.get(userId);
  if (!session) return ctx.reply('Send /add to start adding a lead.');

  session.messages.push({ role: 'user', content: text });

  const resp = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 600,
    system: `You are helping a BD steward add a new lead to a CRM. 
Extract lead details from the conversation and either ask for missing key info or confirm you have enough to save.

When you have enough, respond with a JSON block:
\`\`\`lead_data
{
  "client_name": "...",
  "client_contact": "...",
  "introducer": "...",
  "description": "...",
  "opportunity_type": "new-raid|sponsor|recruiting|new-venture|product-integration|other",
  "status": "warm-intro|qualified|proposal|funded",
  "assigned_member": "...",
  "notes": "..."
}
\`\`\`

If you need more info, just ask one focused question. Keep it brief.
Required fields: client_name, opportunity_type, status. Everything else optional.`,
    messages: session.messages,
  });

  const reply = resp.content[0].text;
  session.messages.push({ role: 'assistant', content: reply });

  // Check if LLM extracted enough data
  const match = reply.match(/```lead_data\s*([\s\S]*?)```/);
  if (match) {
    try {
      const leadData = JSON.parse(match[1].trim());
      const cleanReply = reply.replace(/```lead_data[\s\S]*?```/g, '').trim();

      // Save to Supabase
      const lead = await db.createLead({
        ...leadData,
        source: 'steward-import',
        source_group_id: null,
        introducer_id: null,
      });

      await db.logEvent({
        lead_id: lead.id,
        event_type: 'note',
        actor: 'BD Steward',
        details: 'Lead imported manually by BD steward',
      });

      addSessions.delete(userId);

      const confirmMsg = cleanReply
        ? `${cleanReply}\n\n✅ Lead saved! ID: \`${lead.id}\``
        : `✅ Lead saved!\n\n${formatLead(lead)}\n\nID: \`${lead.id}\``;

      return ctx.reply(confirmMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('[add-lead] parse error:', e.message);
    }
  }

  // Still gathering — send LLM's follow-up question
  return ctx.reply(reply, { parse_mode: 'Markdown' });
}

// /update <lead_id> <field> <value> — quick field update
// e.g. /update abc-123 status proposal
// e.g. /update abc-123 assigned_member "@alice"
async function handleUpdate(ctx, args) {
  const [leadId, field, ...rest] = args;
  const value = rest.join(' ');

  if (!leadId || !field || !value) {
    return ctx.reply('Usage: /update <lead_id> <field> <value>\nFields: status, assigned_member, notes, priority, description');
  }

  const allowed = ['status', 'assigned_member', 'notes', 'priority', 'description', 'client_contact'];
  if (!allowed.includes(field)) {
    return ctx.reply(`Allowed fields: ${allowed.join(', ')}`);
  }

  const db_ = db.client();
  const { error } = await db_
    .from('leads')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return ctx.reply('❌ ' + error.message);
  await db.logEvent({
    lead_id: leadId,
    event_type: 'status_change',
    actor: 'BD Steward',
    details: `Updated ${field} → ${value}`,
  });
  return ctx.reply(`✅ Updated ${field} to "${value}".`);
}

module.exports = { isSteward, handlePipeline, handleNote, handleConfirm, handleClose, handleQuery, handleAdd, handleUpdate, addSessions };
