# Ingestion: Telegram Group Bot

## Overview

The primary ingestion channel. The BD Agent lives in Telegram group chats as a bot. When a potential client is introduced into a group, the agent handles the conversation, qualifies the lead, and writes it to Supabase.

## How It Works

### 1. Warm Intro Group
A friend of the org adds the bot to a Telegram group with a potential client. The introducer says something like:

> "Hey, this is @acme_founder — they're building a DeFi lending protocol and might need some dev help."

The bot detects it's been mentioned or that a new person has joined, and engages naturally.

### 2. LLM Qualification
The bot calls the LLM with:
- The conversation history for that group
- The org's playbook (`lead-agent/training/PLAYBOOK.md`) as context
- The org's identity files (`SOUL.md`, `IDENTITY.md`) for tone/style

The LLM asks one question at a time to qualify the lead — what they're building, what they need, timeline, budget signal.

### 3. Lead Confirmation
When the LLM has enough info, it includes a `lead_confirmed` JSON block in its reply:

```
```lead_confirmed
{
  "client_name": "Acme Protocol",
  "client_contact": "@acme_founder",
  "introducer": "Alice",
  "description": "DeFi lending protocol on EVM, needs smart contract dev + frontend",
  "opportunity_type": "new-raid"
}
```
```

The bot parses this, writes the lead to Supabase, and notifies the BD Steward via DM.

### 4. Steward Notification
The BD Steward receives a Telegram DM:
```
🌀 New Lead

Acme Protocol
Type: new-raid
Introducer: Alice
Contact: @acme_founder

DeFi lending protocol on EVM, needs smart contract dev + frontend

`<lead-id>`
```

## Trigger Conditions

The bot invokes the LLM when:
- The bot is @mentioned in a message
- The bot is added to a new group (my_chat_member event)
- A member uses `/ask`

All other messages are logged cheaply (user upsert to `telegram_users`) without LLM.

## Data Written to Supabase

| Table | What |
|-------|------|
| `telegram_users` | Every user seen in any group (lightweight, no LLM) |
| `leads` | Confirmed leads from LLM qualification |
| `lead_events` | `intro` event on creation |

## Configuration

| Env var | Purpose |
|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `BD_STEWARD_TELEGRAM_ID` | Steward's Telegram user ID — receives DM notifications |
| `ANTHROPIC_API_KEY` | LLM for qualification conversations |
| `SUPABASE_URL` | Database |
| `SUPABASE_ANON_KEY` | Database auth |

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) → get token
2. Set `TELEGRAM_BOT_TOKEN` in `.env`
3. Find your Telegram user ID via [@userinfobot](https://t.me/userinfobot) → set `BD_STEWARD_TELEGRAM_ID`
4. Add the bot to your intro group(s)
5. The bot needs **group message** permissions — disable Privacy Mode in BotFather settings

## Implementation

- Bot framework: [Grammy.js](https://grammy.dev)
- Entry point: `workspace/bot/bot.js`
- LLM logic: `workspace/bot/src/llm.js`
- Supabase writes: `workspace/bot/src/supabase.js`
