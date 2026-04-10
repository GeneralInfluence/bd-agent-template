#!/bin/bash
# Step 1: Filter relevant orgs from raw data
node -e '
const fs = require("fs");
const orgs = JSON.parse(fs.readFileSync("unr-orgs-raw.json", "utf8"));

const keywords = [
  "tech", "comput", "code", "coding", "software", "engineer", "data",
  "cyber", "hack", "robot", "innovat", "entrepren", "startup", "business",
  "machine learn", "automat", "digital", "web", "program", "science",
  "math", "physic", "electric", "electron", "information", "intel",
  "blockchain", "crypto", "stem", "ai ", "artificial", "3d print",
  "design", "maker", "gaming", "esport", "marketing", "management",
  "finance", "econom", "account", "analytic", "research", "lead",
  "pre-professional", "career", "mentor", "intern", "profession",
  "app develop", "mobile", "network", "system", "cloud", "devops",
  "strateg", "consult", "startup", "venture", "accelerat", "incubat",
  "librar", "writing", "media", "communicat", "journal"
];

const excluded = [
  "sorority", "fraternity life", "greek", "nursing", "pre-med", 
  "medical", "dental", "pharmacy", "veterinar", "animal", "agriculture",
  "ballet", "folklorico", "cheer", "dance", "faith", "christian", 
  "muslim", "jewish", "church", "bible", "worship", "prayer", "gospel",
  "catholic", "chabad", "sport", "tennis", "soccer", "football",
  "basketball", "volleyball", "swim", "lacrosse", "rugby", "bowling",
  "equestrian", "rodeo", "ski", "snowboard", "climbing", "hiking",
  "hunt", "fish", "ranch", "garden", "ceramic", "pottery",
  "food", "culinar", "cook", "bake", "nutrition", "diet",
  "counseling", "therapy", "wellness", "mindful", "yoga",
  "public health", "kinesiology", "health science"
];

const filtered = orgs.filter(org => {
  const text = (org.Name + " " + (org.Summary || "") + " " + (org.Description || "") + " " + (org.CategoryNames || []).join(" ")).toLowerCase();
  
  // Check if excluded
  const isExcluded = excluded.some(ex => text.includes(ex));
  if (isExcluded) return false;
  
  // Check if relevant
  const isRelevant = keywords.some(kw => text.includes(kw));
  
  // Also include STEM category orgs
  const cats = (org.CategoryNames || []).map(c => c.toLowerCase());
  const hasStemCat = cats.some(c => ["stem", "science & engineering", "career development", "research", "pre-professional", "pre professional"].includes(c));
  
  return isRelevant || hasStemCat;
});

const slugs = filtered.map(o => ({
  name: o.Name.trim(),
  slug: o.WebsiteKey,
  id: o.Id,
  summary: o.Summary || "",
  categories: o.CategoryNames || []
}));

fs.writeFileSync("unr-orgs-filtered.json", JSON.stringify(slugs, null, 2));
console.log("Filtered: " + slugs.length + " of " + orgs.length);
'
