-- Seed: 002_seed_sample_leads.sql
-- Purpose: Sample leads at each pipeline stage
-- Replace with your organization's real leads, or use these as reference
-- for the shape of data the BD Agent expects.
-- This seed is idempotent — safe to re-run.

-- ============================================================
-- Sample leads — one at each pipeline stage
-- ============================================================

-- Stage 1: Warm Intro — just came in, needs qualification
INSERT INTO leads (
  id, status, client_name, client_contact, introducer, introducer_id,
  assigned_member, description, opportunity_type, source, priority, notes
) VALUES (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'warm-intro',
  'Acme Protocol',
  '@acme_founder',
  'Alice Connector',
  111111111,
  NULL,
  'Building a new DeFi lending protocol on EVM. Needs smart contract dev + frontend.',
  'new-raid',
  'telegram-group',
  'high',
  'Introduced via Alice in the #introductions group. Client seems serious — has funding.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_events (lead_id, event_type, actor, details)
VALUES (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'intro',
  'Alice Connector',
  'Alice introduced Acme Protocol founder in the BD intro group. Asked if we could help with smart contract development and a frontend.'
) ON CONFLICT DO NOTHING;

-- Stage 2: Qualified — screened, confirmed real need
INSERT INTO leads (
  id, status, client_name, client_contact, introducer, introducer_id,
  assigned_member, description, opportunity_type, source, priority, notes
) VALUES (
  'bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb',
  'qualified',
  'BlockCo DAO',
  '@blockco_cto',
  'Bob Networker',
  222222222,
  'member_one_handle',
  'DAO tooling project — needs a governance module + token distribution contract.',
  'new-raid',
  'telegram-group',
  'medium',
  'Screened on 2026-01-15. Budget ~$30k. Timeline flexible. CTO is technical, easy to work with.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_events (lead_id, event_type, actor, details)
VALUES
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'intro', 'Bob Networker',
   'Bob introduced BlockCo DAO in the BD group. Initial interest in governance tooling.'),
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'qualification', 'member_one_handle',
   'Qualification call completed. Real budget confirmed (~$30k). Assigned to Member One for proposal.')
ON CONFLICT DO NOTHING;

-- Stage 3: Proposal — formal proposal submitted
INSERT INTO leads (
  id, status, client_name, client_contact, introducer, introducer_id,
  assigned_member, description, opportunity_type, source, priority, notes
) VALUES (
  'cccccccc-0003-0003-0003-cccccccccccc',
  'proposal',
  'DeepChain Labs',
  '@deepchain_pm',
  'Carol Intro',
  NULL,
  'member_one_handle',
  'Full-stack dApp build — cross-chain bridge UI + indexer. 12-week engagement.',
  'new-raid',
  'referral',
  'high',
  'Proposal submitted 2026-02-01. Client reviewing. ~$80k scope. Follow up due 2026-02-15.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_events (lead_id, event_type, actor, details, metadata)
VALUES
  ('cccccccc-0003-0003-0003-cccccccccccc', 'intro', 'Carol Intro',
   'Referral from Carol — DeepChain needs a cross-chain bridge UI.', NULL),
  ('cccccccc-0003-0003-0003-cccccccccccc', 'qualification', 'member_one_handle',
   'Scoping call done. 12-week engagement, $80k estimate.', NULL),
  ('cccccccc-0003-0003-0003-cccccccccccc', 'proposal_submitted', 'member_one_handle',
   'Formal proposal submitted to DeepChain PM.',
   '{"proposal_url": "https://docs.google.com/document/d/example", "amount_usd": 80000}')
ON CONFLICT DO NOTHING;

-- Stage 4: Funded — deal closed, raid underway
INSERT INTO leads (
  id, status, client_name, client_contact, introducer, introducer_id,
  assigned_member, description, opportunity_type, source, priority, notes
) VALUES (
  'dddddddd-0004-0004-0004-dddddddddddd',
  'funded',
  'MetaVault Finance',
  '@metavault_ceo',
  'Dave Closer',
  NULL,
  'member_one_handle',
  'Smart contract audit + security review. Completed Q4 2025.',
  'new-raid',
  'referral',
  'high',
  'Funded 2025-11-01. $45k. Paid in USDC. Raid completed successfully.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_events (lead_id, event_type, actor, details, metadata)
VALUES
  ('dddddddd-0004-0004-0004-dddddddddddd', 'intro', 'Dave Closer',
   'Referral — MetaVault needs a security audit before mainnet launch.', NULL),
  ('dddddddd-0004-0004-0004-dddddddddddd', 'proposal_submitted', 'member_one_handle',
   'Audit proposal submitted. Scope: 3 contracts, ~600 LOC.', NULL),
  ('dddddddd-0004-0004-0004-dddddddddddd', 'payment_confirmed', 'Treasurer',
   'Payment received — 45,000 USDC on-chain.',
   '{"tx_hash": "0xexample000000000000000000000000000000000000000000000000000000000001", "amount_usd": 45000, "currency": "USDC"}')
ON CONFLICT DO NOTHING;

-- Stage 5: Stale — went quiet, no response
INSERT INTO leads (
  id, status, client_name, client_contact, introducer, introducer_id,
  assigned_member, description, opportunity_type, source, priority, notes
) VALUES (
  'eeeeeeee-0005-0005-0005-eeeeeeeeeeee',
  'stale',
  'Phantom NFT Studio',
  '@phantom_founder',
  'Eve Intro',
  NULL,
  NULL,
  'NFT minting platform — asked for a quote in October, went quiet.',
  'new-raid',
  'telegram-group',
  'low',
  'Last contact 2025-10-12. No response to 2 follow-ups. Marking stale.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_events (lead_id, event_type, actor, details)
VALUES
  ('eeeeeeee-0005-0005-0005-eeeeeeeeeeee', 'intro', 'Eve Intro',
   'Phantom founder joined intro group, expressed interest in NFT platform.'),
  ('eeeeeeee-0005-0005-0005-eeeeeeeeeeee', 'follow_up', 'member_one_handle',
   'Followed up twice — no response. Marking as stale after 3 weeks.'),
  ('eeeeeeee-0005-0005-0005-eeeeeeeeeeee', 'status_change', 'BD Agent',
   'Status changed to stale after 21 days with no response.')
ON CONFLICT DO NOTHING;
