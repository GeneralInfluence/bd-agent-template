# Template: Cold Intro — Event Meeting Request

**Use when:** Reaching out to a lead before a conference/event to set up a meeting.

## Merge Fields
- `{{recipientName}}` — Person's name (or "there" if unknown)
- `{{orgName}}` — Their organization
- `{{eventName}}` — Conference/event name
- `{{eventDates}}` — Event dates
- `{{senderName}}` — Your name
- `{{senderRole}}` — Your role
- `{{signal}}` — Why you're reaching out (something specific about their work)
- `{{calLink}}` — Calendar booking link (optional)

---

## Email

**Subject:** {{eventName}} — quick intro from RaidGuild

Hey {{recipientName}},

I'm {{senderName}}, {{senderRole}} at RaidGuild — a decentralized collective of builders (devs, designers, project managers) focused on the Ethereum ecosystem.

I noticed {{signal}}, and I'll be at {{eventName}} ({{eventDates}}). Would love to grab 15 minutes to chat about what you're building and whether there's a fit for collaboration.

Happy to work around your schedule — {{calLink}} or just reply here.

Cheers,
{{senderName}}

---

## Notes
- Keep the `{{signal}}` specific — reference their project, a recent tweet, a governance proposal, etc.
- If no calendar link, replace with "just reply with a time that works"
- Don't oversell RaidGuild — the goal is a conversation, not a pitch
