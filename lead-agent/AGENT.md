# Lead Agent — BD Funnel Stage 1

## Purpose
Identify **theoretical leads** — people and organizations that may be interested in RaidGuild services but have not yet been contacted or introduced.

## Opportunity Types
- **New Raids** — Development/design work for a client
- **Recruiting** — Talent interested in joining RaidGuild
- **New Ventures** — Partnership or co-creation opportunities

## What Is a Theoretical Lead?
A person or org identified as a potential fit for RaidGuild services based on:
- Their project needs (smart contracts, frontend, design, audits, tokenomics)
- Alignment with RaidGuild values (Ethereum-native, public goods, solarpunk)
- Presence at events where RaidGuild members will be
- No existing relationship or confirmed introduction

## Lead Record Schema
```yaml
name:           # Person name
org:            # Organization/project
role:           # Their role
opportunity:    # New Raid | Recruiting | New Venture
category:       # e.g., DeFi, DAO Tooling, Privacy, Infrastructure
signal:         # Why they're a lead (what we noticed)
priority:       # High | Medium | Low
source:         # Where we found them (speakers, sponsors, social, etc.)
contact:        # Known contact info (Twitter, LinkedIn, email, website)
event:          # Conference/event if applicable
status:         # Theoretical | Outreach Attempted | Warm
next_action:    # Suggested next step
```

---

## Playbooks

Playbooks are step-by-step autonomous workflows the agent can run with minimal human input.

| Playbook | Use When | File |
|----------|----------|------|
| **Conference Lead Gen** | Preparing for a conference/event | [playbooks/conference-leads.md](playbooks/conference-leads.md) |
| **Email Outreach Campaign** | Bulk outreach to a scraped/curated list | [playbooks/email-outreach-campaign.md](playbooks/email-outreach-campaign.md) |

---

## Campaigns

Each campaign gets its own file tracking leads, status, and timeline.

| Campaign | Type | Status | File |
|----------|------|--------|------|
| ETH Prague 2026 | Conference | Research phase | [campaigns/eth-prague-2026.md](campaigns/eth-prague-2026.md) |
| UNR Cohort Outreach 2026 | Email Outreach | Outreach sent | [campaigns/unr-cohort-2026.md](campaigns/unr-cohort-2026.md) |

---

## Templates

Reusable email/message templates with merge fields.

| Template | Purpose | File |
|----------|---------|------|
| Cold Intro (Event) | Pre-conference meeting request | [templates/cold-intro-event.md](templates/cold-intro-event.md) |
| Cold Intro (General) | Non-event outreach to potential clients | [templates/cold-intro-general.md](templates/cold-intro-general.md) |
| Follow-up | Post-outreach follow-up | [templates/follow-up.md](templates/follow-up.md) |
| Cohort/Community Intro | Outreach to university/community orgs | [templates/cohort-community-intro.md](templates/cohort-community-intro.md) |

---

## Scripts

Automation scripts for data processing.

| Script | Purpose | File |
|--------|---------|------|
| `filter-orgs.js` | Filter raw org data by relevance keywords | [scripts/filter-orgs.js](scripts/filter-orgs.js) |
| `generate-outreach-csv.js` | Build outreach CSV from filtered data | [scripts/generate-outreach-csv.js](scripts/generate-outreach-csv.js) |

---

## Tips & Gotchas

- **SPA websites:** Many crypto project sites use Framer, Nuxt, or Next.js. `web_fetch` often returns garbage CSS. Always fall back to the **browser tool** for these.
- **Pseudonyms are normal:** In crypto, many people go by handles. Record the pseudonym + any real name if findable. Don't skip a lead just because you only have a Twitter handle.
- **Sponsor tiers matter:** Top-tier sponsors have more budget and likely more dev needs. Research them more deeply.
- **Event organizers are connectors:** They know everyone. Capture their info for potential warm intros.
- **Don't duplicate work:** Before researching, check if a lead already exists in another campaign file.
- **Save raw data:** Keep a raw section in the campaign file with everything scraped, even if it's not all qualified. Future campaigns may reference it.
