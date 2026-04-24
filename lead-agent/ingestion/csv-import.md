# Ingestion: CSV / Spreadsheet Import

## Overview

Bulk lead ingestion from a CSV file or spreadsheet. Used when you have a list of contacts — conference attendees, outreach targets, cohort applicants — that you want to load into the pipeline at once.

## How It Works

### Prepare the CSV

Minimum required columns:

| Column | Required | Notes |
|--------|----------|-------|
| `client_name` | ✅ | Org or person name |
| `client_contact` | ✅ | Telegram handle, email, or other identifier |
| `description` | ✅ | What they need / why they're a lead |
| `opportunity_type` | ✅ | `new-raid`, `recruiting`, `new-venture`, `cohort-sponsorship`, `other` |
| `introducer` | optional | Who referred them |
| `source` | optional | `event`, `referral`, `outreach`, `cohort`, etc. |
| `priority` | optional | `high`, `medium`, `low` (defaults to `medium`) |
| `notes` | optional | Free-form context |

### Run the Import Script

```bash
# From workspace/bot/
node scripts/import-leads.js --file path/to/leads.csv --status warm-intro

# Options:
#   --file     Path to CSV file (required)
#   --status   Initial status for all rows (default: warm-intro)
#   --dry-run  Preview what would be imported without writing
```

### What the Script Does

1. Parses the CSV
2. Validates required fields — skips rows with missing `client_name` or `client_contact`
3. Checks for duplicates (by `client_contact`) — skips if already in `leads`
4. Inserts new leads with `status: warm-intro` (or specified status)
5. Logs an `intro` event for each lead with `source` set to the CSV filename
6. Prints a summary: X inserted, Y skipped (duplicate), Z skipped (missing fields)

### Example CSV

```csv
client_name,client_contact,description,opportunity_type,source,priority,notes
Acme Protocol,@acme_founder,DeFi lending protocol needs smart contract dev,new-raid,eth-prague-2026,high,Met at ETH Prague
BlockCo DAO,@blockco_cto,Governance module + token distribution,new-raid,referral,medium,Intro from Bob
Deep Work Studio,@deepwork_design,Product design DAO — potential collaboration,new-venture,outreach,low,Values-aligned
```

## Import Script

The import script lives at:
```
workspace/bot/scripts/import-leads.js
```

> **Note:** This script does not yet exist — it is scaffolded here as a required ingestion method for the template. Implement before first bulk import.

```javascript
// Scaffold: workspace/bot/scripts/import-leads.js
// Usage: node scripts/import-leads.js --file leads.csv [--status warm-intro] [--dry-run]
//
// Dependencies: csv-parse, @supabase/supabase-js
// Install: npm install csv-parse
```

## Existing Example: UNR Cohort Outreach

The RaidGuild BD Agent used this pattern to load ~214 University of Nevada Reno student organizations for cohort outreach. The pipeline:

1. Fetched org data from CampusLabs Engage API
2. Filtered by relevance keywords (STEM, CS, business)
3. Enriched with emails by scraping individual org pages
4. Exported to CSV (`unr-cohort-outreach.csv`)
5. Loaded into pipeline as `warm-intro` outreach leads

See `lead-agent/campaigns/unr-cohort-2026.md` for the full walkthrough.

## Data Written to Supabase

| Table | What |
|-------|------|
| `leads` | One row per CSV row (deduplicated by `client_contact`) |
| `lead_events` | `intro` event per lead, `details` = CSV source filename |
