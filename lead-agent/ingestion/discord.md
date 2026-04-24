# Ingestion: Discord Bot

## Status: Planned

Discord ingestion is not yet implemented. This stub documents the intended design.

## Intended Behavior

Same pattern as Telegram ([telegram.md](telegram.md)), but for Discord servers:

- Bot joins a Discord server and listens in designated channels
- When a potential client is introduced (or @mentions the bot), the LLM qualifies them
- Confirmed leads are written to Supabase
- BD Steward is notified (via Discord DM or Telegram, depending on org preference)

## Design Notes

- Framework: [discord.js](https://discord.js.org) or [Eris](https://abal.moe/Eris/)
- The bot should support the same trigger model as Telegram: @mention, join event, or `/ask`
- Steward slash commands should mirror the Telegram command set
- Some orgs may use Discord as primary and Telegram as secondary — the ingestion layer should be channel-agnostic

## Configuration (planned)

| Env var | Purpose |
|---------|---------|
| `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_GUILD_ID` | Server ID to listen on |
| `DISCORD_INTRO_CHANNEL_ID` | Channel(s) where warm intros happen |

## Implementation Path

1. Register a Discord application + bot in the [Developer Portal](https://discord.com/developers/applications)
2. Add `discord.js` to `workspace/bot/package.json`
3. Create `workspace/bot/src/discord.js` mirroring the Grammy.js bot structure
4. Share the same `supabase.js`, `llm.js`, and `steward.js` modules
5. Update `bot.js` to start both Telegram and Discord listeners
6. Document setup in this file
