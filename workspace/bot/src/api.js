'use strict';

/**
 * BD Agent REST API — Cohort Portal Integration
 *
 * Exposes the BD pipeline over HTTP for external integrations,
 * primarily the RaidGuild Cohort Portal website.
 *
 * Auth: Bearer token via BD_API_KEY env var.
 *   - Authorization: Bearer <token>
 *   - OR ?api_key=<token> query param
 *
 * Port: API_PORT env var (default 3000)
 * Bind: 0.0.0.0 (required for Pinata route forwarding)
 *
 * Pinata route config (manifest.json):
 *   { "port": 3000, "path": "/api", "protected": false }
 *   (We handle auth ourselves so the path can be public at Pinata level)
 *
 * Base URL: https://{agentId}.agents.pinata.cloud/api
 */

const express = require('express');
const db = require('./supabase');
const prism = require('./prism');

const API_KEY = process.env.BD_API_KEY;
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);

// ─────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!API_KEY) {
    // No key configured — locked down by default
    return res.status(503).json({ error: 'API not configured (BD_API_KEY not set)' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.api_key;

  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// ─────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────

/**
 * GET /health
 * Public health check — no auth needed.
 */
function healthCheck(req, res) {
  res.json({ ok: true, service: 'bd-agent', ts: new Date().toISOString() });
}

/**
 * GET /leads
 * List pipeline leads.
 *
 * Query params:
 *   status       — filter by status (warm-intro|qualified|proposal|funded|closed-won|closed-lost|stale)
 *   type         — filter by opportunity_type
 *   limit        — max records (default 50, max 200)
 *   offset       — pagination offset (default 0)
 *   order        — field to order by (default: created_at)
 *   dir          — asc|desc (default: desc)
 */
async function listLeads(req, res) {
  try {
    const supabase = db.client();
    const {
      status,
      type,
      limit = 50,
      offset = 0,
      order = 'created_at',
      dir = 'desc',
    } = req.query;

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safeOffset = parseInt(offset, 10) || 0;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order(order, { ascending: dir === 'asc' })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (status) query = query.eq('status', status);
    if (type)   query = query.eq('opportunity_type', type);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ leads: data, total: count, limit: safeLimit, offset: safeOffset });
  } catch (e) {
    console.error('[api] listLeads error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /leads/:id
 * Get a single lead plus its event history.
 */
async function getLead(req, res) {
  try {
    const supabase = db.client();
    const { id } = req.params;

    const [leadResult, eventsResult] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('lead_events').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ]);

    if (leadResult.error) {
      if (leadResult.error.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw leadResult.error;
    }

    res.json({ lead: leadResult.data, events: eventsResult.data || [] });
  } catch (e) {
    console.error('[api] getLead error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /leads
 * Create a new lead from the Cohort Portal.
 *
 * Body (JSON):
 *   client_name       string  required
 *   client_contact    string  optional  (Telegram, email, etc.)
 *   introducer        string  optional  (who's bringing this in)
 *   description       string  optional
 *   opportunity_type  string  optional  (new-raid|cohort-sponsorship|recruiting|new-venture)
 *   source            string  optional  (defaults to "cohort-portal")
 *   metadata          object  optional  (any extra data from the portal)
 */
async function createLead(req, res) {
  try {
    const {
      client_name,
      client_contact,
      introducer,
      description,
      opportunity_type = 'new-raid',
      source = 'cohort-portal',
      metadata,
    } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'client_name is required' });
    }

    const supabase = db.client();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        status: 'warm-intro',
        client_name,
        client_contact: client_contact || null,
        introducer: introducer || null,
        description: description || null,
        opportunity_type,
        source,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log creation event
    await supabase.from('lead_events').insert({
      lead_id: data.id,
      event_type: 'lead_created',
      actor: introducer || 'cohort-portal',
      details: `Lead submitted via Cohort Portal`,
      metadata: { source, opportunity_type },
    });

    res.status(201).json({ lead: data });
  } catch (e) {
    console.error('[api] createLead error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * PATCH /leads/:id
 * Update a lead's mutable fields.
 *
 * Body (JSON) — all optional, only provided fields are updated:
 *   status            string
 *   client_name       string
 *   client_contact    string
 *   introducer        string
 *   assigned_member   string
 *   description       string
 *   notes             string
 *   opportunity_type  string
 *   metadata          object
 */
async function updateLead(req, res) {
  try {
    const { id } = req.params;
    const allowed = [
      'status', 'client_name', 'client_contact', 'introducer',
      'assigned_member', 'description', 'notes', 'opportunity_type', 'metadata',
    ];

    const fields = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    fields.updated_at = new Date().toISOString();

    const supabase = db.client();
    const { data, error } = await supabase
      .from('leads')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw error;
    }

    res.json({ lead: data });
  } catch (e) {
    console.error('[api] updateLead error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * POST /leads/:id/events
 * Log an activity event on a lead.
 *
 * Body (JSON):
 *   event_type  string  required  (e.g. "interest_flagged", "proposal_submitted", "member_assigned")
 *   actor       string  optional  (who triggered it — username, wallet, etc.)
 *   details     string  optional  (human-readable description)
 *   metadata    object  optional  (any structured data)
 */
async function logEvent(req, res) {
  try {
    const { id } = req.params;
    const { event_type, actor, details, metadata } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    const supabase = db.client();

    // Verify lead exists
    const { error: checkErr } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .single();

    if (checkErr) {
      if (checkErr.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw checkErr;
    }

    const { data, error } = await supabase
      .from('lead_events')
      .insert({ lead_id: id, event_type, actor: actor || null, details: details || null, metadata: metadata || null })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ event: data });
  } catch (e) {
    console.error('[api] logEvent error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /pipeline/stats
 * Summary counts for the BD pipeline — useful for dashboard widgets.
 *
 * Returns:
 *   total       total active leads (not closed)
 *   by_status   { [status]: count }
 *   by_type     { [opportunity_type]: count }
 */
async function pipelineStats(req, res) {
  try {
    const supabase = db.client();

    const { data, error } = await supabase
      .from('leads')
      .select('status, opportunity_type');

    if (error) throw error;

    const by_status = {};
    const by_type = {};
    let total = 0;

    for (const row of data || []) {
      // Exclude closed/stale from "active" count
      if (!['closed-won', 'closed-lost', 'stale'].includes(row.status)) total++;
      by_status[row.status] = (by_status[row.status] || 0) + 1;
      by_type[row.opportunity_type] = (by_type[row.opportunity_type] || 0) + 1;
    }

    res.json({ total_active: total, by_status, by_type });
  } catch (e) {
    console.error('[api] pipelineStats error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /raids
 * Active raids and projects from Prism's state layer.
 * Powers the "Contribute" feed in the Cohort Portal.
 *
 * Falls back gracefully if Prism is not configured.
 */
async function getRaids(req, res) {
  if (!prism.isEnabled()) {
    return res.status(503).json({ error: 'Prism not configured (PRISM_API_KEY not set)' });
  }

  try {
    const [state, suggestions] = await Promise.all([
      prism.getProjectState(),
      prism.getProductSuggestions().catch(() => null),
    ]);

    if (!state) return res.status(502).json({ error: 'Prism state unavailable' });

    res.json({
      generated_at: state.generated_at,
      projects: state.domains?.projects || {},
      suggestions: suggestions || null,
    });
  } catch (e) {
    console.error('[api] getRaids error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /meetings
 * Recent Discord voice meeting summaries from Prism.
 * Powers a "what's been discussed" feed in the Cohort Portal.
 *
 * Query params:
 *   limit  number  default 10, max 50
 */
async function getMeetings(req, res) {
  if (!prism.isEnabled()) {
    return res.status(503).json({ error: 'Prism not configured (PRISM_API_KEY not set)' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const data = await prism.getRecentMeetings(limit);
    if (!data) return res.status(502).json({ error: 'Prism unavailable' });
    res.json(data);
  } catch (e) {
    console.error('[api] getMeetings error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

/**
 * GET /knowledge/search
 * Proxy to Prism knowledge search — lets the portal surface
 * relevant RaidGuild docs, SOPs, and capabilities to cohort members.
 *
 * Query params:
 *   q      string  required  search query
 *   kind   string  optional  doc kind filter
 *   tag    string  optional  tag filter
 *   limit  number  optional  default 5, max 20
 */
async function searchKnowledge(req, res) {
  if (!prism.isEnabled()) {
    return res.status(503).json({ error: 'Prism not configured (PRISM_API_KEY not set)' });
  }

  const { q, kind, tag, limit = 5 } = req.query;
  if (!q) return res.status(400).json({ error: 'q (search query) is required' });

  try {
    const results = await prism.searchKnowledge(q, {
      kind,
      tag,
      limit: Math.min(parseInt(limit, 10) || 5, 20),
    });

    if (!results) return res.status(502).json({ error: 'Prism knowledge search unavailable' });

    res.json(results);
  } catch (e) {
    console.error('[api] searchKnowledge error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─────────────────────────────────────────────
// Server bootstrap
// ─────────────────────────────────────────────

function start() {
  const app = express();
  app.use(express.json());

  // CORS — allow the Cohort Portal origin
  const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Public
  app.get('/health', healthCheck);

  // Protected — all routes below require auth
  app.use(requireAuth);

  app.get('/pipeline/stats',    pipelineStats);
  app.get('/leads',             listLeads);
  app.get('/leads/:id',         getLead);
  app.post('/leads',            createLead);
  app.patch('/leads/:id',       updateLead);
  app.post('/leads/:id/events', logEvent);

  // Prism-backed endpoints
  app.get('/raids',             getRaids);
  app.get('/meetings',          getMeetings);
  app.get('/knowledge/search',  searchKnowledge);

  // Catch-all 404
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // Bind to 0.0.0.0 (required for Pinata gateway forwarding)
  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`🌐 BD API server listening on 0.0.0.0:${API_PORT}`);
  });
}

module.exports = { start };
