# MEMORY.md - Long-Term Memory

## Setup

- **2026-03-13:** Initial setup completed. Telegram bot connected. Aphilos (Sean) is BD Steward for RaidGuild, based in Reno, NV (Pacific Time).
- Bot identity: BizDev 🌀 — RaidGuild BD pipeline agent.
- Current phase: training/testing with Aphilos before opening to broader community.
- Telegram bot: @RaidGuild_bot, approved user 713478036 (Aphilos).

## BD Pipeline (defined 2026-03-13)

- **Stage 1 — Warm Intro:** Anyone creates a group chat (Telegram/Discord) with potential client + bot. Bot confirms, asks permission to share client info with a member.
- **Stage 2 — Formal Proposal:** Verified RaidGuild member submits proposal to client, shares proof with bot. Members verified via RIP: https://github.com/raid-guild/RIPs
- **Stage 3 — Funded Raid:** Client pays (on-chain wallet or bank). Treasurer confirms payment.
- Full pipeline doc: `bd-pipeline.md`
- Email intros and on-chain monitoring are future state.

## Training System (added 2026-04-08)
- **April 2026 cohort** (sponsored by Pinata Agents) will test warm intros via Telegram
- Training feedback loop: real convos → Sean critiques → lessons logged → playbook updated
- Playbook: `bd-funnel/lead-agent/training/PLAYBOOK.md` — living doc for how to handle intros
- Lessons: `bd-funnel/lead-agent/training/LESSONS.md` — accumulated feedback
- Session reviews: `bd-funnel/lead-agent/training/sessions/` — individual interaction reviews
- Feedback also logged to Supabase as lead_events with `metadata.type: "training_feedback"`
- **Key principle:** Learn from real interactions, don't over-engineer upfront

## Supabase (added 2026-04-08)
- URL: `https://lrsfpchwdtkokiucbzxl.supabase.co`
- Credentials in `.env.raidguild`
- Tables: `leads`, `lead_events`, `conversations` (with `lead_id` FK), `telegram_channels`, `telegram_messages`, `opt_out_users`
- Schema: `bd-funnel/lead-agent/migrations/`
- CRM skill: `bd-funnel/lead-agent/skills/supabase-crm/SKILL.md`

## Pinata Template (added 2026-04-08)
- Building as a reusable template any org can deploy
- Manifest: `bd-funnel/manifest.json`
- Docs: https://docs.pinata.cloud/agents/templates/overview
