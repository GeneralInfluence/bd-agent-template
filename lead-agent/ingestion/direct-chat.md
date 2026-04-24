# Ingestion: Direct Steward Chat

## Overview

The BD Steward can talk directly to the agent via the OpenClaw web chat (or any configured chat channel). This is how the steward enters leads manually, asks questions about the pipeline, updates records, and runs BD operations that don't originate from a Telegram group.

## How It Works

The steward opens the agent's chat interface and types naturally. The agent has full access to:
- Supabase (read/write leads, raids, events)
- Ditto (relationship graph)
- PrismBOT (org community memory, member verification)
- GitHub context files (playbooks, SOUL.md, IDENTITY.md)

### Example interactions

**Adding a lead from a conference:**
> "I met someone at ETH Prague — Josef from PWN DAO. They might need dev help with their lending protocol. Add them as a warm lead."

**Updating a lead:**
> "The Acme Protocol lead is now qualified. Assign it to @member_handle."

**Pipeline review:**
> "What's the current status of everything in proposal stage?"

**Taking meeting notes:**
> "We just had a call with DeepChain Labs. Here are my notes: [paste notes]"
> The agent extracts structured data and updates the lead (see [meeting-notes.md](meeting-notes.md)).

## Steward Commands (Telegram DM)

When the steward DMs the bot directly on Telegram, they also have access to slash commands:

| Command | What it does |
|---------|-------------|
| `/pipeline` | View all active leads |
| `/add` | Add a new lead (conversational) |
| `/update <id> <field> <value>` | Update a lead field |
| `/note <id> <text>` | Add a note to a lead |
| `/confirm <id>` | Mark a lead as qualified |
| `/close <id> [won\|lost\|stale]` | Close a lead |
| `/query <question>` | Search Prism + pipeline |
| `/remind YYYY-MM-DD <text>` | Set a follow-up reminder |
| `/reminders` | List pending reminders |

## Data Written to Supabase

Whatever the steward asks the agent to do — create, update, annotate leads and raids. All writes go through the same Supabase client used by the Telegram bot.

## Configuration

No additional configuration beyond the base bot setup. The steward's Telegram ID must be set in `BD_STEWARD_TELEGRAM_ID` for command access.

## Implementation

- Steward commands: `workspace/bot/src/steward.js`
- Chat interface: OpenClaw webchat or configured messaging channel
- The agent (this codebase) handles natural language requests directly
