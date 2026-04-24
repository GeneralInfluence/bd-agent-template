# Ingestion: Email

## Status: Planned

Email ingestion is not yet implemented. This stub documents the intended design.

## Intended Behavior

Inbound emails to a designated BD address (e.g. `bd@yourorg.com`) are processed by the agent:

1. Email arrives at a monitored inbox
2. Agent parses: sender, subject, body
3. LLM determines if it's a potential lead or relevant BD contact
4. If yes: creates a lead in Supabase, notifies BD Steward
5. If no: discards or logs as a note

## Use Cases

- Contact form submissions forwarded to BD inbox
- Direct outreach from potential clients
- Intro emails from mutual contacts
- Conference follow-ups ("Great meeting you at ETH Prague...")

## Design Notes

- Polling approach: check inbox every N minutes via IMAP or a mail service API
- Recommended: [Postmark Inbound](https://postmarkapp.com/inbound) or [Mailgun Routes](https://www.mailgun.com/products/receive/routes/) → POST to a webhook endpoint
- Alternative: Gmail API polling with a service account
- The lead extraction prompt should be the same as meeting notes — same LLM, same output format

## Configuration (planned)

| Env var | Purpose |
|---------|---------|
| `EMAIL_PROVIDER` | `postmark`, `mailgun`, or `imap` |
| `EMAIL_INBOUND_WEBHOOK_SECRET` | Webhook signature verification |
| `EMAIL_BD_ADDRESS` | The monitored inbox address |

## Implementation Path

1. Choose an email provider (Postmark Inbound recommended — simple webhook, no server needed)
2. Add inbound webhook handler to `workspace/bot/src/email.js`
3. Route POST from provider → lead extraction via `llm.js`
4. Write confirmed leads to Supabase via `supabase.js`
5. Notify steward via Telegram
6. Document setup in this file
