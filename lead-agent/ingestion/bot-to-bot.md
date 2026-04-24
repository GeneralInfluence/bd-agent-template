# Ingestion: Bot-to-Bot

## Status: Post-Template

Bot-to-bot ingestion is planned after the template is stable. This stub documents the intended design.

## Problem

Organizations often have multiple bots operating in the same Telegram or Discord workspace:
- A **meeting notes bot** that summarizes calls
- A **file bot** that indexes documents and links
- A **summary bot** that digests long threads
- A **CRM bot** or **project management bot**

These bots produce data that is relevant to the BD pipeline — but the BD Agent currently has no way to consume it.

## Intended Behavior

The BD Agent listens for structured messages posted by known/trusted bots in shared channels. When a trusted bot posts data that contains lead-relevant information, the BD Agent ingests it.

### Example Flow

1. A meeting notes bot posts a summary to `#bd-updates`:
   > `[MeetingBot] Summary: Call with Acme Protocol on 2026-04-24. Discussed smart contract audit scope. Budget ~$40k. Next step: proposal by Friday. Participants: @acme_cto, @member_handle`

2. The BD Agent recognizes this is from a trusted bot and contains lead data
3. Agent passes the message through the LLM with the lead extraction prompt
4. Extracted data is merged into the existing Acme Protocol lead (or creates a new one)
5. A `note` event is logged to `lead_events` with the source bot identified in `metadata`

## Design Considerations

- **Trust model:** Only specific bot user IDs are trusted sources. Config-driven allowlist.
- **Channel routing:** Different bots post in different channels. Agent needs to know which channels to watch for bot output.
- **Structured vs. unstructured:** Some bots post JSON, others post natural language. LLM handles both.
- **Deduplication:** The same event shouldn't create duplicate lead entries.
- **Org-specific:** Which bots exist varies by org — this must be configurable, not hardcoded.

## Configuration (planned)

```env
# Comma-separated Telegram user IDs of trusted bots
TRUSTED_BOT_IDS=123456789,987654321

# Channels to monitor for bot output (Telegram group IDs)
BOT_OUTPUT_CHANNEL_IDS=-1001234567890,-1009876543210
```

## Implementation Path

1. Extend `bot.js` message handler to check if sender is in `TRUSTED_BOT_IDS`
2. If yes, pass message to LLM with lead extraction prompt (same as meeting notes)
3. Merge result into Supabase (match existing lead or create new)
4. Log `note` event with `metadata.source_bot = <bot_id>`
5. Document configuration in this file
