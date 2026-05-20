# Lead Agent — Architecture

## Overview

The Lead Agent is a **Pinata agent template** that any organization can deploy to manage their BD pipeline via Telegram. It runs on OpenClaw (Pinata's agent runtime), talks to Telegram natively, and stores data in the org's own Supabase instance.

RaidGuild is the first deployment. The template is org-agnostic.

```
┌─────────────────┐         ┌──────────────────────────────┐         ┌─────────────────────┐
│  Introducer +   │         │   Lead Agent                 │         │     Supabase        │
│  Potential      │◀───────▶│   (OpenClaw / Pinata Agent)  │────────▶│   (org's own DB)    │
│  Client         │Telegram │                              │  REST   │                     │
└─────────────────┘         │  ┌──────────────────────┐   │         └─────────────────────┘
                             │  │  BD REST API :3000   │   │
                             │  │  /api/leads          │   │
                             │  │  /api/pipeline/stats │   │
                             │  └──────────┬───────────┘   │
                             └─────────────┼───────────────┘
                                           │ HTTPS (Pinata route)
                             ┌─────────────▼───────────────┐
                             │   RaidGuild Cohort Portal   │
                             │   (or any external client)  │
                             └─────────────────────────────┘
```

## Key Change (2026-04-08)

**Before:** byzved (Grammy.js) ran as a separate server → relayed to OpenClaw → wrote to Guild Grimoire CRM API.

**After:** OpenClaw handles Telegram natively. No byzved. No extra server. Data goes directly to the org's Supabase via PostgREST API.

## Components

### 1. Lead Agent (OpenClaw / Pinata Agent)
- **Role:** The brain. Handles all Telegram conversations, qualifies leads, tracks pipeline.
- **Runtime:** OpenClaw on Pinata infrastructure
- **Telegram:** Built-in channel — no Grammy, no Express, no webhook server
- **Template:** Deployable via Pinata marketplace (`manifest.json` + workspace files)

### 2. Supabase (Each Org's Own Instance)
- **Role:** Data layer. Stores leads, events, conversations.
- **Access:** PostgREST API via anon key
- **Schema:** See `migrations/` for table definitions

### 3. Pinata Template
- **Repo:** `github.com/GeneralInfluence/RaidGuildBDagents`
- **Deploy:** One-click from Pinata marketplace or CLI
- **Secrets needed:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, Telegram bot token

## Database Schema

### Existing Tables (from byzved)
- `conversations` — raw message history (+ new `lead_id` FK)
- `opt_out_users` — privacy opt-outs
- `telegram_channels` — tracked groups/channels
- `telegram_messages` — raw Telegram message archive

### New Tables (migration 002)
- `leads` — pipeline opportunities (warm-intro → funded)
- `lead_events` — activity log per lead

See `migrations/002_create_leads_schema.sql` for full DDL.

## BD Pipeline Stages

```
warm-intro → qualified → proposal → funded → closed-won
                                           → closed-lost
                                    → stale (no activity)
```

### Stage 1: Warm Intro
- Agent is added to Telegram group with introducer + potential client
- Agent acknowledges, asks permission, begins qualification
- Creates lead record in Supabase

### Stage 2: Qualified
- Agent has gathered enough info: who, what, why, budget signal
- Introducer is credible (known to org community)
- Lead status updated, BD steward notified

### Stage 3: Proposal
- Verified member submits proposal to client
- Shares proof with agent
- Logged as lead_event

### Stage 4: Funded
- Client pays (on-chain or bank)
- Treasurer confirms
- Lead marked closed-won

## Template Customization Points

For other orgs deploying the template:

| What | Where | What to Change |
|------|-------|----------------|
| Org name/branding | `workspace/SOUL.md`, `workspace/IDENTITY.md` | Replace "RaidGuild" with your org |
| Pipeline stages | `migrations/002_create_leads_schema.sql` | Modify status CHECK constraint |
| Qualification criteria | `workspace/SOUL.md` | Define what makes a lead "qualified" for your org |
| Member verification | Agent logic | How to verify someone is a member (Discord roles, on-chain, manual list) |
| Telegram bot | `manifest.json` channels + Pinata secrets | Provide your own bot token |
| Database | Pinata secrets | Provide your own Supabase URL + key |

## BD REST API (Cohort Portal Integration)

The agent runs an Express HTTP server on port 3000, exposed via Pinata routes at:
```
https://{agentId}.agents.pinata.cloud/api
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Public health check (no auth) |
| GET | `/pipeline/stats` | Summary counts by stage and type |
| GET | `/leads` | List leads (filter: status, type, limit, offset) |
| GET | `/leads/:id` | Lead detail + event history |
| POST | `/leads` | Create a new lead (from Cohort Portal) |
| PATCH | `/leads/:id` | Update lead fields |
| POST | `/leads/:id/events` | Log an activity event |

**Auth:** `Authorization: Bearer <BD_API_KEY>` or `?api_key=<BD_API_KEY>`

**CORS:** Controlled by `CORS_ORIGIN` env var (defaults to `*`; set to `https://cohort.raidguild.org` for production).

See `workspace/bot/src/api.js` for full implementation.

## Open Questions / TODO

- [ ] Run migration 002 against Supabase (needs SQL Editor or service role key)
- [ ] RLS policies for anon key access to leads/lead_events tables
- [ ] Credible introducer verification method
- [ ] Polite professional questioning flow (conversation design)
- [ ] Cohort Portal: set BD_API_KEY secret and CORS_ORIGIN on deploy
- [ ] Member verification (Discord role check? On-chain? Manual list?)
- [ ] Auto-stale detection (no activity in X days)
- [ ] Consider Supabase RLS for portal read-only vs. read-write access tiers
