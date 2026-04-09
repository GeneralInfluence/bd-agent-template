#!/usr/bin/env node
/**
 * scrape-campuslabs.js — Bulk scrape orgs from CampusLabs/Engage universities
 *
 * Usage:
 *   node scrape-campuslabs.js [--schools school1,school2,...] [--output-dir ./data]
 *
 * Scrapes all orgs from each school's CampusLabs Engage API, saves raw JSON,
 * then runs filtering and generates outreach CSVs.
 *
 * API formats supported:
 *   - OData style: { value: [...], @odata.count: N }
 *   - Items style: { items: [...], totalItems: N }
 *
 * Rate limiting: 500ms between requests to be polite.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// --- CONFIGURATION ---

// All confirmed working CampusLabs schools
const ALL_SCHOOLS = [
  // Original batch (OData format)
  'unr', 'utexas', 'gatech', 'umich', 'berkeley', 'ufl', 'psu', 'purdue',
  'wisc', 'umd', 'vt', 'ncsu', 'msu', 'uoregon', 'rutgers', 'nyu', 'bu',
  'rice', 'vanderbilt', 'tulane', 'drexel',
  // Second batch (Items format)
  'ucr', 'calpoly', 'unc', 'uga', 'clemson', 'utk', 'uky', 'ua', 'fsu',
  'ucf', 'gwu', 'american', 'hofstra', 'baylor', 'tcu', 'unlv'
];

const PAGE_SIZE = 100;
const DELAY_MS = 500;

// --- KEYWORD FILTERS (customize per campaign) ---

const INCLUDE_KEYWORDS = [
  // Tech & engineering
  'tech', 'comput', 'code', 'coding', 'software', 'engineer', 'data',
  'cyber', 'hack', 'robot', 'automat', 'digital', 'web', 'program',
  'blockchain', 'crypto', 'ai ', 'artificial', 'machine learn',
  // Business & entrepreneurship
  'innovat', 'entrepren', 'startup', 'business', 'marketing', 'management',
  'finance', 'econom', 'account', 'analytic', 'strateg', 'consult',
  'venture', 'accelerat', 'incubat',
  // Applied / interdisciplinary
  'design', 'maker', 'gaming', 'esport', 'media', 'communicat',
  // Career & professional
  'pre-professional', 'career', 'mentor', 'profession',
  // Science & research
  'science', 'math', 'research', 'stem',
  // Explicitly web3/crypto
  'dao', 'defi', 'ethereum', 'solidity', 'web3', 'nft', 'token',
  'decentraliz', 'smart contract'
];

const EXCLUDE_KEYWORDS = [
  'sorority', 'fraternity life', 'greek', 'nursing', 'pre-med',
  'medical', 'dental', 'pharmacy', 'veterinar', 'animal', 'agriculture',
  'ballet', 'folklorico', 'cheer', 'dance', 'faith', 'christian',
  'muslim', 'jewish', 'church', 'bible', 'worship', 'prayer', 'gospel',
  'catholic', 'chabad', 'sport', 'tennis', 'soccer', 'football',
  'basketball', 'volleyball', 'swim', 'lacrosse', 'rugby', 'bowling',
  'equestrian', 'rodeo', 'ski', 'snowboard', 'climbing', 'hiking',
  'hunt', 'fish', 'ranch', 'garden', 'ceramic', 'pottery',
  'food', 'culinar', 'cook', 'bake', 'nutrition', 'diet',
  'counseling', 'therapy', 'wellness', 'mindful', 'yoga',
  'public health', 'kinesiology', 'health science'
];

const INCLUDE_CATEGORIES = [
  'stem', 'science & engineering', 'career development',
  'research', 'pre-professional', 'pre professional'
];

// --- HELPERS ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function scrapeSchool(school) {
  const baseUrl = `https://${school}.campuslabs.com/engage/api/discovery/organization`;
  let allOrgs = [];
  let skip = 0;
  let total = null;

  console.log(`  Scraping ${school}...`);

  while (true) {
    try {
      const url = `${baseUrl}?take=${PAGE_SIZE}&skip=${skip}`;
      const data = await fetch(url);

      const items = data.items || data.value || [];
      if (total === null) {
        total = data.totalItems || data['@odata.count'] || 0;
        console.log(`  ${school}: ${total} total orgs`);
      }

      if (items.length === 0) break;

      allOrgs = allOrgs.concat(items);
      skip += PAGE_SIZE;

      if (skip >= total) break;
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  ${school} error at skip=${skip}: ${err.message}`);
      break;
    }
  }

  console.log(`  ${school}: scraped ${allOrgs.length} orgs`);
  return allOrgs;
}

function filterOrgs(orgs) {
  return orgs.filter(org => {
    const text = [
      org.name || org.Name || '',
      org.summary || org.Summary || '',
      org.description || org.Description || '',
      ...(org.CategoryNames || org.categories || []).map(c =>
        typeof c === 'string' ? c : (c.name || '')
      )
    ].join(' ').toLowerCase();

    if (EXCLUDE_KEYWORDS.some(ex => text.includes(ex))) return false;
    if (INCLUDE_KEYWORDS.some(kw => text.includes(kw))) return true;

    const cats = (org.CategoryNames || org.categories || [])
      .map(c => (typeof c === 'string' ? c : (c.name || '')).toLowerCase());
    if (cats.some(c => INCLUDE_CATEGORIES.includes(c))) return true;

    return false;
  });
}

function normalizeOrg(org, school) {
  const cats = (org.CategoryNames || org.categories || [])
    .map(c => typeof c === 'string' ? c : (c.name || ''));
  return {
    school,
    name: (org.name || org.Name || '').trim(),
    slug: org.websiteKey || org.WebsiteKey || '',
    email: org.email || null,
    summary: (org.summary || org.Summary || '').trim(),
    categories: cats,
    url: `https://${school}.campuslabs.com/engage/organization/${org.websiteKey || org.WebsiteKey || ''}`
  };
}

function escapeCSV(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// --- MAIN ---

async function main() {
  const args = process.argv.slice(2);

  // Parse --schools flag
  let schools = ALL_SCHOOLS;
  const schoolsIdx = args.indexOf('--schools');
  if (schoolsIdx !== -1 && args[schoolsIdx + 1]) {
    schools = args[schoolsIdx + 1].split(',');
  }

  // Parse --output-dir flag
  let outputDir = '.';
  const outIdx = args.indexOf('--output-dir');
  if (outIdx !== -1 && args[outIdx + 1]) {
    outputDir = args[outIdx + 1];
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Scraping ${schools.length} schools...\n`);

  const allFiltered = [];
  const summary = [];

  for (const school of schools) {
    try {
      const rawOrgs = await scrapeSchool(school);

      // Save raw
      const rawPath = path.join(outputDir, `${school}-raw.json`);
      fs.writeFileSync(rawPath, JSON.stringify(rawOrgs, null, 2));

      // Filter
      const filtered = filterOrgs(rawOrgs).map(o => normalizeOrg(o, school));
      const withEmail = filtered.filter(o => o.email);

      // Save filtered
      const filteredPath = path.join(outputDir, `${school}-filtered.json`);
      fs.writeFileSync(filteredPath, JSON.stringify(filtered, null, 2));

      summary.push({
        school,
        total: rawOrgs.length,
        filtered: filtered.length,
        withEmail: withEmail.length
      });

      allFiltered.push(...filtered);

      console.log(`  ${school}: ${rawOrgs.length} total → ${filtered.length} filtered (${withEmail.length} with email)\n`);

      await sleep(1000); // Extra pause between schools
    } catch (err) {
      console.error(`  FAILED ${school}: ${err.message}\n`);
      summary.push({ school, total: 0, filtered: 0, withEmail: 0, error: err.message });
    }
  }

  // Save combined filtered
  const combinedPath = path.join(outputDir, 'all-filtered.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allFiltered, null, 2));

  // Save combined CSV (only orgs with emails)
  const withEmails = allFiltered.filter(o => o.email);
  const csvHeader = 'school,email,orgName,categories,summary';
  const csvRows = withEmails.map(o => {
    const cats = o.categories.join('; ');
    const sum = (o.summary || '').substring(0, 120);
    return [o.school, o.email, o.name, cats, sum].map(escapeCSV).join(',');
  });
  const csvPath = path.join(outputDir, 'all-outreach.csv');
  fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'));

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log('school          | total | filtered | w/email');
  console.log('----------------|-------|----------|--------');
  for (const s of summary) {
    const name = s.school.padEnd(15);
    console.log(`${name} | ${String(s.total).padStart(5)} | ${String(s.filtered).padStart(8)} | ${String(s.withEmail).padStart(7)}`);
  }
  const totals = summary.reduce((acc, s) => ({
    total: acc.total + s.total,
    filtered: acc.filtered + s.filtered,
    withEmail: acc.withEmail + s.withEmail
  }), { total: 0, filtered: 0, withEmail: 0 });
  console.log('----------------|-------|----------|--------');
  console.log(`TOTAL           | ${String(totals.total).padStart(5)} | ${String(totals.filtered).padStart(8)} | ${String(totals.withEmail).padStart(7)}`);

  console.log(`\nFiles written to: ${outputDir}/`);
  console.log(`  all-filtered.json: ${allFiltered.length} orgs`);
  console.log(`  all-outreach.csv: ${withEmails.length} rows`);

  // Save summary
  fs.writeFileSync(path.join(outputDir, 'scrape-summary.json'), JSON.stringify({ 
    timestamp: new Date().toISOString(),
    schools: summary,
    totals
  }, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
