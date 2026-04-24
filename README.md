# BD Agent 🌀

> A Pinata agent template for relationship-driven BD pipelines.

Deploy your own BD agent in one click. It handles warm introductions via Telegram, qualifies leads through natural conversation, tracks opportunities in your Supabase database, and notifies your BD steward when something's ready to move.

Built by [RaidGuild](https://raidguild.org), sponsored by [Pinata](https://pinata.cloud).

---

## What It Does

- **Warm intros via Telegram** — Get added to a group with a potential client or sponsor. The agent greets everyone, learns about the opportunity, and tracks the conversation.
- **Qualifies leads** — Asks the right questions (one at a time, conversationally) to determine intent, fit, and urgency.
- **Tracks pipeline** — Logs confirmed leads, events, and contacts to your Supabase instance.
- **Notifies your BD steward** — DMs the right person when a lead is confirmed and ready to hand off.
- **Learns over time** — Feedback from real interactions updates a living playbook.

## Pipeline Stages

```
warm-intro → qualified → proposal → funded → closed-won
                                           → closed-lost
                              → stale (no activity)
```

## Opportunity Types (customize for your org)

- **New Work** — Client needs services your org provides
- **Sponsor** — Company wants to sponsor a cohort, event, or initiative
- **Recruiting** — Talent interested in joining your org or a project
- **New Venture** — Partnership or co-creation opportunity
- **Product Integration** — Company wants to integrate with your tooling

---

## Setup

### 1. Deploy from Pinata

Click **Deploy This Agent** on the [Pinata Marketplace](https://agents.pinata.cloud/marketplace) and provide your secrets (see `manifest.json` for the full list). At minimum:

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/botfather)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — your Supabase project
- `ANTHROPIC_API_KEY` — for lead qualification
- `ORG_NAME` — your organization's name

### 2. Configure the Telegram Bot

In @BotFather:
- **Group Privacy → Turn Off** (critical — lets the bot read all group messages)
- Add the bot to any group where you'll be making intros

### 3. Run Database Migrations

In your Supabase SQL Editor, run in order:
1. `lead-agent/migrations/002_create_leads_schema.sql`
2. `lead-agent/migrations/003_create_user_tracking.sql`
3. `lead-agent/migrations/004_add_sponsor_opportunity_type.sql`
4. *(Optional)* `lead-agent/migrations/005_create_active_projects.sql` — for tracking ongoing engagements

### 4. Install Script Dependencies

The BD steward CLI scripts require Node.js dependencies:

```bash
cd workspace/lead-agent
npm install
```

This installs `@supabase/supabase-js` and `dotenv` for the `scripts/update-lead.js` CLI.

### 5. Bootstrap

Start a conversation with your agent. It will walk you through:
- Setting your org name and identity
- Defining your pipeline stages
- Describing your ideal client

Follow the prompts in `workspace/BOOTSTRAP.md`.

### 6. Unlock Steward Notifications

Have your BD steward DM the Telegram bot once (any message). This unlocks the bot's ability to send them private lead notifications.

### 7. (Optional) Enable Ditto Contribution Tracking

If you want contribution attribution when deals close:
1. Get a Ditto API key at [heyditto.ai](https://heyditto.ai)
2. Add it as `DITTO_API_KEY` in your secrets
3. Copy `workspace/config/mcporter.example.json` → `workspace/config/mcporter.json` and fill in your key

---

## Steward CLI

Once set up, the BD steward can manually update leads from the command line:

```bash
# Log a note on a lead
node workspace/lead-agent/scripts/update-lead.js <lead-id> \
  --event "Followed up via email" --actor "Your Name"

# Update lead status
node workspace/lead-agent/scripts/update-lead.js <lead-id> \
  --status qualified --notes "Budget confirmed, timeline Q3"

# Log a Ditto contribution graph update
node workspace/lead-agent/scripts/update-lead.js <lead-id> \
  --ditto "New Work — Acme Corp, introduced by Alice. Alice is LEAD."
```

---

## Training & Feedback

The agent improves from real interactions. After any conversation, tell your agent:

> "Review the intro from [person] today"

It will summarize what happened, ask for your feedback, and update its playbook.

Training files live in `lead-agent/training/`:
- `PLAYBOOK.md` — living guide for how to handle intros
- `LESSONS.md` — indexed feedback log
- `sessions/` — individual interaction reviews

---

## Stack

- **Runtime:** [Pinata Agents](https://agents.pinata.cloud) (OpenClaw)
- **Messaging:** Telegram (built-in channel — no extra server needed)
- **Database:** [Supabase](https://supabase.com) (bring your own)
- **Contribution tracking:** [Ditto](https://heyditto.ai) (optional)
- **Model:** Claude (configurable)

---

## Customization

Everything is org-agnostic. After deploying:

| What to change | Where |
|---|---|
| Org name & agent identity | `workspace/IDENTITY.md` |
| Agent personality & tone | `workspace/PERSONALITY.md` |
| BD steward info | `workspace/USER.md` |
| Pipeline stages | `lead-agent/migrations/002_create_leads_schema.sql` |
| Qualification criteria | `lead-agent/training/PLAYBOOK.md` |
| Message templates | `lead-agent/templates/` |
| Outreach playbooks | `lead-agent/playbooks/` |

---

## Example Deployment

[RaidGuild](https://raidguild.org) uses this agent to manage their BD pipeline for the April 2026 cohort, sponsored by Pinata. Their deployment is in the `main` branch of this repo.
