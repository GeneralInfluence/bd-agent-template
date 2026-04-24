# Ingestion: Meeting Notes

## Overview

After a call or meeting, the BD Steward pastes raw notes into the agent's chat. The agent extracts structured lead data, updates existing records, and logs events — turning unstructured text into Supabase objects.

## How It Works

### Paste and Extract

The steward pastes notes in any format:

> "Call with DeepChain Labs today. Talked to their PM @deepchain_pm. They want a cross-chain bridge UI + subgraph indexer. 12-week timeline. Budget is around $80k. They're evaluating two other shops. Proposal needed by end of month."

The agent:
1. Identifies which lead this maps to (or creates a new one)
2. Extracts: contact, description, timeline, budget signal, next action
3. Updates the lead record in Supabase
4. Logs a `note` event to `lead_events` with the raw text as context
5. Optionally sets a reminder if a follow-up date is mentioned

### Linking to a Lead

If the notes mention an existing lead, the agent matches by client name or contact handle. If no match, it offers to create a new lead.

The steward can also be explicit:
> "Update the DeepChain lead with these notes: [...]"

### Output

The agent confirms what it wrote:
```
✅ Updated: DeepChain Labs
  Status: proposal
  Description: Cross-chain bridge UI + subgraph indexer, 12-week, ~$80k
  Next action: Proposal by end of month
  Event logged: note
```

## Data Written to Supabase

| Table | What |
|-------|------|
| `leads` | Updated fields (description, notes, assigned_member, status) |
| `lead_events` | `note` event with raw notes in `details`, structured data in `metadata` |

## Tips for Better Extraction

The agent extracts best when notes include:
- **Who** — name and/or Telegram/Discord handle
- **What** — what they're building or need
- **Signal** — budget range, timeline, urgency
- **Next step** — what happens next and by when

Minimal format that works well:
```
Client: Acme Protocol / @acme_cto
Need: Smart contract audit before mainnet
Budget: ~$30k
Timeline: 6 weeks
Next: Send proposal by Friday
```

## File Attachments

If you have a document (proposal, brief, spec), you can share the link or paste the relevant sections. The agent will extract key details and store them in the lead's `notes` field and/or as a `metadata` entry in `lead_events`.

> File storage (S3/IPFS links in metadata) is supported. Raw file parsing is a future enhancement.

## Implementation

- Agent handles this via direct steward chat (see [direct-chat.md](direct-chat.md))
- Supabase writes: `workspace/bot/src/supabase.js`
- LLM extraction uses the same Anthropic client as the Telegram bot
