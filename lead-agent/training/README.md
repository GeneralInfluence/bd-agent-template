# Training & Feedback System

## How It Works

1. **Cohort participants** make test warm introductions via Telegram
2. **BizDev bot** handles the conversation (best effort)
3. **Sean (or any reviewer)** critiques the interaction
4. **Feedback is logged** in this directory and in Supabase
5. **Bot behavior improves** — lessons feed into PLAYBOOK.md

## Directory Structure

```
training/
  README.md              ← you are here
  PLAYBOOK.md            ← living document: how to handle intros (updated from feedback)
  LESSONS.md             ← accumulated lessons learned, indexed by date
  sessions/
    YYYY-MM-DD-<slug>.md ← individual interaction reviews
```

## Review Workflow

Sean (or reviewer) can trigger a review by saying something like:
- "Review the intro from [person] today"
- "How did we handle the [X] conversation?"
- "Critique your last interaction"

The bot will:
1. Pull the conversation from Supabase (lead + events + messages)
2. Present a summary
3. Ask for feedback
4. Log the feedback to `training/sessions/` and update `LESSONS.md`
5. If the lesson changes behavior, update `PLAYBOOK.md`

## Supabase Integration

Feedback is also stored as `lead_events` with `event_type: 'note'` and metadata:
```json
{
  "type": "training_feedback",
  "reviewer": "Sean",
  "rating": "needs-improvement|acceptable|good|excellent",
  "feedback": "free text",
  "lesson": "what to do differently"
}
```
