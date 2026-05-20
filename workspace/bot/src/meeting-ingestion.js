'use strict';

/**
 * Meeting Ingestion Pipeline
 *
 * Watches Prism for new Discord voice meeting summaries and automatically
 * extracts BD-relevant data: new opportunities, status updates, contributions,
 * new people, and action items.
 *
 * Runs on a schedule (default: every 60 minutes).
 * Tracks processed artifact IDs in a local state file to avoid double-processing.
 *
 * Extraction → Supabase (leads/events) + Ditto (contribution ledger) + Steward notification
 */

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('./supabase');
const ditto = require('./ditto');
const prism = require('./prism');
const steward = require('./steward');

// State file — tracks which artifact IDs have been processed
const STATE_FILE = path.join(__dirname, '../.meeting-ingestion-state.json');

// How far back to look on first run (days)
const INITIAL_LOOKBACK_DAYS = 7;

// Check interval in milliseconds (default 60 minutes)
const CHECK_INTERVAL_MS = parseInt(process.env.MEETING_INGESTION_INTERVAL_MS || '3600000', 10);

let anthropic;
let botInstance;

function initAnthropik() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// ─────────────────────────────────────────────
// State management
// ─────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[ingestion] Could not load state file:', e.message);
  }
  return { processedIds: [], lastRunAt: null };
}

