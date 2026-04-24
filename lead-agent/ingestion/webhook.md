# Ingestion: Webhook / Web Form

## Status: Planned

Webhook ingestion is not yet implemented. This stub documents the intended design.

## Intended Behavior

Any external system that can POST JSON can send a lead into the pipeline:

- **Contact forms** on your website → POST on submit
- **Event registration forms** → POST on signup
- **CRM integrations** → POST on new contact
- **Zapier / Make automations** → POST from any trigger

The bot exposes a lightweight HTTP endpoint that receives the POST, optionally passes it through the LLM for extraction/enrichment, and writes the result to Supabase.

## Payload Format (planned)

```json
{
  "client_name": "Acme Protocol",
  "client_contact": "@acme_founder",
  "description": "Interested in smart contract development",
  "opportunity_type": "new-raid",
  "source": "website-contact-form",
  "introducer": null,
  "notes": "Submitted via contact form on 2026-04-24"
}
```

All fields except `client_name` and `client_contact` are optional. The LLM can be invoked to enrich partial submissions.

## Security

- Requests must include a shared secret in the `X-BD-Webhook-Secret` header
- Set `WEBHOOK_SECRET` in `.env`
- Reject all requests without a valid secret

## Configuration (planned)

| Env var | Purpose |
|---------|---------|
| `WEBHOOK_PORT` | Port to listen on (default: 3000) |
| `WEBHOOK_SECRET` | Shared secret for request validation |

## Implementation Path

1. Add a lightweight HTTP server (Express or Fastify) to `workspace/bot/`
2. Create `workspace/bot/src/webhook-server.js` with a `/ingest` POST endpoint
3. Validate secret, parse body, write to Supabase via `supabase.js`
4. Optionally enrich via `llm.js` if description is thin
5. Notify steward via Telegram
6. Document setup in this file

> Note: If you're deploying behind a load balancer or serverless function, the webhook handler can be extracted as a standalone endpoint separate from the bot process.
