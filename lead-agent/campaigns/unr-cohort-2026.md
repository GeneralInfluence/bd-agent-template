# UNR Cohort Outreach 2026

**Campaign type:** Email Outreach
**Playbook used:** [email-outreach-campaign.md](../playbooks/email-outreach-campaign.md)

---

## Campaign Metadata

```yaml
name:       UNR Cohort Outreach 2026
source:     University of Nevada, Reno — CampusLabs Engage directory
            API: https://unr.campuslabs.com/engage/api/discovery/organization
goal:       Introduce RaidGuild / web3 career opportunities to relevant UNR student orgs
audience:   STEM, business, engineering, CS, and career-focused student organizations
sender:     Sean (Aphilos) — BD Steward, RaidGuild
timeline:   March 2026 — ongoing
template:   cohort-community-intro (recruiting variant)
```

---

## Data Pipeline

### Step 1 — Raw Data
- **Source:** CampusLabs Engage API (`GET /api/discovery/organization?top=500&skip=0`)
- **File:** `workspace/unr-orgs-raw.json`
- **Count:** ~300+ organizations total

### Step 2 — Filtered
- **Script:** `scripts/filter-orgs.js` (customized with tech/STEM/business keywords, excluding sports/religious/medical)
- **File:** `workspace/unr-orgs-filtered.json`
- **Count:** ~100 organizations after filtering

### Step 3 — Email Enrichment
- **Method:** Scraped individual org pages from CampusLabs for contact email fields
- **Script:** `workspace/filter-and-fetch.sh` (bash + node one-off)
- **File:** `workspace/unr-orgs-with-emails.json`
- **Note:** Most emails came directly from the directory API; some orgs had no email listed

### Step 4 — Outreach CSV
- **File:** `workspace/unr-cohort-outreach.csv`
- **Columns:** email, orgName, categories, summary
- **Google Sheets:** Data also embedded in `workspace/populate-sheet.js` (Apps Script for one-click sheet population)
- **Count:** 214 rows with valid emails

---

## Key Orgs (Highest Relevance)

| Org | Email | Why |
|-----|-------|-----|
| Association for Computing Machinery | acm@cse.unr.edu | CS students, hackathon culture |
| Computer Science & Engineering | cse@cse.unr.edu | Department-level, direct access to CS students |
| UNR Robotics | Jaydenfeldman@unr.edu | Engineering + tech, hands-on builders |
| Nevada Electric Racing | unrformula@gmail.com | Engineering competition team |
| UNR Innevation Center | icfrontdesk@unr.edu | Innovation/entrepreneurship hub |
| Business Student Council | mmarchlewski@unr.edu | Business leadership, career-focused |
| National Society of Black Engineers | unr.nsbe@gmail.com | STEM + diversity pipeline |
| Society of Women Engineers | swe.unr@gmail.com | STEM + diversity pipeline |
| Society of Hispanic Professional Engineers | unr.shpe@gmail.com | STEM + diversity pipeline |
| UNR Economics Club | econclubunr@gmail.com | Finance/economics interest |
| Theta Tau | nevadathetatau@gmail.com | Engineering fraternity, professional focus |
| DeLaMare Science & Engineering Library | dlmlib@unr.edu | Maker space, community hub |

---

## Status

- [x] Raw data acquired
- [x] Data filtered
- [x] Emails scraped
- [x] Outreach CSV generated
- [x] Google Sheets script generated
- [ ] Emails sent
- [ ] Responses tracked
- [ ] Follow-ups sent

---

## Lessons Learned

1. **CampusLabs API is undocumented but reliable** — pagination works with `top` and `skip` params
2. **Email quality varies** — some orgs use personal Gmail addresses (officers change each year), others use stable org/department emails
3. **Broad keyword filtering catches too much** — manual review still needed after automated filtering
4. **Directory data is seasonal** — org leadership and contact info turns over at semester boundaries (August, January)
5. **Google Apps Script approach works well** — embedding data in a `populateSheet()` function makes it easy to hand off to someone who manages outreach from Sheets

---

*Created: March 2026*
*Last updated: April 2026*
