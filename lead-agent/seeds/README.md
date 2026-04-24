# Seeds — BD Agent Object Store

Seeds populate the Supabase database with the **objects and subjects** your BD Agent needs to function: leads, raids, and their event histories.

## Architecture

| Layer | Master | What it holds |
|-------|--------|---------------|
| **Supabase** (this) | Objects | People, leads, raids — structured records |
| **Ditto** | Relationships | Who contributed to what, in what role |
| **GitHub branch** | Context | Links, playbooks, style, lessons, mistakes |

Seeds are the **recoverable state** of your pipeline. Wipe the database, re-run seeds, and the agent boots up knowing everything it knew before.

## Directory

```
seeds/
  001_seed_org_config.sql     ← org identity + steward config
  002_seed_sample_leads.sql   ← example leads at each pipeline stage
  003_seed_active_raids.sql   ← example active engagements
  export-seeds.js             ← dump current DB state back to seed files
  README.md                   ← this file
```

## Running Seeds

Seeds are idempotent — safe to re-run. They use `ON CONFLICT DO NOTHING` so existing records are never overwritten.

```bash
# Run all seeds in order
psql $DATABASE_URL -f seeds/001_seed_org_config.sql
psql $DATABASE_URL -f seeds/002_seed_sample_leads.sql
psql $DATABASE_URL -f seeds/003_seed_active_raids.sql

# Or using Supabase CLI
supabase db reset --linked   # runs migrations then seeds
```

## Exporting Current State

When your pipeline evolves (new leads, status changes), export the current DB state back to seed files so the branch stays recoverable:

```bash
node seeds/export-seeds.js
```

This overwrites the seed files with current DB state. Commit the result.

## Forking for a New Org

1. Fork the `template` branch
2. Replace seed data with your org's real data
3. Update `lead-agent/ingestion/` with your active channels
4. Run seeds against your Supabase instance
5. Deploy bot with your `.env`

Your seeds + GitHub branch = complete, reboottable BD Agent for your org.
