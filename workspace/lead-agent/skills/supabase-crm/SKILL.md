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

### Upsert a user (on every group message)
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/telegram_users" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d '{
    "telegram_id": 123456,
    "username": "alice",
    "first_name": "Alice",
    "last_name": "Smith",
    "last_seen_at": "now()",
    "seen_in_groups": [-100123456789]
  }'
```

### List known users
```bash
curl -s "$SUPABASE_URL/rest/v1/telegram_users?order=last_seen_at.desc" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

## Data Logging Rules

1. **Always log:** Usernames and Telegram IDs to `telegram_users` on every group interaction
2. **Don't log conversations** to `conversations` table unless:
   - The lead is confirmed (status changed to `qualified` or beyond)
   - Sean explicitly asks to log them
3. **Lead creation:** Only when an opportunity is confirmed, not on first contact
4. **Lead events:** Log significant pipeline events (intro, qualification, proposal, payment)

## Notes
- The anon key can read/write via RLS policies. If writes fail, RLS may need to be configured in Supabase.
- For table creation/migration, use the Supabase SQL Editor (Dashboard → SQL) or a service role key.
- The `leads` table `updated_at` field should be manually set on updates (no auto-trigger yet).

## Intelligence Update Workflow

When the BD Steward shares chat logs, proposal docs, or on-chain data, use this workflow to update both Supabase and the Ditto knowledge graph.

### Step 1 — Extract intel
From the source material, identify:
- **Lead patch fields:** status, description, notes, client_contact, assigned_member, priority
- **Timeline events:** key milestones (funding confirmed, stakeholder changes, blockers, etc.)
- **Contributors:** everyone involved and their specific roles (for Ditto)

### Step 2 — Update Supabase lead
PATCH the lead record with extracted fields. Always include `updated_at: "now()"`.

### Step 3 — Log lead events
Batch-insert events for each significant milestone. Event types:
- `payment_confirmed` — on-chain funding received
- `status_change` — pipeline stage change
- `note` — internal intel (team discussions, blockers)
- `follow_up` — pending action with a date

### Step 4 — Save to Ditto
Use the Ditto Log Format from MEMORY.md. Rules:
- Subject = the WORK (Raid/Contract, etc.), never a person
- Name ALL contributors with specific roles
- Explicitly note anyone who should NOT receive contributor credit
- Include current status + next step with date

### Step 5 — Schedule follow-ups
Use `cron` to set reminders for pending action items.

### CLI (manual updates)
```bash
cd /home/node/clawd/workspace/bd-funnel
node workspace/lead-agent/scripts/update-lead.js <lead-id> \
  --status funded \
  --notes "Waiting on Gnosis deployment call" \
  --event "Pre-launch status confirmed. Audit done." \
  --actor "Elco"
```

### People Profiling Workflow
When given Telegram handles for a new channel/group:
1. Run `web_search` for each handle (name, role, org, Twitter/GitHub)
2. Update the lead's `client_contact` and `notes` with confirmed profiles
3. Save a people profiles update to Ditto naming each person's role
4. For client-side contacts: focus on decision-making authority (can they commit budget?)
5. For RaidGuild members: capture specific contribution role for compensation ledger
