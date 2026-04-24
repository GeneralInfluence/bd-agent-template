#!/usr/bin/env node
/**
 * export-seeds.js
 *
 * Dumps current Supabase state (leads, lead_events, active_raids, raid_events,
 * telegram_users) back to seed SQL files so the branch stays recoverable.
 *
 * Usage:
 *   node seeds/export-seeds.js
 *
 * Requires: SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE_KEY) in env.
 * Load from .env: `dotenv -e ../.env -- node seeds/export-seeds.js`
 *
 * Output files (overwritten):
 *   seeds/001_seed_org_config.sql
 *   seeds/002_seed_sample_leads.sql
 *   seeds/003_seed_active_raids.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEEDS_DIR = path.resolve(__dirname);
const NOW = new Date().toISOString();

// ── helpers ────────────────────────────────────────────────────────────────────

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')}]`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function header(filename, description) {
  return `-- Seed: ${filename}\n-- Exported: ${NOW}\n-- ${description}\n-- This seed is idempotent — safe to re-run.\n\n`;
}

// ── exporters ──────────────────────────────────────────────────────────────────

async function exportOrgConfig() {
  const { data: users, error } = await supabase
    .from('telegram_users')
    .select('*')
    .order('is_steward', { ascending: false });

  if (error) throw new Error(`telegram_users: ${error.message}`);

  let sql = header('001_seed_org_config.sql', 'Org identity and BD Steward configuration');
  sql += '-- ── telegram_users ────────────────────────────────────────────────────────────\n';
  sql += 'INSERT INTO telegram_users (telegram_id, username, display_name, is_steward, is_member, notes)\nVALUES\n';

  if (!users || users.length === 0) {
    sql += '  -- No users found. Add your BD Steward and members here.\n';
    sql += "  -- (111111111, 'your_handle', 'Your Name', true, true, 'BD Steward')\n";
  } else {
    const rows = users.map(u =>
      `  (${sqlStr(u.telegram_id)}, ${sqlStr(u.username)}, ${sqlStr(u.display_name)}, ` +
      `${sqlStr(u.is_steward)}, ${sqlStr(u.is_member)}, ${sqlStr(u.notes)})`
    );
    sql += rows.join(',\n') + '\n';
  }

  sql += 'ON CONFLICT (telegram_id) DO NOTHING;\n';

  fs.writeFileSync(path.join(SEEDS_DIR, '001_seed_org_config.sql'), sql);
  console.log(`✓ 001_seed_org_config.sql (${users?.length ?? 0} users)`);
}

async function exportLeads() {
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .order('created_at');

  if (leadsErr) throw new Error(`leads: ${leadsErr.message}`);

  const { data: events, error: eventsErr } = await supabase
    .from('lead_events')
    .select('*')
    .order('created_at');

  if (eventsErr) throw new Error(`lead_events: ${eventsErr.message}`);

  let sql = header('002_seed_sample_leads.sql', 'Current leads pipeline + event history');

  // leads
  sql += '-- ── leads ─────────────────────────────────────────────────────────────────────\n';
  if (!leads || leads.length === 0) {
    sql += '-- No leads found.\n\n';
  } else {
    for (const l of leads) {
      sql += 'INSERT INTO leads (\n';
      sql += '  id, status, client_name, client_contact, introducer, introducer_id,\n';
      sql += '  assigned_member, description, opportunity_type, source, source_group_id,\n';
      sql += '  priority, notes, raid_id\n';
      sql += ') VALUES (\n';
      sql += `  ${sqlStr(l.id)}, ${sqlStr(l.status)}, ${sqlStr(l.client_name)}, ${sqlStr(l.client_contact)},\n`;
      sql += `  ${sqlStr(l.introducer)}, ${sqlStr(l.introducer_id)},\n`;
      sql += `  ${sqlStr(l.assigned_member)}, ${sqlStr(l.description)}, ${sqlStr(l.opportunity_type)},\n`;
      sql += `  ${sqlStr(l.source)}, ${sqlStr(l.source_group_id)},\n`;
      sql += `  ${sqlStr(l.priority)}, ${sqlStr(l.notes)}, ${sqlStr(l.raid_id)}\n`;
      sql += ') ON CONFLICT (id) DO NOTHING;\n\n';
    }
  }

  // lead_events
  sql += '-- ── lead_events ───────────────────────────────────────────────────────────────\n';
  if (!events || events.length === 0) {
    sql += '-- No lead events found.\n\n';
  } else {
    for (const e of events) {
      sql += 'INSERT INTO lead_events (id, lead_id, event_type, actor, actor_id, details, metadata)\n';
      sql += 'VALUES (\n';
      sql += `  ${sqlStr(e.id)}, ${sqlStr(e.lead_id)}, ${sqlStr(e.event_type)},\n`;
      sql += `  ${sqlStr(e.actor)}, ${sqlStr(e.actor_id)}, ${sqlStr(e.details)}, ${sqlStr(e.metadata)}\n`;
      sql += ') ON CONFLICT (id) DO NOTHING;\n\n';
    }
  }

  fs.writeFileSync(path.join(SEEDS_DIR, '002_seed_sample_leads.sql'), sql);
  console.log(`✓ 002_seed_sample_leads.sql (${leads?.length ?? 0} leads, ${events?.length ?? 0} events)`);
}

async function exportActiveRaids() {
  const { data: raids, error: raidsErr } = await supabase
    .from('active_raids')
    .select('*')
    .order('created_at');

  if (raidsErr) throw new Error(`active_raids: ${raidsErr.message}`);

  const { data: events, error: eventsErr } = await supabase
    .from('raid_events')
    .select('*')
    .order('created_at');

  if (eventsErr) throw new Error(`raid_events: ${eventsErr.message}`);

  let sql = header('003_seed_active_raids.sql', 'Current active engagements + event history');

  // active_raids
  sql += '-- ── active_raids ──────────────────────────────────────────────────────────────\n';
  if (!raids || raids.length === 0) {
    sql += '-- No active raids found.\n\n';
  } else {
    for (const r of raids) {
      sql += 'INSERT INTO active_raids (\n';
      sql += '  id, name, full_name, raid_type, status,\n';
      sql += '  client_org, website, app_url, github,\n';
      sql += '  assigned_members, rg_governance_pct, safe_address,\n';
      sql += '  revenue_to_date, revenue_currency,\n';
      sql += '  upsell_description, upsell_value, upsell_currency,\n';
      sql += '  key_contacts, governance_token, token_allocation,\n';
      sql += '  description, notes\n';
      sql += ') VALUES (\n';
      sql += `  ${sqlStr(r.id)}, ${sqlStr(r.name)}, ${sqlStr(r.full_name)}, ${sqlStr(r.raid_type)}, ${sqlStr(r.status)},\n`;
      sql += `  ${sqlStr(r.client_org)}, ${sqlStr(r.website)}, ${sqlStr(r.app_url)}, ${sqlStr(r.github)},\n`;
      sql += `  ${sqlStr(r.assigned_members)}, ${sqlStr(r.rg_governance_pct)}, ${sqlStr(r.safe_address)},\n`;
      sql += `  ${sqlStr(r.revenue_to_date)}, ${sqlStr(r.revenue_currency)},\n`;
      sql += `  ${sqlStr(r.upsell_description)}, ${sqlStr(r.upsell_value)}, ${sqlStr(r.upsell_currency)},\n`;
      sql += `  ${sqlStr(r.key_contacts)}, ${sqlStr(r.governance_token)}, ${sqlStr(r.token_allocation)},\n`;
      sql += `  ${sqlStr(r.description)}, ${sqlStr(r.notes)}\n`;
      sql += ') ON CONFLICT (id) DO NOTHING;\n\n';
    }
  }

  // raid_events
  sql += '-- ── raid_events ───────────────────────────────────────────────────────────────\n';
  if (!events || events.length === 0) {
    sql += '-- No raid events found.\n\n';
  } else {
    for (const e of events) {
      sql += 'INSERT INTO raid_events (id, raid_id, event_type, actor, actor_id, details, metadata)\n';
      sql += 'VALUES (\n';
      sql += `  ${sqlStr(e.id)}, ${sqlStr(e.raid_id)}, ${sqlStr(e.event_type)},\n`;
      sql += `  ${sqlStr(e.actor)}, ${sqlStr(e.actor_id)}, ${sqlStr(e.details)}, ${sqlStr(e.metadata)}\n`;
      sql += ') ON CONFLICT (id) DO NOTHING;\n\n';
    }
  }

  fs.writeFileSync(path.join(SEEDS_DIR, '003_seed_active_raids.sql'), sql);
  console.log(`✓ 003_seed_active_raids.sql (${raids?.length ?? 0} raids, ${events?.length ?? 0} events)`);
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Exporting Supabase state to seed files...\n');
  try {
    await exportOrgConfig();
    await exportLeads();
    await exportActiveRaids();
    console.log('\nDone. Commit the updated seed files to your branch.');
  } catch (err) {
    console.error('Export failed:', err.message);
    process.exit(1);
  }
}

main();
