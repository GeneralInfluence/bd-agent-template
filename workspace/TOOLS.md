# TOOLS.md — Environment Notes

## Supabase

Credentials are injected as secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
Full API patterns: `lead-agent/skills/supabase-crm/SKILL.md`

## Telegram

Bot token managed by the Pinata runtime.
Group privacy must be **OFF** for the bot to read all group messages (not just mentions).
BD steward must DM the bot once to enable outbound notifications.

## BD Steward Telegram ID

_(Set this after bootstrap)_

```
BD_STEWARD_TELEGRAM_ID=
```
