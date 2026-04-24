# Seeds — Supabase Object Recovery

Seeds populate the Supabase database with the **objects** your BD Agent needs: leads, raids, and their event histories.

## Architecture

| Layer | Purpose |
|-------|---------|
| **Supabase** | Objects — people, leads, raids (structured records) |
| **Ditto** | Relationships — who contributed to what, in what role |
| **GitHub branch** | LLM context — playbooks, style, lessons, instructions |

Seeds belong to **Supabase only**. GitHub context files are loaded by the LLM at runtime — they don't need to be seeded into the database.

## What Seeds Are For

Seeds are the **recoverable object state** of your pipeline. If Supabase is wiped or you're deploying fresh, re-run seeds and the agent's leads and raids are restored.

They are *not* a substitute for Supabase as the live source of truth — the bot writes to Supabase continuously. Seeds are a snapshot that can be regenerated at any time.

## Directory

```
seeds/
  001_seed_org_config.sql     ← BD Steward + member telegram_users
  002_seed_sample_leads.sql   ← leads at each pipeline stage
  003_seed_active_raids.sql   ← active engagements
  export-seeds.js             ← dump current Supabase state → seed files
  README.md                   ← this file
```

## Running Seeds

Seeds are idempotent — safe to re-run. They use `ON CONFLICT DO NOTHING` so existing records are never overwritten.

```bash
# Requires psql and DATABASE_URL, or use Supabase dashboard SQL editor
psql $DATABASE_URL -f seeds/001_seed_org_config.sql
psql $DATABASE_URL -f seeds/002_seed_sample_leads.sql
psql $DATABASE_URL -f seeds/003_seed_active_raids.sql
```

## Keeping Seeds Current

When your pipeline evolves, regenerate seed files from the live database:

```bash
node seeds/export-seeds.js
# Then commit the result to your branch
```

## Forking for a New Org

1. Fork the `template` branch → create your org's branch
2. Replace seed data with your org's real leads and raids
3. Configure `lead-agent/ingestion/` for your active channels
4. Set up `.env` with your credentials
5. Run migrations, then seeds, against your Supabase instance
