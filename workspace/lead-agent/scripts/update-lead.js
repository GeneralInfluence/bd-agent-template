#!/usr/bin/env node
'use strict';

/**
 * update-lead.js — Manual BD steward intel update CLI
 *
 * Usage:
 *   node update-lead.js <lead-id> [options]
 *
 * Options:
 *   --status <status>       Update lead status
 *   --notes <text>          Update notes field
 *   --description <text>    Update description
 *   --assigned <name>       Update assigned_member
 *   --contact <text>        Update client_contact
 *   --priority <high|med|low>
 *   --event <text>          Log a lead event (type=note)
 *   --actor <name>          Actor for the event (default: BD Steward)
 *   --ditto <text>          Save a Ditto knowledge graph update
 *   --ditto-context <text>  Source context for Ditto
 *
 * Environment: SUPABASE_URL, SUPABASE_ANON_KEY, DITTO_API_KEY (optional)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env.raidguild') });

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (!args.length || args[0] === '--help') {
  console.log('Usage: node update-lead.js <lead-id> [--status x] [--notes x] [--event x] [--actor x] [--ditto x]');
  process.exit(0);
}

const leadId = args[0];
const opts = {};
for (let i = 1; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  opts[key] = args[i + 1];
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Build lead patch
  const patch = {};
  if (opts.status) patch.status = opts.status;
  if (opts.notes) patch.notes = opts.notes;
  if (opts.description) patch.description = opts.description;
  if (opts.assigned) patch.assigned_member = opts.assigned;
  if (opts.contact) patch.client_contact = opts.contact;
  if (opts.priority) patch.priority = opts.priority;

  if (Object.keys(patch).length) {
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('leads').update(patch).eq('id', leadId).select().single();
    if (error) { console.error('Supabase update error:', error.message); process.exit(1); }
    console.log('Lead updated:', data.client_name, '→', data.status);
  }

  // Log event
  if (opts.event) {
    const { error } = await supabase.from('lead_events').insert({
      lead_id: leadId,
      event_type: 'note',
      actor: opts.actor || 'BD Steward',
      details: opts.event,
      metadata: { source: 'manual_cli', date: new Date().toISOString().split('T')[0] },
    });
    if (error) console.error('Event log error:', error.message);
    else console.log('Event logged.');
  }

  // Ditto update
  if (opts.ditto && process.env.DITTO_API_KEY) {
    try {
      const configPath = path.resolve(__dirname, '../../config/mcporter.json');
      const escaped = opts.ditto.replace(/'/g, "'\\''");
      const ctx = (opts['ditto-context'] || `lead_id: ${leadId}`).replace(/'/g, "'\\''");
      execSync(
        `npx mcporter --config '${configPath}' call ditto.save_memory content='${escaped}' source='bd-steward-cli' sourceContext='${ctx}'`,
        { timeout: 30000, stdio: 'inherit' }
      );
      console.log('Ditto updated.');
    } catch (e) {
      console.error('Ditto error:', e.message);
    }
  }

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
