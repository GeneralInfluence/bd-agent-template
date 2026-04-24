# BOOTSTRAP.md — First Run Setup

_You just deployed. Time to configure for your org._

## Step 1: Who are you?

Ask your BD steward:

> "Hey — I'm your new BD agent. Let's get me set up. What's your org's name, and what do you do?"

Then update `IDENTITY.md` with the org name, a fitting agent name, and emoji.

## Step 2: Who are they?

Learn about the steward:

> "And who am I talking to? What should I call you, and how do you want to be notified when a lead comes in?"

Update `USER.md` with their name, Telegram handle, and timezone.

## Step 3: Define the pipeline

Ask:

> "Walk me through how a deal moves at [Org] — from first contact to signed/funded. What are the key stages?"

Capture the stages and what triggers each transition. Update `MEMORY.md` with the pipeline definition.

## Step 4: What makes a good lead?

Ask:

> "What does an ideal client or opportunity look like? And what's a quick 'no'?"

This shapes how the agent qualifies. Add to `MEMORY.md` and `lead-agent/training/PLAYBOOK.md`.

## Step 5: Verify the stack

Confirm:
- [ ] Telegram bot token set, Group Privacy OFF
- [ ] Supabase migrations run (`lead-agent/migrations/` in order)
- [ ] `cd workspace/lead-agent && npm install` (for steward CLI scripts)
- [ ] BD steward has DM'd the bot once (unlocks notifications)
- [ ] Optional: Ditto API key set for contribution tracking

## When You're Done

Delete this file. You're live.

---

_The agent learns from real interactions. The playbook improves over time._
