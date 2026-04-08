# Supabase CRM Skill

## Purpose
Read and write leads, events, and conversations to Supabase via the PostgREST API.

## Environment
- `SUPABASE_URL` — project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` — anon/public API key

These are loaded from the workspace `.env.raidguild` file or injected by the Pinata runtime as secrets.

## API Pattern

All operations use `curl` against the Supabase PostgREST API:

```
Base: ${SUPABASE_URL}/rest/v1
Headers:
  apikey: ${SUPABASE_ANON_KEY}
  Authorization: Bearer ${SUPABASE_ANON_KEY}
  Content-Type: application/json
  Prefer: return=representation   (for inserts/updates that should return data)
```

## Tables

### leads
Pipeline opportunities from warm intro through funded deal.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Auto-generated |
| status | text | `warm-intro`, `qualified`, `proposal`, `funded`, `closed-won`, `closed-lost`, `stale` |
| client_name | text | Company or person name |
| client_contact | text | Telegram handle, email, etc. |
| introducer | text | Who made the warm intro |
| introducer_id | bigint | Telegram user_id |
| assigned_member | text | RaidGuild member who owns it |
| description | text | What the client needs |
| opportunity_type | text | `new-raid`, `recruiting`, `new-venture`, `other` |
| source | text | `telegram-group`, `email`, `event`, `referral` |
| source_group_id | bigint | Telegram group ID if applicable |
| priority | text | `high`, `medium`, `low` |
| notes | text | Free-form |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### lead_events
Activity log for each lead.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Auto-generated |
| lead_id | UUID | FK to leads |
| event_type | text | `intro`, `qualification`, `proposal_submitted`, `payment_confirmed`, `status_change`, `note`, `follow_up`, `message` |
| actor | text | Who did it |
| actor_id | bigint | Telegram user_id |
| details | text | What happened |
| metadata | jsonb | Structured data (links, tx hashes, etc.) |
| created_at | timestamptz | Auto |

### conversations (existing)
Raw message history. Has optional `lead_id` column to link messages to a lead.

### telegram_channels (existing)
Tracked Telegram groups/channels.

### telegram_messages (existing)
Raw Telegram message archive.

## Common Operations

### Create a lead
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/leads" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "client_name": "Acme Corp",
    "client_contact": "@alice_acme",
    "introducer": "Bob",
    "introducer_id": 123456,
    "description": "Need smart contract audit",
    "source": "telegram-group",
    "source_group_id": -100123456789
  }'
```

### Log a lead event
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/lead_events" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "lead_id": "<lead-uuid>",
    "event_type": "intro",
    "actor": "Bob",
    "details": "Introduced Alice from Acme Corp — needs audit for DeFi protocol"
  }'
```

### Update lead status
```bash
curl -s -X PATCH "$SUPABASE_URL/rest/v1/leads?id=eq.<lead-uuid>" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"status": "qualified", "updated_at": "now()"}'
```

### List active leads
```bash
curl -s "$SUPABASE_URL/rest/v1/leads?status=not.in.(closed-won,closed-lost,stale)&order=created_at.desc" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Get lead with events
```bash
curl -s "$SUPABASE_URL/rest/v1/leads?id=eq.<lead-uuid>&select=*,lead_events(*)" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Get conversations for a lead
```bash
curl -s "$SUPABASE_URL/rest/v1/conversations?lead_id=eq.<lead-uuid>&order=timestamp.desc" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Insert conversation (with optional lead link)
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/conversations" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "message_id": 12345,
    "text": "Message content",
    "user_id": 67890,
    "group_id": -100123456789,
    "timestamp": "2026-04-08T15:00:00Z",
    "user_name": "alice",
    "lead_id": "<optional-lead-uuid>"
  }'
```

## Helper Script

For quick operations, use:
```bash
export $(cat /home/node/clawd/workspace/.env.raidguild | grep -v '^#' | grep -v '^$' | xargs)
# Then run curl commands above
```

## Notes
- The anon key can read/write via RLS policies. If writes fail, RLS may need to be configured in Supabase.
- For table creation/migration, use the Supabase SQL Editor (Dashboard → SQL) or a service role key.
- The `leads` table `updated_at` field should be manually set on updates (no auto-trigger yet).