function saveState(state) {
  try {
    // Keep only last 500 processed IDs to prevent unbounded growth
    if (state.processedIds.length > 500) {
      state.processedIds = state.processedIds.slice(-500);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[ingestion] Could not save state file:', e.message);
  }
}

// ─────────────────────────────────────────────
// LLM extraction
// ─────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a BD pipeline analyst for RaidGuild, a Web3 design and development guild.

Your job is to read meeting summaries and extract structured BD-relevant information.

RaidGuild's BD pipeline stages:
  warm-intro → qualified → proposal → funded → closed-won / closed-lost / stale

Opportunity types:
  new-raid           = client wants RaidGuild to build something for them
  cohort-sponsorship = company wants to sponsor the RaidGuild cohort program
  recruiting         = someone wants to hire RaidGuild members
  new-venture        = cohort participant spinning out a new product/company

Member roles:
  Members are verified RaidGuild members who can be assigned to raids.
  Cohort participants are applicants/learners — not yet full members.
  Introducers bring in potential clients.

Extract ONLY what is clearly stated. Do not infer or hallucinate.
If confidence is low, say so. Omit rather than guess.

Respond ONLY with valid JSON matching this schema:
{
  "new_opportunities": [
    {
      "client_name": "string — company or person name",
      "description": "string — what they need",
      "opportunity_type": "new-raid|cohort-sponsorship|recruiting|new-venture",
      "introducer": "string or null — who brought them in",
      "client_contact": "string or null — how to reach them",
      "confidence": "high|medium|low",
      "source_quote": "string — the exact text that led to this extraction"
    }
  ],
  "status_updates": [
    {
      "client_name_hint": "string — best guess at which lead this refers to",
      "new_status": "warm-intro|qualified|proposal|funded|closed-won|closed-lost|stale",
      "notes": "string — what changed and why",
      "confidence": "high|medium|low",
      "source_quote": "string"
    }
  ],
  "contributions": [
    {
      "contributor": "string — person's name or Discord handle",
      "opportunity_hint": "string — which opportunity they contributed to",
      "role": "string — what they did (introduced, proposed, developed, financed, etc.)",
      "description": "string — details for Ditto ledger",
      "source_quote": "string"
    }
  ],
  "new_people": [
    {
      "name": "string",
      "context": "string — how they came up",
      "potential_role": "client|member|cohort-participant|introducer|sponsor",
      "confidence": "high|medium|low"
    }
  ],
  "bd_action_items": [
    {
      "owner": "string or null",
      "text": "string — the action item",
      "deadline_hint": "string or null"
    }
  ],
  "summary": "string — 1-2 sentence BD-focused summary of this meeting"
}`;

async function extractFromMeeting(meetingContent, meetingMeta) {
  const client = initAnthropik();

  const userMessage = `Meeting: "${meetingMeta.title || 'Untitled'}"
Date: ${meetingMeta.date}
Participants: ${meetingMeta.participants?.join(', ') || 'unknown'}
Channel: ${meetingMeta.channel || 'unknown'}

--- FULL MEETING SUMMARY ---
${meetingContent}
--- END ---

Extract all BD-relevant information from this meeting.`;

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0]?.text || '{}';

    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[ingestion] LLM extraction failed:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Action handlers
// ─────────────────────────────────────────────

async function handleNewOpportunity(opp, meetingMeta) {
  if (opp.confidence === 'low') {
    console.log(`[ingestion] Skipping low-confidence opportunity: ${opp.client_name}`);
    return null;
  }

  try {
    const supabase = db.client();

    // Check for existing lead with similar client name (rough dedup)
    const { data: existing } = await supabase
      .from('leads')
      .select('id, client_name, status')
      .ilike('client_name', `%${opp.client_name.split(' ')[0]}%`)
      .limit(3);

    if (existing?.length) {
      console.log(`[ingestion] Possible duplicate for "${opp.client_name}" — logging as event, not creating new lead`);
      // Log as event on the closest match rather than creating a duplicate
      const lead = existing[0];
      await db.logEvent({
        lead_id: lead.id,
        event_type: 'meeting_mention',
        actor: 'meeting-ingestion',
        details: `Mentioned in meeting: ${meetingMeta.title}`,
        metadata: { meeting_id: meetingMeta.id, source_quote: opp.source_quote, confidence: opp.confidence },
      });
      return { action: 'event_logged', lead_id: lead.id };
    }

    // Create new lead
    const lead = await db.createLead({
      client_name: opp.client_name,
      client_contact: opp.client_contact || null,
      introducer: opp.introducer || null,
      description: opp.description,
      opportunity_type: opp.opportunity_type || 'new-raid',
      source: 'meeting-ingestion',
      source_group_id: meetingMeta.channel || null,
    });

    await db.logEvent({
      lead_id: lead.id,
      event_type: 'lead_created_from_meeting',
      actor: 'meeting-ingestion',
      details: `Extracted from meeting: ${meetingMeta.title} (${meetingMeta.date})`,
      metadata: { meeting_id: meetingMeta.id, source_quote: opp.source_quote, confidence: opp.confidence },
    });

    console.log(`[ingestion] Created lead: ${opp.client_name} (${lead.id})`);
    return { action: 'lead_created', lead };
  } catch (e) {
    console.error(`[ingestion] Failed to create lead for ${opp.client_name}:`, e.message);
    return null;
  }
}

async function handleStatusUpdate(update, meetingMeta) {
  if (update.confidence === 'low') return null;

  try {
    const supabase = db.client();

    // Find matching lead
    const { data: leads } = await supabase
      .from('leads')
      .select('id, client_name, status')
      .ilike('client_name', `%${update.client_name_hint.split(' ')[0]}%`)
      .not('status', 'in', '("closed-won","closed-lost")')
      .limit(3);

    if (!leads?.length) {
      console.log(`[ingestion] No lead found for status update: "${update.client_name_hint}"`);
      return null;
    }

    const lead = leads[0];
    if (lead.status === update.new_status) {
      console.log(`[ingestion] Status already ${update.new_status} for ${lead.client_name} — skipping`);
      return null;
    }

    await db.updateLead(lead.id, {
      status: update.new_status,
      notes: update.notes,
    });

    await db.logEvent({
      lead_id: lead.id,
      event_type: 'status_updated_from_meeting',
      actor: 'meeting-ingestion',
      details: `${lead.status} → ${update.new_status}: ${update.notes}`,
      metadata: { meeting_id: meetingMeta.id, source_quote: update.source_quote, confidence: update.confidence },
    });

    console.log(`[ingestion] Updated ${lead.client_name}: ${lead.status} → ${update.new_status}`);
    return { action: 'status_updated', lead_id: lead.id, old_status: lead.status, new_status: update.new_status };
  } catch (e) {
    console.error('[ingestion] Status update failed:', e.message);
    return null;
  }
}

async function handleContribution(contribution, meetingMeta) {
  if (!contribution.contributor || !contribution.opportunity_hint) return;

  try {
    const dittoLog =
      `Ditto, here is an update for the memory graph: ${contribution.opportunity_hint}, ` +
      `involving ${contribution.contributor}.\n\n` +
      `Current status: Active. Recorded from meeting: ${meetingMeta.title} (${meetingMeta.date}).\n\n` +
      `Contributors and roles:\n` +
      `- ${contribution.contributor} contributed as ${contribution.role}.\n\n` +
      `Note: ${contribution.description}\n\n` +
      `Source: ${meetingMeta.id}`;

    await ditto.saveMemory(dittoLog, `meeting: ${meetingMeta.id}, contributor: ${contribution.contributor}`);
    console.log(`[ingestion] Logged Ditto contribution: ${contribution.contributor} → ${contribution.opportunity_hint}`);
  } catch (e) {
    console.error('[ingestion] Ditto contribution failed:', e.message);
  }
}

async function notifyStewardOfFindings(bot, findings, meetingMeta) {
  if (!bot || !steward.isStewardConfigured()) return;

  const lines = [`🌀 *Meeting Processed: ${meetingMeta.title}*\n_${meetingMeta.date}_\n`];

  const created = findings.filter(f => f?.action === 'lead_created');
  const updated = findings.filter(f => f?.action === 'status_updated');

  if (created.length) {
    lines.push(`✨ *${created.length} new lead(s) created*`);
    created.forEach(f => lines.push(`  • ${f.lead?.client_name}`));
  }

  if (updated.length) {
    lines.push(`🔄 *${updated.length} status update(s)*`);
    updated.forEach(f => lines.push(`  • ${f.old_status} → ${f.new_status}`));
  }

  if (!created.length && !updated.length) return; // Nothing worth pinging about

  if (findings.bdSummary) {
    lines.push(`\n📋 ${findings.bdSummary}`);
  }

  try {
    await steward.notify(bot, lines.join('\n'));
  } catch (e) {
    console.error('[ingestion] Steward notify failed:', e.message);
  }
}

// ─────────────────────────────────────────────
// Main ingestion loop
// ─────────────────────────────────────────────

async function processArtifact(artifact, state) {
  if (state.processedIds.includes(artifact.id)) return null;

  // Fetch full artifact content
  const full = await prism.getArtifact(artifact.id);
  if (!full) {
    console.warn(`[ingestion] Could not fetch artifact ${artifact.id}`);
    return null;
  }

  const content = full.content || full.payload?.content || full.preview || '';
  if (!content) {
    console.warn(`[ingestion] Empty content for artifact ${artifact.id}`);
    state.processedIds.push(artifact.id);
    return null;
  }

  const meetingMeta = {
    id: artifact.id,
    title: content.split('\n')[0].replace(/^#\s*/, '').trim(),
    date: artifact.created_at?.slice(0, 10),
    participants: artifact.participants,
    channel: artifact.url || null,
  };

  console.log(`[ingestion] Processing: ${meetingMeta.title} (${meetingMeta.date})`);

  // LLM extraction
  const extracted = await extractFromMeeting(content, meetingMeta);
  if (!extracted) {
    state.processedIds.push(artifact.id);
    return null;
  }

  const findings = [];

  // Handle new opportunities
  for (const opp of extracted.new_opportunities || []) {
    const result = await handleNewOpportunity(opp, meetingMeta);
    if (result) findings.push(result);
  }

  // Handle status updates
  for (const update of extracted.status_updates || []) {
    const result = await handleStatusUpdate(update, meetingMeta);
    if (result) findings.push(result);
  }

  // Handle contributions → Ditto
  for (const contrib of extracted.contributions || []) {
    await handleContribution(contrib, meetingMeta);
  }

  // Log BD action items as a single event if any
  if (extracted.bd_action_items?.length) {
    const actionText = extracted.bd_action_items
      .map(a => `• ${a.owner ? `[${a.owner}] ` : ''}${a.text}${a.deadline_hint ? ` (by ${a.deadline_hint})` : ''}`)
      .join('\n');
    console.log(`[ingestion] BD action items from ${meetingMeta.title}:\n${actionText}`);

    // Log to each affected lead, or as a general note
    for (const result of findings.filter(f => f?.lead_id)) {
      await db.logEvent({
        lead_id: result.lead_id,
        event_type: 'meeting_action_items',
        actor: 'meeting-ingestion',
        details: actionText,
        metadata: { meeting_id: meetingMeta.id },
      }).catch(() => {});
    }
  }

  findings.bdSummary = extracted.summary;

  // Notify steward
  if (botInstance) {
    await notifyStewardOfFindings(botInstance, findings, meetingMeta);
  }

  state.processedIds.push(artifact.id);
  return findings;
}

async function runIngestion() {
  if (!prism.isEnabled()) {
    console.log('[ingestion] Prism not configured — skipping');
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[ingestion] No ANTHROPIC_API_KEY — skipping LLM extraction');
    return;
  }

  console.log('[ingestion] Running meeting ingestion...');

  const state = loadState();

  // On first run, look back INITIAL_LOOKBACK_DAYS; after that, fetch enough to catch up
  const limit = state.lastRunAt ? 20 : 50;
  const data = await prism.getRecentMeetings(limit);

  if (!data?.artifacts?.length) {
    console.log('[ingestion] No meeting summaries found');
    state.lastRunAt = new Date().toISOString();
    saveState(state);
    return;
  }

  // Filter to unprocessed artifacts
  const unprocessed = data.artifacts.filter(a => !state.processedIds.includes(a.id));
  console.log(`[ingestion] ${unprocessed.length} new meetings to process (${data.artifacts.length} total fetched)`);

  for (const artifact of unprocessed) {
    try {
      await processArtifact(artifact, state);
    } catch (e) {
      console.error(`[ingestion] Error processing ${artifact.id}:`, e.message);
      // Still mark as processed to avoid infinite retry on bad data
      state.processedIds.push(artifact.id);
    }
    // Small delay between LLM calls
    await new Promise(r => setTimeout(r, 1000));
  }

  state.lastRunAt = new Date().toISOString();
  saveState(state);
  console.log(`[ingestion] Done. Processed ${unprocessed.length} meetings.`);
}

// ─────────────────────────────────────────────
// Start / Stop
// ─────────────────────────────────────────────

let intervalHandle;

function start(bot) {
  botInstance = bot;
  console.log(`🔄 Meeting ingestion started (every ${CHECK_INTERVAL_MS / 60000} min)`);

  // Run immediately on start, then on interval
  runIngestion().catch(e => console.error('[ingestion] Initial run failed:', e.message));
  intervalHandle = setInterval(
    () => runIngestion().catch(e => console.error('[ingestion] Scheduled run failed:', e.message)),
    CHECK_INTERVAL_MS
  );
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
}

module.exports = { start, stop, runIngestion };
