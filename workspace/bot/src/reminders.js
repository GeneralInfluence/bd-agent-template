'use strict';

/**
 * Reminders — node-cron based, replaces OpenClaw cron jobs
 *
 * Handles:
 *   1. Scheduled follow-up reminders (stored in reminders.json)
 *   2. Weekly pipeline review (every Monday 9am steward timezone)
 *   3. Stale lead detection (daily check — leads with no activity in 7+ days)
 *
 * All deterministic — no LLM needed.
 * Reminders persist to disk so they survive bot restarts.
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('./supabase');

const REMINDERS_FILE = path.join(__dirname, '..', 'data', 'reminders.json');
const STEWARD_TZ = process.env.STEWARD_TZ || 'America/Los_Angeles';

// ── Persistence ─────────────────────────────────────────────────

function loadReminders() {
  try {
    if (!fs.existsSync(REMINDERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf8'));
  } catch { return []; }
}

function saveReminders(reminders) {
  fs.mkdirSync(path.dirname(REMINDERS_FILE), { recursive: true });
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

/**
 * Add a one-shot reminder.
 * @param {object} opts
 * @param {string} opts.text - Message to send
 * @param {string} opts.isoDate - ISO 8601 date string (when to fire)
 * @param {string} opts.chatId - Telegram chat ID to send to
 * @param {string} [opts.leadId] - Optional lead ID for context
 */
function addReminder({ text, isoDate, chatId, leadId }) {
  const reminders = loadReminders();
  const reminder = {
    id: `r_${Date.now()}`,
    text,
    fireAt: new Date(isoDate).getTime(),
    chatId: String(chatId),
    leadId: leadId || null,
    created: new Date().toISOString(),
  };
  reminders.push(reminder);
  saveReminders(reminders);
  console.log(`[reminders] Added: "${text.slice(0, 50)}" at ${isoDate}`);
  return reminder;
}

function removeReminder(id) {
  const reminders = loadReminders().filter(r => r.id !== id);
  saveReminders(reminders);
}

// ── Stale lead detection ─────────────────────────────────────────

async function checkStaleLeads(bot, stewardId) {
  if (!stewardId) return;
  try {
    const supabase = db.client();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: stale } = await supabase
      .from('leads')
      .select('id, client_name, status, updated_at, opportunity_type')
      .in('status', ['warm-intro', 'qualified', 'proposal'])
      .lt('updated_at', cutoff)
      .order('updated_at', { ascending: true });

    if (!stale || stale.length === 0) return;

    const lines = stale.map(l => {
      const days = Math.floor((Date.now() - new Date(l.updated_at).getTime()) / 86400000);
      return `⚫ *${l.client_name || 'Unknown'}* — ${l.status} — ${days}d ago`;
    });

    await bot.api.sendMessage(
      stewardId,
      `📋 *Stale Leads (7+ days no activity)*\n\n${lines.join('\n')}\n\nUse /pipeline to review.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('[reminders] stale check failed:', e.message);
  }
}

// ── Weekly pipeline summary ─────────────────────────────────────

async function sendWeeklyPipeline(bot, stewardId) {
  if (!stewardId) return;
  try {
    const supabase = db.client();
    const { data: leads } = await supabase
      .from('leads')
      .select('id, client_name, status, opportunity_type, introducer')
      .not('status', 'in', '("closed-won","closed-lost")')
      .order('created_at', { ascending: false });

    if (!leads || leads.length === 0) {
      await bot.api.sendMessage(stewardId, '📋 *Weekly Pipeline*\n\nNo active leads.', { parse_mode: 'Markdown' });
      return;
    }

    const byStatus = leads.reduce((acc, l) => {
      acc[l.status] = acc[l.status] || [];
      acc[l.status].push(l);
      return acc;
    }, {});

    const STATUS_ORDER = ['funded', 'proposal', 'qualified', 'warm-intro', 'stale'];
    const STATUS_EMOJI = { 'warm-intro': '🟡', 'qualified': '🟢', 'proposal': '🔵', 'funded': '💰', 'stale': '⚫' };

    const sections = STATUS_ORDER
      .filter(s => byStatus[s]?.length)
      .map(s => {
        const emoji = STATUS_EMOJI[s] || '•';
        const items = byStatus[s].map(l => `  • *${l.client_name || '?'}* (${l.opportunity_type})`).join('\n');
        return `${emoji} *${s.toUpperCase()}*\n${items}`;
      });

    await bot.api.sendMessage(
      stewardId,
      `📋 *Weekly Pipeline Review*\n\n${sections.join('\n\n')}\n\n_${leads.length} active lead(s)_`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('[reminders] weekly pipeline failed:', e.message);
  }
}

// ── Start scheduler ─────────────────────────────────────────────

function start(bot) {
  const stewardId = process.env.BD_STEWARD_TELEGRAM_ID;

  // Check one-shot reminders every minute
  cron.schedule('* * * * *', async () => {
    const now = Date.now();
    const reminders = loadReminders();
    const due = reminders.filter(r => r.fireAt <= now);
    if (!due.length) return;

    for (const r of due) {
      try {
        await bot.api.sendMessage(r.chatId, `⏰ *Reminder*\n\n${r.text}`, { parse_mode: 'Markdown' });
        console.log(`[reminders] Fired: ${r.id} — "${r.text.slice(0, 50)}"`);
      } catch (e) {
        console.error(`[reminders] Failed to send ${r.id}:`, e.message);
      }
      removeReminder(r.id);
    }
  });

  // Daily stale check at 9am steward local time
  cron.schedule('0 9 * * *', () => checkStaleLeads(bot, stewardId), { timezone: STEWARD_TZ });

  // Weekly pipeline summary — Monday 9am steward local time
  cron.schedule('0 9 * * 1', () => sendWeeklyPipeline(bot, stewardId), { timezone: STEWARD_TZ });

  console.log('⏰ Reminders scheduler started');
}

module.exports = { start, addReminder, removeReminder, loadReminders };
