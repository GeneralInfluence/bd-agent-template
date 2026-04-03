# Playbook: Email Outreach Campaign

Generate leads and send cold outreach emails to organizations from a scraped or curated source list. Used for community outreach, university cohort recruiting, ecosystem BD, etc.

---

## When to Use

- You have (or can scrape) a list of organizations/people from a directory, community, or ecosystem
- The goal is to introduce RaidGuild or a RaidGuild member and start a conversation
- Outreach is email-based (not in-person or DM-based — see `conference-leads.md` for event prep)

---

## Step 0 — Define the Campaign

Create a campaign file: `campaigns/<campaign-slug>.md`

Document:
```yaml
name:           # Campaign name
source:         # Where the data comes from (URL, API, CSV, etc.)
goal:           # What we're trying to achieve
audience:       # Who we're reaching out to
sender:         # Who is sending the emails (name, role, email)
timeline:       # Start date → follow-up dates
template:       # Which email template(s) to use
```

## Step 1 — Acquire Raw Data

Get the source data into a structured format (JSON or CSV).

**Common sources and how to ingest them:**

| Source | Method |
|--------|--------|
| University org directory (CampusLabs/Engage) | Scrape the API: `GET /api/discovery/organization?top=500&skip=0` — returns JSON with Name, Summary, CategoryNames, WebsiteKey, Id |
| Conference attendee list | See `conference-leads.md` Steps 1-2 |
| Ecosystem project list | Scrape project directory pages (DeFi Llama, L2Beat, ecosystem grant pages) |
| LinkedIn export | Import CSV directly |
| Manual list | Create JSON/CSV by hand |

Save raw data as `<campaign-slug>-raw.json` in the workspace.

**API scraping tips:**
- Check for pagination (`top`, `skip`, `offset`, `page` params)
- Look for undocumented APIs by inspecting network requests in the browser tool
- Save the raw response — you'll filter later, and raw data is useful for future campaigns

## Step 2 — Filter for Relevance

Not every org in a directory is a lead. Filter using keyword matching and category analysis.

**Use `scripts/filter-orgs.js` as a starting point.** Customize the keyword lists per campaign:

**Include keywords** (cast a wide net, then narrow):
```
tech, comput, code, software, engineer, data, cyber, hack, robot,
innovat, entrepren, startup, business, machine learn, digital, web,
program, science, blockchain, crypto, stem, ai, design, maker,
marketing, management, finance, econom, analytic, research, lead,
pre-professional, career, mentor, app develop, network, system,
cloud, strateg, consult, venture, accelerat, incubat
```

**Exclude keywords** (remove obvious non-fits):
```
sorority, fraternity life, greek, nursing, pre-med, medical, dental,
pharmacy, veterinar, ballet, folklorico, cheer, dance, faith,
christian, muslim, jewish, church, bible, sport, tennis, soccer,
football, basketball, food, culinar, cook, counseling, therapy,
wellness, mindful, yoga, public health
```

**Also include** orgs with relevant category tags (STEM, Science & Engineering, Career Development, Research, Pre-Professional).

Save filtered data as `<campaign-slug>-filtered.json`.

**Review the filtered list manually** (or have a human review) — automated filtering will have false positives and negatives.

## Step 3 — Find Contact Info

For each filtered org, find email addresses:

1. **Directory data** — Many directories include contact emails in the org profile
2. **Org website** — Check `/contact`, `/about`, footer sections
3. **Social profiles** — Twitter bios, LinkedIn pages sometimes list emails
4. **Pattern matching** — If you know the domain (e.g., `@unr.edu`), try common patterns: `orgname@domain`, `president@domain`

**For bulk directory scraping:**
- If the directory has individual org pages, scrape each one for email/contact fields
- Rate limit your requests (1-2 per second) to avoid getting blocked
- Save enriched data as `<campaign-slug>-with-emails.json`

**Email quality tiers:**
- **Tier 1:** Org-specific email (e.g., `acm@cse.unr.edu`) — best
- **Tier 2:** Named person email at org (e.g., `jsmith@org.com`) — good
- **Tier 3:** Generic department email (e.g., `engineering@unr.edu`) — okay
- **Tier 4:** Personal email (e.g., `randomgmail@gmail.com`) — use with caution

## Step 4 — Generate Outreach CSV

Build a CSV ready for mail merge or Google Sheets import.

**Use `scripts/generate-outreach-csv.js`** or adapt it. Required columns:

```csv
email,orgName,categories,summary
```

Optional additional columns depending on template:
```csv
contactName,role,personalNote,eventName,meetingLink
```

Save as `<campaign-slug>-outreach.csv`.

**Also generate a Google Apps Script** (`populate-sheet.js` pattern) if the outreach will be managed via Google Sheets. This embeds the data directly in a script that can populate a sheet in one click.

## Step 5 — Draft Email Templates

Select or customize a template from `templates/`. Key principles:

- **Short** — 3-5 sentences max for cold outreach
- **Specific** — Reference something about the org (use `{{summary}}` or `{{categories}}` merge fields)
- **Clear ask** — One specific call to action (reply, book a call, visit a page)
- **Human voice** — Sent from a real person, not "the RaidGuild team"
- **No attachments** — Links only on first touch

Available templates:
- `templates/cold-intro-general.md` — Generic cold intro
- `templates/cold-intro-event.md` — Pre-event meeting request
- `templates/cohort-community-intro.md` — University/community outreach
- `templates/follow-up.md` — Follow-up after no response

## Step 6 — Send & Track

**Sending options:**
1. **Google Sheets + Mail Merge** — Use a Google Sheets add-on (Yet Another Mail Merge, Mail Merge with Attachments, etc.)
2. **Manual send** — For small lists (<20), send individually
3. **Programmatic** — Use SendGrid, Mailgun, etc. via API (requires setup)

**Tracking:**
- Update the campaign file with send date
- Track responses in the campaign file or a dedicated tracking sheet
- Schedule follow-ups (typically 5-7 days after initial send)

**Follow-up cadence:**
1. **Day 0:** Initial outreach
2. **Day 5-7:** First follow-up (if no response)
3. **Day 14:** Second follow-up (shorter, different angle)
4. **Day 21+:** Move to "no response" — don't follow up again unless new context

## Step 7 — Process Responses

When responses come in:
1. Log the response in the campaign file
2. Classify: Interested / Not Now / Not Interested / Bounced
3. For "Interested" — move to warm lead status, hand off to BD pipeline Stage 1
4. For "Not Now" — note the reason, schedule a future check-in if appropriate
5. For "Bounced" — try alternate contact if available

---

## Output Checklist

A completed email outreach campaign should produce:
- [ ] Campaign file (`campaigns/<slug>.md`) with metadata and lead tracking
- [ ] Raw data file (`<slug>-raw.json`)
- [ ] Filtered data file (`<slug>-filtered.json`)
- [ ] Enriched data with emails (`<slug>-with-emails.json`)
- [ ] Outreach CSV (`<slug>-outreach.csv`)
- [ ] Google Apps Script for sheet population (if using Sheets)
- [ ] Selected/customized email template
- [ ] Send log with dates and response tracking
