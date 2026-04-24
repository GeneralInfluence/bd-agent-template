-- Migration: 005_create_active_projects.sql
-- Purpose: Add active_projects and project_events tables for tracking ongoing engagements
-- Description: Separates active projects (where your org is already engaged and delivering)
--              from the leads pipeline (new opportunities). A project can have multiple
--              upsell opportunities and milestones tracked over its lifetime.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- active_projects — ongoing engagements
-- ============================================================
CREATE TABLE IF NOT EXISTS active_projects (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name                  TEXT NOT NULL,                -- short name, e.g. "ACME MVP"
  full_name             TEXT,                         -- full description
  project_type          TEXT DEFAULT 'development'
                        CHECK (project_type IN ('audit', 'development', 'management', 'consulting', 'other')),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'upsell', 'completed', 'archived')),

  -- Client context
  client_org            TEXT,
  website               TEXT,
  app_url               TEXT,
  github                TEXT,

  -- Team
  assigned_members      TEXT[],                       -- your org's members on this project
  revenue_to_date       NUMERIC(18, 2),
  revenue_currency      TEXT DEFAULT 'USD',

  -- Upsell / next opportunity
  upsell_description    TEXT,
  upsell_value          NUMERIC(18, 2),
  upsell_currency       TEXT DEFAULT 'USD',

  -- Key contacts (external)
  key_contacts          JSONB,                        -- [{name, handle, email, role}]

  -- Free-form
  description           TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_projects_status ON active_projects(status);
CREATE INDEX IF NOT EXISTS idx_active_projects_name   ON active_projects(name);

-- ============================================================
-- project_events — activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS project_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES active_projects(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL
              CHECK (event_type IN (
                'milestone', 'note', 'upsell', 'payment',
                'status_change', 'team_change', 'technical', 'follow_up'
              )),
  actor       TEXT,
  actor_id    BIGINT,
  details     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project ON project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_type    ON project_events(event_type);
CREATE INDEX IF NOT EXISTS idx_project_events_created ON project_events(created_at DESC);

-- ============================================================
-- Link leads to active_projects (optional — for upsells)
-- ============================================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES active_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(project_id);

COMMENT ON TABLE active_projects IS 'Ongoing engagements — distinct from leads pipeline. A project is confirmed, active work.';
COMMENT ON TABLE project_events  IS 'Activity log for project lifecycle events, milestones, and upsells';
COMMENT ON COLUMN leads.project_id IS 'Optional link to an active project — for upsells originating within an existing engagement';
