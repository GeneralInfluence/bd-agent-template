# Ditto Knowledge Graph Skill

## Purpose
Log every BD opportunity to Ditto as a **contribution ledger** — so when a deal closes and compensation flows (cash, equity, or tokens), there is a clear, queryable record of who contributed and in what capacity.

## Environment
- `DITTO_API_KEY` — Bearer token for Ditto MCP API
- MCP config: `config/mcporter.json` (managed via `npx mcporter`)

## Tool Access
Use `npx mcporter call ditto.<tool>` from the workspace root.

Available tools:
| Tool | Use |
|------|-----|
| `save_memory` | Log a new update to the knowledge graph |
| `search_memories` | Find memories by semantic similarity |
| `search_subjects` | Search the subject/topic graph |
| `search_memories_in_subjects` | Get memories linked to specific subjects |
| `fetch_memories` | Get full memory content by ID |
| `get_memory_network` | Explore related memory connections |

## Core Principle: Work is the Subject, People are Contributors

**Never use a person's name as the primary subject.** The subject is always the work — the specific business opportunity. People are listed as named contributors with explicit roles.

This is critical because Ditto is a **contribution ledger**, not a contact book. When a deal closes, the knowledge graph determines who gets rewarded and how much.

### Opportunity Types (valid subjects)
- **Cohort Sponsorship** — an org sponsoring a RaidGuild cohort
- **Raid / Contract** — client development or design work
- **Recruiting for a Sponsor** — talent placement via cohorts
- **Cohort Attendee Recruiting** — finding people to join a cohort
- **New Venture** — partnership, co-creation, or spin-out opportunity

## Required Log Format

Every `save_memory` call MUST use this structure:

```
Ditto, here is an update for the memory graph: [Opportunity Type] — [Client/Org Name], involving [comma-separated contributor names].

Current status: [status]. Next step: [who does what by when].

Contributors and roles:
- [Full Name / Handle] is the LEAD on this opportunity. [Brief role description.]
- [Full Name / Handle] contributed as [role: co-developer / introducer / proposal author / finance intel / recruiter / etc.].
- [Full Name / Handle] is the introducer — [brief context].
- ...

Note: [Anyone explicitly NOT a contributor, with reason — e.g., warm contact who routed but did not contribute to the work.]

Proposal/reference: [URL if applicable]
```

### Contributor Role Vocabulary
Use consistent role labels so compensation calculations are comparable across opportunities:

| Role | Meaning |
|------|---------|
| `LEAD` | Owns the opportunity end-to-end |
| `proposal-author` | Wrote the proposal |
| `concept-developer` | Developed the core offering/product |
| `finance-intel` | Provided budget/financial intelligence on the client |
| `proposal-contributor` | Contributed to proposal development |
| `introducer` | Made the warm introduction |
| `recruiter` | Sourced talent or cohort attendees |
| `warm-contact` | Helped route the relationship but not a contributor to the work |

## Example

```
Ditto, here is an update for the memory graph: Cohort Sponsorship — Livepeer Foundation, involving Sean Gonzalez, @dekanbro, Tae, @ECWireless, @vengist, Mehrdad.

Current status: Proposal submitted ($50k ask). Next step: Sean to contact Rich (Director, Livepeer Foundation) on April 14 2026.

Contributors and roles:
- Sean Gonzalez (Aphilos) is the LEAD. He is the proposal author and primary developer of Cohorts as a Service (CaaS). Livepeer is the first CaaS pitch.
- @dekanbro (RaidGuild) contributed as concept-developer of CaaS.
- Tae (RaidGuild) contributed as concept-developer of CaaS.
- @ECWireless (RaidGuild) contributed as proposal-contributor.
- @vengist (RaidGuild) contributed as finance-intel — running an active Raid with Livepeer, informed the $50k ask.
- Mehrdad (@mehrdad_mms, RaidGuild) is the introducer — connected Sean to Livepeer.

Note: Nick Hollins (formerly Livepeer Foundation) is a warm-contact only — he routed the relationship to Rich but is not a contributor to this work.

Proposal: https://docs.google.com/document/d/1JeHGqTu1HDupqkwwCPO8BmOuREctuIGe/edit
```

## When to Log

Log to Ditto whenever:
- A new opportunity is identified
- A contributor joins or their role changes
- Status changes (proposal submitted, funded, closed, etc.)
- New intelligence is learned about the client or opportunity
- A deal closes — final contributor list must be accurate before compensation is calculated
