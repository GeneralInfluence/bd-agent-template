'use strict';

/**
 * Webhook Server — Supabase → bot side-channel (ADVANCED / OPTIONAL)
 *
 * NOTE: The default setup uses poller.js instead of this file.
 * Polling requires zero configuration and works out of the box.
 *
 * Use this file only if you need instant (<1s) notifications and your
 * server has a public IP with port 3001 open. Requires manual Supabase
 * dashboard configuration (see SETUP-SUPABASE-WEBHOOK.md).
 *
 * To switch from polling to webhooks:
 *   In bot.js, replace: poller.start(bot)
 *             with:     webhook.start(bot)
 *
 * Receives Supabase Database Webhooks (POST /webhook/lead-event) and:
 *   1. Fires a structured Ditto contribution-ledger log
 *   2. Notifies the BD steward via Telegram
 *
 * No LLM involved — fully deterministic.
 *
 * Setup in Supabase:
 *   Dashboard → Database → Webhooks → Create webhook
 *   Table: leads
 *   Events: INSERT, UPDATE
 *   URL: http://<your-server>:<WEBHOOK_PORT>/webhook/lead-event
 *   Headers: { "x-webhook-secret": "<WEBHOOK_SECRET>" }
 */

const express = require('express');
const ditto = require('./ditto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3001', 10);

// Status labels for Telegram messages
const STATUS_EMOJI = {
  'warm-intro': '🟡',
  'qualified': '🟢',
  'proposal': '🔵',
  'funded': '💰',
  'closed-won': '✅',
  'closed-lost': '❌',
  'stale': '⚫',
};

// Human-readable status transition messages
function statusMessage(oldStatus, newStatus, lead) {
  const name = lead.client_name || 'Unknown';
  const type = lead.opportunity_type || 'opportunity';
  const emoji = STATUS_EMOJI[newStatus] || '🔄';

  if (!oldStatus) {
    return `🌀 *New Lead Added*\n*${name}* — ${type}\nIntroduced by: ${lead.introducer || 'unknown'}`;
  }

  const transitions = {
    'qualified':   `${emoji} *Lead Qualified*\n*${name}* is now qualified`,
    'proposal':    `${emoji} *Proposal Stage*\n*${name}* — proposal submitted`,
    'funded':      `💰 *FUNDED!*\n*${name}* deal is funded!`,
    'closed-won':  `✅ *Closed Won*\n*${name}* — deal closed!`,
    'closed-lost': `❌ *Closed Lost*\n*${name}*`,
    'stale':       `⚫ *Gone Stale*\n*${name}* — no activity`,
  };

  return transitions[newStatus] || `${emoji} *Status Update*\n*${name}*: ${oldStatus} → ${newStatus}`;
}

/**
 * Build a Ditto contribution-ledger log from a lead record.
 * Uses the required format: Work as subject, contributors listed with roles.
 */
function buildDittoLog(lead, eventType) {
  const opportunityType = {
    'new-raid': 'Raid / Contract',
    'recruiting': 'Recruiting for a Sponsor',
    'new-venture': 'New Venture',
    'cohort-sponsorship': 'Cohort Sponsorship',
    'cohort-recruiting': 'Cohort Attendee Recruiting',
  }[lead.opportunity_type] || lead.opportunity_type || 'Opportunity';

  const contributors = [
    lead.assigned_member,
    lead.introducer,
  ].filter(Boolean).join(', ') || 'unknown';

  const statusLine = `Current status: ${lead.status}.${lead.notes ? ' ' + lead.notes : ''}`;

  const contributorLines = [
    lead.assigned_member ? `- ${lead.assigned_member} is the LEAD (assigned member).` : null,
    lead.introducer ? `- ${lead.introducer} contributed as introducer.` : null,
  ].filter(Boolean).join('\n') || '- Contributors not yet assigned.';

  return (
    `Ditto, here is an update for the memory graph: ${opportunityType} — ${lead.client_name || 'Unknown'}, involving ${contributors}.\n\n` +
    `${statusLine}\n\n` +
    `Contributors and roles:\n${contributorLines}`
  );
}

/**
 * Start the webhook HTTP server.
 * @param {import('grammy').Bot} bot - Grammy bot instance (for sending Telegram messages)
 */
function start(bot) {
  const app = express();
  app.use(express.json());

  // Auth middleware
  app.use('/webhook', (req, res, next) => {
    if (!WEBHOOK_SECRET) return next(); // No secret configured — open (not recommended in prod)
    const incoming = req.headers['x-webhook-secret'];
    if (incoming !== WEBHOOK_SECRET) {
      console.warn('[webhook] Unauthorized request from', req.ip);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // ── Lead event (INSERT or UPDATE on leads table) ─────────────
  app.post('/webhook/lead-event', async (req, res) => {
    res.status(200).json({ ok: true }); // Ack immediately

    try {
      const { type, record, old_record } = req.body;
      if (!record) return;

      const lead = record;
      const oldStatus = old_record?.status || null;
      const newStatus = lead.status;

      console.log(`[webhook] lead-event type=${type} id=${lead.id} status=${oldStatus}→${newStatus}`);

      // Skip if status didn't actually change on UPDATE
      if (type === 'UPDATE' && oldStatus === newStatus) return;

      // 1. Notify BD steward via Telegram
      const BD_STEWARD_ID = process.env.BD_STEWARD_TELEGRAM_ID;
      if (BD_STEWARD_ID && bot) {
        const msg = statusMessage(oldStatus, newStatus, lead);
        const details = [
          lead.description ? `📋 ${lead.description}` : null,
          lead.client_contact ? `📱 ${lead.client_contact}` : null,
          `🆔 \`${lead.id.slice(0, 8)}\``,
        ].filter(Boolean).join('\n');

        await bot.api.sendMessage(
          BD_STEWARD_ID,
          `${msg}\n\n${details}`,
          { parse_mode: 'Markdown' }
        ).catch(e => console.error('[webhook] Telegram notify failed:', e.message));
      }

      // 2. Log to Ditto knowledge graph
      const dittoLog = buildDittoLog(lead, type);
      await ditto.saveMemory(dittoLog, `lead_id: ${lead.id}, event: ${type}, status: ${newStatus}`);

    } catch (e) {
      console.error('[webhook] Error processing lead-event:', e.message);
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.listen(WEBHOOK_PORT, () => {
    console.log(`🔗 Webhook server listening on port ${WEBHOOK_PORT}`);
  });
}

module.exports = { start };
