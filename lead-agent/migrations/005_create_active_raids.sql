-- Migration: 005_create_active_raids.sql
-- Purpose: Add active_raids and raid_events tables for tracking ongoing RaidGuild work
-- Created: 2026-04-17
-- Description: Separates ongoing Raids (where RaidGuild is already engaged and delivering)
--              from the leads pipeline (new opportunities). A raid can have multiple
--              upsell opportunities and milestones tracked over its lifetime.

-- Enable uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- active_raids — ongoing RaidGuild engagements
-- ============================================================
CREATE TABLE IF NOT EXISTS active_raids (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name                  TEXT NOT NULL,                -- e.g. "EVRO"
  full_name             TEXT,                         -- e.g. "EVRO — EUR-pegged CDP stablecoin on Gnosis Chain"
  raid_type             TEXT DEFAULT 'development'
                        CHECK (raid_type IN ('audit', 'development', 'management', 'consulting', 'other')),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'upsell', 'completed', 'archived')),

  -- Org / client context
  client_org            TEXT,                         -- org or protocol name
  website               TEXT,
  app_url               TEXT,
  github                TEXT,

  -- RaidGuild position
  assigned_members      TEXT[],                       -- RaidGuild members on this raid
  rg_governance_pct     TEXT,                         -- e.g. "30% of RETVRN"
  safe_address          TEXT,                         -- multisig if applicable
  revenue_to_date       NUMERIC(18, 2),               -- USD value earned so far
  revenue_currency      TEXT DEFAULT 'USD',

  -- Upsell / next opportunity
  upsell_description    TEXT,                         -- what the next revenue opportunity is
  upsell_value          NUMERIC(18, 2),               -- estimated USD value
  upsell_currency       TEXT DEFAULT 'USD',

  -- Key contacts (external — not RG members)
  key_contacts          JSONB,                        -- [{name, handle, email, role}]

  -- Governance token info
  governance_token      TEXT,                         -- e.g. "RETVRN"
  token_allocation      JSONB,                        -- {raidguild: "30%", gnosis_dao: "15%", treasury: "55%"}

  -- Free-form
  description           TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_raids_status ON active_raids(status);
CREATE INDEX IF NOT EXISTS idx_active_raids_name   ON active_raids(name);

-- ============================================================
-- raid_events — activity log for each active raid
-- ============================================================
CREATE TABLE IF NOT EXISTS raid_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raid_id     UUID NOT NULL REFERENCES active_raids(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL
              CHECK (event_type IN (
                'milestone', 'note', 'upsell', 'payment',
                'status_change', 'team_change', 'technical', 'follow_up'
              )),
  actor       TEXT,                     -- who did it (name or handle)
  actor_id    BIGINT,                   -- telegram user_id if known
  details     TEXT,                     -- free-form description
  metadata    JSONB,                    -- structured data (links, tx hashes, amounts, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raid_events_raid    ON raid_events(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_events_type    ON raid_events(event_type);
CREATE INDEX IF NOT EXISTS idx_raid_events_created ON raid_events(created_at DESC);

-- ============================================================
-- Link leads to active_raids (optional — for upsells)
-- A lead can be associated with an existing raid (e.g. an upsell
-- that started as a new conversation within an active engagement).
-- ============================================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS raid_id UUID REFERENCES active_raids(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_raid ON leads(raid_id);

-- ============================================================
-- Seed: EVRO active raid
-- ============================================================
INSERT INTO active_raids (
  name, full_name, raid_type, status,
  client_org, website, app_url, github,
  assigned_members, rg_governance_pct, safe_address,
  revenue_to_date, revenue_currency,
  upsell_description, upsell_value, upsell_currency,
  key_contacts, governance_token, token_allocation,
  description, notes
) VALUES (
  'EVRO',
  'EVRO — EUR-pegged CDP stablecoin on Gnosis Chain',
  'management',
  'upsell',
  'EVRO / Gnosis DAO',
  'https://www.evro.finance',
  'https://app.evro.finance',
  'https://github.com/evro-finance',
  ARRAY['Elco (0xNesk RG)'],
  '30% of RETVRN governance token',
  '0x3d0Ac27a6D40caA9Fcc49a00BfeF26705BF69C4C',
  50000.00, 'USD',
  'Reorganize EVRO Build Team → EVRO Management Team to help secure €5M from Gnosis DAO into the protocol. Projected ~$50k/year yield for EVRO DAO (managed by RaidGuild).',
  50000.00, 'USD',
  '[
    {"name": "Julian Nesk", "handle": "@0xNesk", "email": "julian.nesk@gnosis.io", "role": "Gnosis BD Head"},
    {"name": "Dave", "handle": "@marktomeme", "email": "dave@no.ca", "role": "NOCA treasury manager"},
    {"name": "MrDeadce11", "handle": "@MrDeadce11", "email": null, "role": "EVRO Build Team / RaidGuild Member — technical contact"}
  ]'::jsonb,
  'RETVRN',
  '{"raidguild": "30%", "gnosis_dao": "15%", "dao_treasury": "55%"}'::jsonb,
  'RaidGuild manages the EVRO DAO. GIP-135 passed at 148% quorum — RaidGuild received $50k stipend for Liquity v2 fork audit on Gnosis Chain, in exchange for 15% of RETVRN governance token. Sherlock audit complete.',
  'Funding txs: 0x8ae92a31f (test), 0x6ac23b829 (full). EVRO Telegram: https://t.me/+hofgAYWLewFmM2Zi. Elco site: elco.work. GIP-135: https://forum.gnosis.io/t/gip-135-should-gnosis-dao-grant-raidguild-a-50k-stipend-to-fund-the-audit-of-an-euro-pegged-cdp-stablecoin-on-gnosis-using-liquity-v2-liquidity-agreement-in-exchange-for-15-of-governance-token/11574. Deployed addresses: https://github.com/evro-finance/evro/blob/main/contracts/gnosis-deployment-v2.json. Status (2026-04-17): Waiting on Gnosis DAO call to green-light V5 deployment (€5M across 6 collateral branches: sDAI 35% / GNO 20% / wstETH 15% / wXDAI 15% / wBTC 10% / osGNO 5%).'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE active_raids IS 'Ongoing RaidGuild engagements — distinct from the leads pipeline. A Raid is confirmed, funded work where RaidGuild is already delivering.';
COMMENT ON TABLE raid_events IS 'Activity log for active raid lifecycle events, milestones, and upsells';
COMMENT ON COLUMN active_raids.upsell_description IS 'Description of the next revenue opportunity within this ongoing raid';
COMMENT ON COLUMN active_raids.key_contacts IS 'External contacts (non-RG members) — [{name, handle, email, role}]';
COMMENT ON COLUMN active_raids.token_allocation IS 'Governance token split — {raidguild: %, gnosis_dao: %, treasury: %}';
COMMENT ON COLUMN leads.raid_id IS 'Optional link to an active raid — for upsell opportunities that originate within an existing engagement';
