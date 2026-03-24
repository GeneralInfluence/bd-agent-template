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
source:         # Where we found them
event:          # Conference/event if applicable
status:         # Theoretical | Outreach Attempted | Warm
next_action:    # Suggested next step
```

## Process
1. **Ingest** — Scan event pages, speaker lists, sponsor lists, social media, governance forums
2. **Qualify** — Does this person/org plausibly need RaidGuild services?
3. **Classify** — Opportunity type + category
4. **Prioritize** — Based on fit, timing, accessibility
5. **Output** — Structured lead records ready for outreach planning

## Current Campaign
- **ETH Prague 2026** (May 8-10, Prague)
- Focus: Identify speakers, sponsors, and attendees for Sean to meet in person
- Timeline: Outreach should begin 2-4 weeks before event
