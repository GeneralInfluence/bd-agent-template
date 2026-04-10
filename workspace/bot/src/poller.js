'use strict';

/**
 * Lead Poller — Supabase polling replaces webhook server
 *
 * Polls the leads table every 60 seconds for new or changed records.
 * On any change:
 *   1. Notifies the BD steward via Telegram
 *   2. Logs to Ditto knowledge graph (contribution ledger)
 *
 * Zero setup required — uses the same Supabase credentials already in .env.
 * No public URL, no open ports, no dashboard configuration.
 *
 * Trade-off: ~60 second delay vs instant webhook. Fine for BD pipelines.
 */

const cron = require('node-cron');
const db = require('./supabase');
const ditto = require('./ditto');

const POLL_INTERVAL_SECONDS = 60;
const STATE_KEY = 'poller_last_seen';

const STATUS_EMOJI = {
  'warm-intro': '🟡',
  'qualified':  '🟢',
  'proposal':   '🔵',
  'funded':     '💰',
  'closed-won': '✅',
  'closed-lost':'❌',
  'stale':      '⚫',
};

// In-memory last-seen timestamp (ISO string). Persists across poll cycles.
let lastSeenAt = null;

function initLastSeen() {
  // Start from "now minus 2 minutes" on first boot so we don't spam old records
  if (!lastSeenAt) {
    lastSeenAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  }
}

// ── Telegram notification ───────────────────────────────────────

async function notifySteward(bot, stewardId, lead, isNew) {
  if (!stewardId || !bot) return;

  const emoji = STATUS_EMOJI[lead.status] || '🔄';
  const header = isNew
    ? `🌀 *New Lead*`
    : `${emoji} *Lead Updated → ${lead.status}*`;

  const lines = [
    header,
    `*${lead.client_name || 'Unknown'}*`,
    lead.opportunity_type ? `Type: ${lead.opportunity_type}` : null,
    lead.introducer       ? `Introducer: ${lead.introducer}` : null,
    lead.client_contact   ? `Contact: ${lead.client_contact}` : null,
    lead.description      ? `\n${lead.description}` : null,
    `\n\`${lead.id.slice(0, 8)}\``,
  ].filter(Boolean).join('\n');

  await bot.api.sendMessage(stewardId, lines, { parse_mode: 'Markdown' })
    .catch(e => console.error('[poller] Telegram notify failed:', e.message));
}

// ── Ditto contribution-ledger log ───────────────────────────────

function buildDittoLog(lead, isNew) {
  const opportunityType = {
    'new-raid':             'Raid / Contract',
    'recruiting':           'Recruiting for a Sponsor',
    'new-venture':          'New Venture',
    'cohort-sponsorship':   'Cohort Sponsorship',
    'cohort-recruiting':    'Cohort Attendee Recruiting',
  }[lead.opportunity_type] || lead.opportunity_type || 'Opportunity';

  const contributors = [lead.assigned_member, lead.introducer]
    .filter(Boolean).join(', ') || 'unknown';

  const contributorLines = [
    lead.assigned_member ? `- ${lead.assigned_member} is the LEAD (assigned member).` : null,
    lead.introducer      ? `- ${lead.introducer} contributed as introducer.` : null,
  ].filter(Boolean).join('\n') || '- Contributors not yet assigned.';

  const statusNote = isNew ? 'New lead entered pipeline.' : `Status updated to: ${lead.status}.`;

  return (
    `Ditto, here is an update for the memory graph: ${opportunityType} — ${lead.client_name || 'Unknown'}, involving ${contributors}.\n\n` +
    `Current status: ${lead.status}. ${statusNote}${lead.notes ? ' ' + lead.notes : ''}\n\n` +
    `Contributors and roles:\n${contributorLines}`
  );
}

// ── Poll cycle ──────────────────────────────────────────────────

async function poll(bot) {
  const stewardId = process.env.BD_STEWARD_TELEGRAM_ID;

  try {
    const supabase = db.client();
    const since = lastSeenAt;

    // Fetch leads created or updated since last poll
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .or(`created_at.gt.${since},updated_at.gt.${since}`)
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('[poller] Supabase query error:', error.message);
      return;
    }

    if (!leads || leads.length === 0) return;

    console.log(`[poller] ${leads.length} lead(s) changed since ${since}`);

    for (const lead of leads) {
      const isNew = lead.created_at > since;

      // 1. Notify steward
      await notifySteward(bot, stewardId, lead, isNew);

      // 2. Log to Ditto
      const log = buildDittoLog(lead, isNew);
      await ditto.saveMemory(log, `lead_id: ${lead.id}, event: ${isNew ? 'insert' : 'update'}, status: ${lead.status}`);
    }

    // Advance the cursor to the most recent updated_at seen
    const latest = leads[leads.length - 1].updated_at;
    // Add 1ms to avoid re-processing the same record on next poll
    lastSeenAt = new Date(new Date(latest).getTime() + 1).toISOString();

  } catch (e) {
    console.error('[poller] Unexpected error:', e.message);
  }
}

// ── Start ───────────────────────────────────────────────────────

function start(bot) {
  initLastSeen();

  // Run every 60 seconds
  cron.schedule(`*/${POLL_INTERVAL_SECONDS} * * * * *`, () => poll(bot));

  console.log(`📡 Lead poller started — checking every ${POLL_INTERVAL_SECONDS}s`);
}

module.exports = { start };
