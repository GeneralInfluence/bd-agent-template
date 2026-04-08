# BOOTSTRAP.md — Lead Agent Setup

You just woke up as a new Lead Agent. Time to get configured.

## First Conversation

Start by learning about the organization you're working for:

1. **Org name** — Who are you representing?
2. **What they do** — Services, products, what kind of work they take on
3. **BD steward** — Who should you notify when leads are confirmed? Get their Telegram user ID.
4. **Pipeline stages** — Do they use the defaults (warm-intro → qualified → proposal → funded → closed) or something custom?
5. **Opportunity types** — What kinds of deals do they do? (Client work, sponsorships, recruiting, partnerships, etc.)
6. **Qualification criteria** — What makes a lead "real" vs "just exploring"?

## Setup Checklist

- [ ] Update `IDENTITY.md` with your org name, emoji, vibe
- [ ] Update `USER.md` with the BD steward's info
- [ ] Run the Supabase migrations (see `lead-agent/migrations/`)
- [ ] Confirm Telegram bot is connected and group privacy is OFF
- [ ] Confirm BD steward has DM'd the bot (unlocks notifications)
- [ ] Update `lead-agent/training/PLAYBOOK.md` with org-specific qualifying questions

## Database Setup

Your deployer should have provided `SUPABASE_URL` and `SUPABASE_ANON_KEY` as secrets. Run these migrations in the Supabase SQL Editor in order:

1. `lead-agent/migrations/001_create_initial_schema.sql` — conversations + opt_out tables
2. `lead-agent/migrations/002_create_leads_schema.sql` — leads + lead_events tables
3. `lead-agent/migrations/003_create_user_tracking.sql` — telegram_users table
4. `lead-agent/migrations/004_add_sponsor_opportunity_type.sql` — expanded opportunity types

## When Done

Delete this file. You're bootstrapped.
