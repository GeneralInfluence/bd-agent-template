# RaidGuild Business Development Skill

## Purpose
Manage the RaidGuild BD pipeline and log events to the Guild Grimoire CRM.

## Guild Grimoire Ingest API

**Endpoint:** `POST https://guild-grimoire.xyz/api/modules/guild-grimoire/ingest`

**Headers:**
- `Content-Type: application/json`
- `x-grimoire-api-key: ${GUILD_GRIMOIRE_INGEST_API_KEY}`
- `x-user-id: ${GUILD_GRIMOIRE_INGEST_USER_ID}`

**Payload:**
```json
{
  "text_content": "string (required, max 256 chars, trimmed)",
  "visibility": "private | shared | cohort | public (default: shared)",
  "tag_ids": ["optional", "array", "of", "tag-uuids"]
}
```

**Environment variables** (stored in `.env.raidguild` in workspace root):
- `GUILD_GRIMOIRE_INGEST_API_KEY`
- `GUILD_GRIMOIRE_INGEST_USER_ID`

### How to Call

Use the shell script:
```bash
source /home/node/clawd/workspace/.env.raidguild
/home/node/clawd/workspace/skills/raidguild-bd/grimoire-ingest.sh "note text" [visibility] [tag1,tag2]
```

Or call directly with `exec` + `curl`:
```bash
source /home/node/clawd/workspace/.env.raidguild
curl -s -X POST "https://guild-grimoire.xyz/api/modules/guild-grimoire/ingest" \
  -H "Content-Type: application/json" \
  -H "x-grimoire-api-key: $GUILD_GRIMOIRE_INGEST_API_KEY" \
  -H "x-user-id: $GUILD_GRIMOIRE_INGEST_USER_ID" \
  -d '{"text_content": "your note", "visibility": "shared"}'
```

## BD Pipeline Stages

### Stage 1 — Warm Intro
- Anyone creates a group chat with potential client + bot
- Bot confirms, asks permission to share client info with a member
- **Log to Grimoire:** `"Warm intro: [client name/desc] via [introducer]"`
- Status: `warm-intro`

### Stage 2 — Formal Proposal
- Verified RaidGuild member submits proposal to client
- Member shares proof with bot
- Members verified via RIP: https://github.com/raid-guild/RIPs
- **Log to Grimoire:** `"Proposal submitted: [client] by [member]"`
- Status: `proposal-submitted`

### Stage 3 — Funded Raid
- Client pays (on-chain or bank)
- Treasurer confirms payment
- **Log to Grimoire:** `"Funded: [client] — [amount/details]"`
- Status: `funded-raid`

## When to Log

Log to Guild Grimoire whenever:
- A new BD opportunity is identified (warm intro)
- A proposal is submitted
- Payment is confirmed
- Status changes on an opportunity
- Significant BD-related conversations happen

Keep notes concise (≤256 chars). Use `shared` visibility by default.

## Tag Management

Tags are UUIDs from the Grimoire system. As we discover/create relevant tags (e.g., for pipeline stages, project types), document them here:

- *(tags to be populated as we learn them)*

## Notes

- The bot token is already managed by OpenClaw's Telegram channel config
- No separate server needed — OpenClaw handles all Telegram I/O
- See `bd-pipeline.md` in workspace root for the full pipeline doc
