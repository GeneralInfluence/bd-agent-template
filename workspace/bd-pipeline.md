# RaidGuild Business Development Pipeline

## Overview

Three stages: **Warm Introduction → Formal Proposal → Funded Raid**

---

## Stage 1: Warm Introduction

**Who can do this:** Anyone (friends of RaidGuild, cohort members, members, public)

**What it is:** Someone introduces a potential client to RaidGuild through the bot.

**How it happens:**
- **Telegram/Discord:** A person creates a group chat or channel with themselves, the potential client, and @RaidGuild_bot
- **Email:** (Future state — not yet configured) An email between two people the bot has access to

**Bot behavior when added to a group:**
1. Acknowledge the introduction
2. Ask for confirmation that this is a warm intro / BD opportunity
3. Ask permission to share the potential client's information with a RaidGuild member
4. Log the opportunity and track it

**Status:** `warm-intro` → waiting for a verified member to pick it up

---

## Stage 2: Formal Proposal

**Who can do this:** Verified RaidGuild members only

**What it is:** A member submits a formal proposal to an established potential client.

**Verification:** A RaidGuild member must have been approved via a RIP (Raid Guild Improvement Proposal). RIPs are tracked at: https://github.com/raid-guild/RIPs

**How it works:**
- The proposal format varies — it depends on the relationship between the member and the prospective client
- The important part: the member submits it to the client as a formal proposal
- The member shares **proof of submission** with this bot (screenshot, forwarded message, link, etc.)

**Bot behavior:**
1. Verify the submitter is a RaidGuild member
2. Accept and log proof of proposal submission
3. Update the opportunity status

**Status:** `proposal-submitted` → waiting for client to fund

---

## Stage 3: Funded Raid

**Who triggers this:** The client (confirmed by RaidGuild Treasurer)

**What it is:** The client transfers funds to RaidGuild, converting the proposal into an official Raid.

**How payment works:**
- **On-chain:** Transfer to the RaidGuild wallet (potentially monitorable)
- **Off-chain:** Bank transfer (requires manual verification by the RaidGuild Treasurer)

**Bot behavior:**
1. Accept confirmation from the Treasurer that payment was received
2. Mark the opportunity as a funded Raid

**Status:** `funded-raid` → active Raid

---

## Roles

| Role | Can do |
|------|--------|
| **Anyone** | Create warm introductions |
| **Verified RaidGuild Member** | Submit formal proposals (must have approved RIP) |
| **RaidGuild Treasurer** | Confirm payment received |
| **BD Steward (Aphilos)** | Oversee pipeline, configure bot |

## Open Questions / Future State

- [ ] Email integration for warm intros
- [ ] On-chain wallet monitoring for automatic payment detection
- [ ] Member verification method (Discord role check? On-chain? Manual list?)
- [ ] What structured data to collect during warm intro (project type, budget, timeline?)
- [ ] How to handle stale opportunities (auto-follow-up? expiry?)
