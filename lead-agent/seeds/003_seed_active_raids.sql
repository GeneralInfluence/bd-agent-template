-- Seed: 003_seed_active_raids.sql
-- Purpose: Sample active engagements (Raids)
-- Replace with your organization's real active work.
-- An active_raid is a confirmed, funded engagement where your org is already delivering.
-- Distinct from leads (pipeline) — this is work in progress.
-- This seed is idempotent — safe to re-run.

-- ============================================================
-- Sample active raid — an ongoing engagement
-- ============================================================

INSERT INTO active_raids (
  id,
  name, full_name, raid_type, status,
  client_org, website,
  assigned_members,
  revenue_to_date, revenue_currency,
  upsell_description, upsell_value, upsell_currency,
  key_contacts,
  description, notes
) VALUES (
  'raid0001-0000-0000-0000-000000000001',
  'ExampleRaid',
  'ExampleRaid — Full-stack dApp for Acme Protocol',
  'development',
  'active',
  'Acme Protocol',
  'https://acme.example',
  ARRAY['member_one_handle', 'member_two_handle'],
  40000.00, 'USD',
  'Phase 2 — additional frontend modules + subgraph indexer. Estimated $25k.',
  25000.00, 'USD',
  '[
    {"name": "Acme CTO", "handle": "@acme_cto", "email": "cto@acme.example", "role": "Technical lead / main contact"},
    {"name": "Acme PM", "handle": "@acme_pm", "email": "pm@acme.example", "role": "Project manager"}
  ]'::jsonb,
  'Building a full-stack DeFi dApp for Acme Protocol. Smart contracts deployed on testnet. Frontend in progress.',
  'Phase 1 funded: $40k USDC. Phase 2 proposal pending. Weekly syncs on Fridays.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO raid_events (raid_id, event_type, actor, details, metadata)
VALUES
  ('raid0001-0000-0000-0000-000000000001', 'milestone', 'member_one_handle',
   'Smart contracts deployed to testnet. All core functions passing tests.',
   '{"milestone": "testnet-deploy", "date": "2026-01-20"}'),

  ('raid0001-0000-0000-0000-000000000001', 'payment', 'Treasurer',
   'Phase 1 payment received — 40,000 USDC.',
   '{"tx_hash": "0xexample000000000000000000000000000000000000000000000000000000000002", "amount_usd": 40000, "currency": "USDC"}'),

  ('raid0001-0000-0000-0000-000000000001', 'upsell', 'member_one_handle',
   'Phase 2 opportunity identified — client wants additional frontend modules and a subgraph indexer.',
   '{"estimated_value_usd": 25000, "status": "proposal_pending"}')

ON CONFLICT DO NOTHING;

-- ============================================================
-- Notes for deployers
-- ============================================================
-- active_raids tracks your org's CURRENT work, not pipeline opportunities.
-- Key fields:
--   status: active | paused | upsell | completed | archived
--   raid_type: audit | development | management | consulting | other
--   assigned_members: array of handles/names of your org's members on this raid
--   upsell_*: the next revenue opportunity within this engagement
--   key_contacts: JSONB array of client-side contacts [{name, handle, email, role}]
--
-- Link a lead to an active raid when an upsell originates from an existing engagement:
--   UPDATE leads SET raid_id = 'raid0001-...' WHERE id = '...';
