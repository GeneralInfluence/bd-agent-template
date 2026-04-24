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

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE active_raids IS 'Ongoing org engagements — distinct from the leads pipeline. An active raid is confirmed, funded work where your org is already delivering.';
COMMENT ON TABLE raid_events IS 'Activity log for active raid lifecycle events, milestones, and upsells';
COMMENT ON COLUMN active_raids.upsell_description IS 'Description of the next revenue opportunity within this ongoing raid';
COMMENT ON COLUMN active_raids.key_contacts IS 'External contacts (non-org members) — [{name, handle, email, role}]';
COMMENT ON COLUMN active_raids.token_allocation IS 'Governance token split — {org: %, partner: %, treasury: %}';
COMMENT ON COLUMN leads.raid_id IS 'Optional link to an active raid — for upsell opportunities that originate within an existing engagement';
