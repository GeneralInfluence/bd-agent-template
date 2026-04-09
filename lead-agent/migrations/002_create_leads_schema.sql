-- Migration: 002_create_leads_schema.sql
-- Purpose: Add leads pipeline tables alongside existing conversation tables
-- Created: 2026-04-08
-- Description: Creates leads and lead_events tables for BD pipeline tracking
-- Existing tables (conversations, opt_out_users, telegram_channels, telegram_messages) are untouched.

-- Enable uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- leads — the pipeline opportunities
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status        TEXT NOT NULL DEFAULT 'warm-intro'
                CHECK (status IN ('warm-intro', 'qualified', 'proposal', 'funded', 'closed-won', 'closed-lost', 'stale')),
  client_name   TEXT,
  client_contact TEXT,                    -- telegram handle, email, etc.
  introducer    TEXT,                     -- who made the warm intro
  introducer_id BIGINT,                   -- telegram user_id of introducer
  assigned_member TEXT,                   -- RaidGuild member who picked it up
  description   TEXT,                     -- what the client needs
  opportunity_type TEXT DEFAULT 'new-raid'
                CHECK (opportunity_type IN ('new-raid', 'recruiting', 'new-venture', 'other')),
  source        TEXT,                     -- telegram-group, email, event, referral, etc.
  source_group_id BIGINT,                -- telegram group_id if applicable
  priority      TEXT DEFAULT 'medium'
                CHECK (priority IN ('high', 'medium', 'low')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source_group ON leads(source_group_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- ============================================================
-- lead_events — activity log for each lead
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL
                CHECK (event_type IN ('intro', 'qualification', 'proposal_submitted', 'payment_confirmed', 'status_change', 'note', 'follow_up', 'message')),
  actor         TEXT,                     -- who did it (name or telegram handle)
  actor_id      BIGINT,                   -- telegram user_id if applicable
  details       TEXT,                     -- free-form description
  metadata      JSONB,                    -- structured data (e.g., proposal link, payment tx)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_events(created_at DESC);

-- ============================================================
-- Link conversations to leads (optional FK)
-- Adds a nullable lead_id column to conversations so messages
-- can be associated with a specific lead/opportunity.
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE leads IS 'BD pipeline opportunities — warm intros through funded raids';
COMMENT ON TABLE lead_events IS 'Activity log for lead lifecycle events';
COMMENT ON COLUMN leads.source_group_id IS 'Telegram group/chat ID where the intro happened';
COMMENT ON COLUMN leads.introducer_id IS 'Telegram user_id of the person who made the warm intro';
COMMENT ON COLUMN conversations.lead_id IS 'Optional link to a lead — associates conversation messages with a pipeline opportunity';
