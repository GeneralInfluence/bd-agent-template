# Ingestion Methods

This directory documents how data enters the BD Agent — how leads, context, and events get from the real world into Supabase.

## Active Methods

| Method | File | Status |
|--------|------|--------|
| Telegram group bot | [telegram.md](telegram.md) | ✅ Active |
| Direct steward chat | [direct-chat.md](direct-chat.md) | ✅ Active |
| Meeting notes | [meeting-notes.md](meeting-notes.md) | ✅ Active |
| CSV / spreadsheet import | [csv-import.md](csv-import.md) | ✅ Active |

## Planned Methods

| Method | File | Status |
|--------|------|--------|
| Discord bot | [discord.md](discord.md) | 🔲 Stub |
| Email | [email.md](email.md) | 🔲 Stub |
| Webhook / web form | [webhook.md](webhook.md) | 🔲 Stub |
| Bot-to-bot | [bot-to-bot.md](bot-to-bot.md) | 🔲 Stub |

## Data Flow

All ingestion methods write to **Supabase** (the object layer):
- New leads → `leads` table
- Activity → `lead_events` table
- People → `telegram_users` table

The **LLM context** (playbooks, style, instructions) lives in GitHub and is loaded at runtime — it is not ingested into the database.

Relationship data (who contributed to what) flows to **Ditto** via the poller and steward commands.

## Adding a New Ingestion Method

1. Create a `[method].md` file in this directory
2. Describe: trigger, data captured, how it writes to Supabase
3. Add the corresponding bot handler or script in `workspace/bot/src/`
4. Update this README
