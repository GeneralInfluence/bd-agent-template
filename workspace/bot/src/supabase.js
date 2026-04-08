'use strict';

const { createClient } = require('@supabase/supabase-js');

let supabase;

function init() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  supabase = createClient(url, key);
  return supabase;
}

function client() {
  if (!supabase) throw new Error('Supabase not initialized');
  return supabase;
}

// Upsert a user we've seen — cheap, no LLM
async function upsertUser({ telegram_id, username, first_name, last_name, group_id }) {
  const db = client();

  // Get existing record to merge seen_in_groups
  const { data: existing } = await db
    .from('telegram_users')
    .select('seen_in_groups')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  const groups = existing?.seen_in_groups || [];
  if (group_id && !groups.includes(group_id)) groups.push(group_id);

  await db.from('telegram_users').upsert({
    telegram_id,
    username: username || null,
    first_name: first_name || null,
    last_name: last_name || null,
    last_seen_at: new Date().toISOString(),
    seen_in_groups: groups,
  }, { onConflict: 'telegram_id' });
}

// Create a confirmed lead
async function createLead({ client_name, client_contact, introducer, introducer_id, description, opportunity_type, source_group_id }) {
  const db = client();
  const { data, error } = await db.from('leads').insert({
    status: 'qualified',
    client_name,
    client_contact,
    introducer,
    introducer_id,
    description,
    opportunity_type: opportunity_type || 'new-raid',
    source: 'telegram-group',
    source_group_id,
  }).select().single();
  if (error) throw error;
  return data;
}

// Log an event on a lead
async function logEvent({ lead_id, event_type, actor, details, metadata }) {
  const db = client();
  await db.from('lead_events').insert({ lead_id, event_type, actor, details, metadata });
}

// Log a conversation message (only for confirmed leads)
async function logMessage({ message_id, text, user_id, group_id, lead_id, user_name, user_first_name, user_last_name }) {
  const db = client();
  await db.from('conversations').upsert({
    message_id, text, user_id, group_id, lead_id,
    timestamp: new Date().toISOString(),
    user_name, user_first_name, user_last_name,
  }, { onConflict: 'message_id' });
}

// Check if user has opted out
async function isOptedOut(user_id) {
  const db = client();
  const { data } = await db.from('opt_out_users').select('id').eq('user_id', user_id).single();
  return !!data;
}

module.exports = { init, upsertUser, createLead, logEvent, logMessage, isOptedOut };
