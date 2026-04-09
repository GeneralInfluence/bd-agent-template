-- Migration: 003_create_user_tracking.sql
-- Purpose: Track Telegram users seen by the bot (without logging conversations)
-- Created: 2026-04-08

CREATE TABLE IF NOT EXISTS telegram_users (
  id            BIGSERIAL PRIMARY KEY,
  telegram_id   BIGINT UNIQUE NOT NULL,
  username      TEXT,
  first_name    TEXT,
  last_name     TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  seen_in_groups BIGINT[] DEFAULT '{}'    -- array of group IDs where we've seen them
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);
CREATE INDEX IF NOT EXISTS idx_telegram_users_last_seen ON telegram_users(last_seen_at DESC);

COMMENT ON TABLE telegram_users IS 'Lightweight user tracking — logs who the bot has seen, not what they said';
COMMENT ON COLUMN telegram_users.seen_in_groups IS 'Array of Telegram group IDs where this user has been observed';
