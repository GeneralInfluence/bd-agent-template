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

## Playbook: Conference Lead Generation

When given a conference name, run these steps autonomously. No human input needed until review.

### Step 0 — Setup
1. Create a campaign file: `campaigns/<event-slug>.md`
2. Find the event website, dates, venue, and general info
3. Record event metadata at the top of the campaign file

### Step 1 — Ingest Speakers
1. Navigate to the event website's speakers page (try `/speakers`, `/schedule`, or find the link from the homepage)
2. Many conference sites are SPAs (Nuxt, Next.js, etc.) — if `web_fetch` returns empty/minimal content, use the **browser tool** to render the page and get a snapshot
3. Extract every speaker: **name, title/role, organization, and any linked URLs** (Twitter, LinkedIn, website)
4. If the site has a "View All" link or pagination, follow it to get the complete list
5. Record all speakers in the campaign file under a raw data section

### Step 2 — Ingest Sponsors & Partners
1. Look for a sponsors/partners section — check the homepage (often at the bottom), plus `/sponsors`, `/partners`, `/supporters`
2. For each sponsor, extract: **company name, tier/level (if shown), website URL, and logo link text**
3. Note the sponsor contact email if listed (e.g., `sponsor@event.com`)
4. Note the event organizer(s) — they're often listed in the footer
5. Record all sponsors in the campaign file

### Step 3 — Research People & Organizations
For each sponsor and notable speaker org, research key people and contact info:

1. **Company website** — Check `/about`, `/team`, `/company` pages for leadership names and roles
2. **If website is an SPA** (Framer, Nuxt, etc.) and `web_fetch` returns CSS/JS garbage, use the **browser tool**
3. **Twitter/X** — Search for the company account; key people are often listed in bio or pinned tweets
4. **LinkedIn** — Note LinkedIn URLs found on company sites (don't scrape LinkedIn directly)
5. **GitHub** — For open-source projects, check the org page for core maintainers
6. **Farcaster/Warpcast** — Check for web3-native projects

For each person identified, record:
- Full name (or pseudonym if that's all that's public)
- Role/title
- Organization
- Contact channels (Twitter handle, LinkedIn URL, email if public, website)

**Priority order for research depth:**
1. Sponsors (especially top-tier) — full research
2. Speaker orgs that look like they need dev services — full research
3. Academic/community partners — light research (usually not commercial leads)
4. Event organizers — capture contacts (useful for intros)

### Step 4 — Qualify & Classify
For each person/org, assess:

**Qualification questions:**
- Does this org plausibly need external dev/design services?
- Are they a small team that can't build everything in-house?
- Do they have funding (VC-backed, DAO treasury, grants)?
- Are they building something that matches RaidGuild's skills (smart contracts, frontend, design, tokenomics, audits)?
- Is there values alignment (Ethereum-native, open source, public goods)?

**Classify each lead:**
- Opportunity type: New Raid | Recruiting | New Venture
- Category: DeFi, DAO Tooling, Infrastructure, Privacy, Public Goods, etc.
- Priority: High (strong fit + likely need) | Medium (potential fit) | Low (networking value)

**Disqualify** leads that are:
- Direct competitors to RaidGuild
- Purely academic with no dev budget
- Too large to use a DAO for dev work (e.g., Coinbase, Google)
- Not building on Ethereum or EVM chains

### Step 5 — Prioritize & Structure Output
1. Sort leads into priority tiers (High / Medium / Low / Networking Only)
2. For High priority leads, write a brief **signal** (why they're a lead) and **next_action**
3. Create a campaign timeline with milestones:
   - Research phase (now → 6 weeks before event)
   - Outreach drafting (5-4 weeks before)
   - Outreach sending (4-2 weeks before)
   - Meeting confirmation (2-1 weeks before)
   - Event execution
   - Follow-up (1 week after)
4. Flag any **contact info gaps** that need deeper research

### Step 6 — Gap Filling
For leads with missing contact info:
1. Try the company's blog or press page for author names
2. Check governance forums (Snapshot, Tally, Commonwealth) for active contributors
3. Search Twitter for "[company name] founder" or "[company name] CEO"
4. Check conference speaker bios more carefully (some list Twitter/LinkedIn)
5. Note what's still missing so a human can fill gaps via warm intros

---

## Tips & Gotchas

- **SPA websites:** Many crypto project sites use Framer, Nuxt, or Next.js. `web_fetch` often returns garbage CSS. Always fall back to the **browser tool** for these.
- **Pseudonyms are normal:** In crypto, many people go by handles. Record the pseudonym + any real name if findable. Don't skip a lead just because you only have a Twitter handle.
- **Sponsor tiers matter:** Top-tier sponsors have more budget and likely more dev needs. Research them more deeply.
- **Event organizers are connectors:** They know everyone. Capture their info for potential warm intros.
- **Don't duplicate work:** Before researching, check if a lead already exists in another campaign file.
- **Save raw data:** Keep a raw section in the campaign file with everything scraped, even if it's not all qualified. Future campaigns may reference it.

---

## Campaign Index
- [ETH Prague 2026](campaigns/eth-prague-2026.md)
