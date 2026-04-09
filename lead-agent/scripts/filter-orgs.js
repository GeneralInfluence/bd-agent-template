#!/usr/bin/env node
/**
 * filter-orgs.js — Filter raw organization data by relevance keywords
 *
 * Usage:
 *   node filter-orgs.js <input-raw.json> <output-filtered.json>
 *
 * Input: JSON array of objects with at minimum: { Name, Summary?, Description?, CategoryNames? }
 *        (matches CampusLabs/Engage API format, but adaptable)
 *
 * Output: JSON array of filtered objects with: { name, slug, id, summary, categories }
 *
 * Customize the INCLUDE_KEYWORDS and EXCLUDE_KEYWORDS arrays per campaign.
 */

const fs = require('fs');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node filter-orgs.js <input-raw.json> <output-filtered.json>');
  process.exit(1);
}

// --- CUSTOMIZE THESE PER CAMPAIGN ---

const INCLUDE_KEYWORDS = [
  'tech', 'comput', 'code', 'coding', 'software', 'engineer', 'data',
  'cyber', 'hack', 'robot', 'innovat', 'entrepren', 'startup', 'business',
  'machine learn', 'automat', 'digital', 'web', 'program', 'science',
  'math', 'physic', 'electric', 'electron', 'information', 'intel',
  'blockchain', 'crypto', 'stem', 'ai ', 'artificial', '3d print',
  'design', 'maker', 'gaming', 'esport', 'marketing', 'management',
  'finance', 'econom', 'account', 'analytic', 'research', 'lead',
  'pre-professional', 'career', 'mentor', 'intern', 'profession',
  'app develop', 'mobile', 'network', 'system', 'cloud', 'devops',
  'strateg', 'consult', 'venture', 'accelerat', 'incubat',
  'librar', 'writing', 'media', 'communicat', 'journal'
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

// Categories that auto-include an org (even without keyword match)
const INCLUDE_CATEGORIES = [
  'stem', 'science & engineering', 'career development',
  'research', 'pre-professional', 'pre professional'
];

// --- END CUSTOMIZATION ---

const orgs = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const filtered = orgs.filter(org => {
  const text = [
    org.Name || org.name || '',
    org.Summary || org.summary || '',
    org.Description || org.description || '',
    ...(org.CategoryNames || org.categories || [])
  ].join(' ').toLowerCase();

  // Check exclusions first
  if (EXCLUDE_KEYWORDS.some(ex => text.includes(ex))) return false;

  // Check keyword match
  if (INCLUDE_KEYWORDS.some(kw => text.includes(kw))) return true;

  // Check category match
  const cats = (org.CategoryNames || org.categories || []).map(c => c.toLowerCase());
  if (cats.some(c => INCLUDE_CATEGORIES.includes(c))) return true;

  return false;
});

// Normalize output format
const output = filtered.map(o => ({
  name: (o.Name || o.name || '').trim(),
  slug: o.WebsiteKey || o.slug || '',
  id: o.Id || o.id || '',
  summary: o.Summary || o.summary || '',
  categories: o.CategoryNames || o.categories || []
}));

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`Filtered: ${output.length} of ${orgs.length} orgs`);
