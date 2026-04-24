-- Seed: 001_seed_org_config.sql
-- Purpose: Org identity and BD Steward configuration
-- Replace all placeholder values with your organization's real data.
-- This seed is idempotent — safe to re-run.

-- ============================================================
-- telegram_users — BD Steward(s) and known members
-- ============================================================
-- The BD Steward is the human who manages the pipeline and has
-- elevated bot permissions (/add, /update, /confirm, etc.)
--
-- telegram_id: get this from @userinfobot on Telegram
-- is_steward: true = full pipeline control
-- is_member: true = verified org member (can submit proposals)

INSERT INTO telegram_users (telegram_id, username, display_name, is_steward, is_member, notes)
VALUES
  -- Primary BD Steward
  (111111111, 'your_steward_handle', 'BD Steward Name', true, true,
   'Primary BD Steward — replace with real Telegram user ID and handle'),

  -- Example verified member
  (222222222, 'member_one_handle', 'Member One', false, true,
   'Verified org member — can submit proposals and be assigned leads')

ON CONFLICT (telegram_id) DO NOTHING;

-- ============================================================
-- Notes for deployers
-- ============================================================
-- 1. Find your Telegram user ID: message @userinfobot
-- 2. Add all verified members who should have /confirm and assignment rights
-- 3. Only stewards see /pipeline, /add, /close commands
-- 4. Set BD_STEWARD_TELEGRAM_ID in your .env to match the steward's telegram_id above
