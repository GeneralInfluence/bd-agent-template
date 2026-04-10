# Setting Up the Supabase Webhook

This connects your Supabase database to your bot so that every time a lead is created or updated, the bot automatically:
- Notifies you (the BD steward) via Telegram
- Logs the update to your Ditto knowledge graph

**No coding required.** Just a few clicks in the Supabase dashboard.

---

## Before You Start

You'll need:
- Your bot's server address (the URL or IP where the bot is running)
- The `WEBHOOK_SECRET` value you set in your `.env` file
  - If you haven't set one yet: make up any random string (e.g. `raidguild-webhook-2026`), add it to your `.env` as `WEBHOOK_SECRET=raidguild-webhook-2026`, and restart the bot

---

## Step-by-Step

### 1. Open your Supabase project

Go to [supabase.com](https://supabase.com) → **Sign in** → click on your project.

---

### 2. Navigate to Webhooks

In the left sidebar, click **Database** → then click **Webhooks**.

> If you don't see "Webhooks" in the menu, look for it under **Database** → **Extensions** first — you may need to enable the `pg_net` extension. Click **Extensions**, search for `pg_net`, and toggle it on.

---

### 3. Create a new webhook

Click the **"Create a new hook"** button (or **"+ New webhook"**).

Fill in the form:

| Field | What to enter |
|-------|--------------|
| **Name** | `lead-status-changes` |
| **Table** | `leads` |
| **Events** | Check both ✅ **Insert** and ✅ **Update** |
| **Type** | HTTP Request |
| **Method** | POST |
| **URL** | `http://YOUR-SERVER-ADDRESS:3001/webhook/lead-event` |

Replace `YOUR-SERVER-ADDRESS` with your bot's IP address or domain name.

> **Example:** If your server IP is `123.45.67.89`, the URL would be:
> `http://123.45.67.89:3001/webhook/lead-event`

---

### 4. Add the security header

Scroll down to **HTTP Headers** and click **"Add header"**.

| Header name | Value |
|-------------|-------|
| `x-webhook-secret` | The same value as your `WEBHOOK_SECRET` in `.env` |

This prevents anyone else from sending fake updates to your bot.

---

### 5. Save

Click **Confirm** (or **Save**).

---

## Test It

1. Open Telegram and DM your bot
2. Use the `/add` command to create a test lead
3. Within a few seconds you should receive a Telegram notification from the bot confirming the new lead was logged

If nothing happens, double-check:
- Your server is running (`pm2 status` or check your hosting dashboard)
- Port `3001` is open/accessible (check your firewall or hosting provider's port settings)
- The `WEBHOOK_SECRET` in `.env` matches exactly what you entered in Supabase

---

## What Happens Automatically After This

Once the webhook is set up, you never need to touch it again. The bot handles everything:

| When this happens... | Bot automatically... |
|----------------------|---------------------|
| New lead added | Sends you a Telegram notification + logs to Ditto |
| Lead moves to "qualified" | Sends you a Telegram notification + logs to Ditto |
| Proposal submitted | Sends you a Telegram notification + logs to Ditto |
| Deal funded 🎉 | Sends you a Telegram notification + logs to Ditto |
| Lead goes stale | Daily check at 9am — you get a list of leads needing attention |
| Monday morning | Weekly pipeline summary sent to your Telegram |

All of this happens without any AI API calls — it's your cheap server doing deterministic work.
