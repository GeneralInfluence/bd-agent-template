-- Migration: 006_migrate_evro_to_active_raids.sql
-- Purpose: Link the existing EVRO leads record to its active_raids entry,
--          migrate lead_events to raid_events, and clean up the leads record.
-- Created: 2026-04-17
-- Depends on: 005_create_active_raids.sql (active_raids + raid_events tables must exist)
-- Run in: Supabase SQL Editor

-- ============================================================
-- Step 1: Link the existing EVRO leads record to the active_raids entry
-- (active_raids.EVRO was seeded in migration 005)
-- ============================================================
UPDATE leads
SET
  raid_id    = (SELECT id FROM active_raids WHERE name = 'EVRO' LIMIT 1),
  status     = 'funded',
  notes      = notes || E'\n\n[2026-04-17] Record linked to active_raids. '
               'This lead entry is kept for historical reference and audit trail. '
               'All ongoing tracking moves to the active_raids + raid_events tables.',
  updated_at = NOW()
WHERE id = '1ffb614e-7e2f-4066-997c-da0f4cb337b7';

-- ============================================================
-- Step 2: Copy existing lead_events for EVRO → raid_events
-- Maps event_type values to raid_events check constraint values.
-- ============================================================
INSERT INTO raid_events (raid_id, event_type, actor, actor_id, details, metadata, created_at)
SELECT
  (SELECT id FROM active_raids WHERE name = 'EVRO' LIMIT 1) AS raid_id,
  CASE le.event_type
    WHEN 'intro'                THEN 'note'
    WHEN 'qualification'        THEN 'milestone'
    WHEN 'proposal_submitted'   THEN 'milestone'
    WHEN 'payment_confirmed'    THEN 'payment'
    WHEN 'status_change'        THEN 'status_change'
    WHEN 'note'                 THEN 'note'
    WHEN 'follow_up'            THEN 'follow_up'
    WHEN 'message'              THEN 'note'
    ELSE 'note'
  END                           AS event_type,
  le.actor,
  le.actor_id,
  '[Migrated from lead_events] ' || le.details AS details,
  le.metadata,
  le.created_at
FROM lead_events le
WHERE le.lead_id = '1ffb614e-7e2f-4066-997c-da0f4cb337b7';

-- ============================================================
-- Step 3: Add an initial milestone event to active_raids for EVRO
-- ============================================================
INSERT INTO raid_events (raid_id, event_type, actor, details, metadata, created_at)
VALUES (
  (SELECT id FROM active_raids WHERE name = 'EVRO' LIMIT 1),
  'milestone',
  'System',
  'GIP-135 completed. RaidGuild received $50k stipend for Liquity v2 fork audit on Gnosis Chain. '
  'Sherlock audit complete. RaidGuild holds 30% of RETVRN governance token. '
  'DAO (Moloch v3/Baal) live on Gnosis Chain. '
  'V5 deployment proposal sent April 2026: €5M across 6 collateral branches, projected 8.1% annualized yield.',
  '{
    "gip_135": "https://forum.gnosis.io/t/gip-135-should-gnosis-dao-grant-raidguild-a-50k-stipend-to-fund-the-audit-of-an-euro-pegged-cdp-stablecoin-on-gnosis-using-liquity-v2-liquidity-agreement-in-exchange-for-15-of-governance-token/11574",
    "funding_tx_test": "0x8ae92a31f",
    "funding_tx_full": "0x6ac23b829",
    "safe": "0x3d0Ac27a6D40caA9Fcc49a00BfeF26705BF69C4C",
    "deployed_addresses": "https://github.com/evro-finance/evro/blob/main/contracts/gnosis-deployment-v2.json"
  }'::jsonb,
  '2026-04-15 23:27:06+00'  -- matches leads.created_at
);

-- ============================================================
-- Verification queries — run these to confirm the migration
-- ============================================================

-- Check active_raids entry
SELECT id, name, status, upsell_description, revenue_to_date, assigned_members
FROM active_raids WHERE name = 'EVRO';

-- Check raid_events count
SELECT event_type, count(*)
FROM raid_events
WHERE raid_id = (SELECT id FROM active_raids WHERE name = 'EVRO')
GROUP BY event_type ORDER BY event_type;

-- Check leads.raid_id is populated
SELECT id, client_name, status, raid_id
FROM leads WHERE id = '1ffb614e-7e2f-4066-997c-da0f4cb337b7';
