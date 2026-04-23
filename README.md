# Lead Agent 🌀

> A Pinata agent template for relationship-driven BD pipelines.

Deploy your own BD agent in one click. It handles warm introductions via Telegram, qualifies leads through natural conversation, tracks opportunities in your Supabase database, and notifies your BD steward when something's ready to move.

Built by [RaidGuild](https://raidguild.org) for the April 2026 cohort, sponsored by [Pinata](https://pinata.cloud).

---

## What It Does

- **Warm intros via Telegram** — Get added to a group with a potential client or sponsor. The agent greets everyone, learns about the opportunity, and tracks the conversation.
- **Qualifies leads** — Asks the right questions (one at a time, conversationally) to determine intent, fit, and urgency.
- **Tracks pipeline** — Logs confirmed leads, events, and user contacts to your Supabase instance.
- **Notifies your BD steward** — DMs the right person when a lead is confirmed and ready to hand off.
- **Learns over time** — Feedback and critique from real interactions updates a living playbook.

## Pipeline Stages

```
warm-intro → qualified → proposal → funded → closed-won
                                           → closed-lost
                              → stale (no activity)
```

## Opportunity Types

- **New work** — Client needs services your org provides
- **Sponsor** — Company wants to sponsor a cohort, event, or initiative
- **Recruiting** — Talent interested in joining your org or a project
- **New venture** — Partnership or co-creation opportunity
- **Product integration** — Company wants to integrate with your tooling

## Setup

### 1. Deploy from Pinata

Click **Deploy This Agent** on the [Pinata Marketplace](https://agents.pinata.cloud/marketplace) and provide:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon key
- A Telegram bot token (create one via [@BotFather](https://t.me/botfather))

### 2. Configure the Telegram Bot

In @BotFather:
- **Group Privacy → Turn Off** (critical — lets the bot read all group messages)
- Add the bot to any group where you'll be making intros

### 3. Run Database Migrations

In your Supabase SQL Editor, run in order:
1. `workspace/lead-agent/migrations/002_create_leads_schema.sql`
2. `workspace/lead-agent/migrations/003_create_user_tracking.sql`
3. `workspace/lead-agent/migrations/004_add_sponsor_opportunity_type.sql`

### 4. Bootstrap

Start a conversation with your agent. It'll ask about your org, your pipeline, and who should receive lead notifications. Follow the prompts in `workspace/BOOTSTRAP.md`.

### 5. Install Script Dependencies

The BD steward CLI scripts require Node.js dependencies. From your agent workspace:

```bash
cd workspace/lead-agent
npm install
```

This installs `@supabase/supabase-js` and `dotenv` for the `scripts/update-lead.js` CLI.

### 6. Unlock Notifications

Have your BD steward DM the Telegram bot once (any message). This unlocks the bot's ability to send them lead notifications.

## Training & Feedback

The agent improves from real interactions. After any conversation, tell your agent:

> "Review the intro from [person] today"

It will summarize what happened, ask for your feedback, and update its playbook.

Training files live in `workspace/lead-agent/training/`:
- `PLAYBOOK.md` — living guide for how to handle intros
- `LESSONS.md` — indexed feedback log
- `sessions/` — individual interaction reviews

## Stack

- **Runtime:** [Pinata Agents](https://agents.pinata.cloud) (OpenClaw)
- **Messaging:** Telegram (via built-in channel — no extra server needed)
- **Database:** [Supabase](https://supabase.com) (bring your own)
- **Model:** Claude (configurable)

## Customization

Everything is designed to be org-agnostic. After deploying:

| What to change | Where |
|---|---|
| Org name & branding | `workspace/SOUL.md`, `workspace/IDENTITY.md` |
| Pipeline stages | `workspace/lead-agent/migrations/002_...sql` |
| Qualification criteria | `workspace/lead-agent/training/PLAYBOOK.md` |
| BD steward contact | `workspace/USER.md`, `workspace/TOOLS.md` |
| Weekly review schedule | `manifest.json` tasks |
