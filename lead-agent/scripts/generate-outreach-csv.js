#!/usr/bin/env node
/**
 * generate-outreach-csv.js — Build an outreach CSV from enriched org data
 *
 * Usage:
 *   node generate-outreach-csv.js <input-with-emails.json> <output.csv>
 *
 * Input: JSON array of objects with: { name, email, summary?, categories?, ... }
 * Output: CSV with columns: email, orgName, categories, summary
 *
 * Also generates a Google Apps Script function (populate-sheet.js) that can
 * paste the data directly into a Google Sheet.
 */

const fs = require('fs');

const inputFile = process.argv[2];
const outputCsv = process.argv[3];
const outputScript = process.argv[4] || outputCsv.replace('.csv', '-populate-sheet.js');

if (!inputFile || !outputCsv) {
  console.error('Usage: node generate-outreach-csv.js <input.json> <output.csv> [output-script.js]');
  process.exit(1);
}

const orgs = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Filter to only orgs with emails
const withEmails = orgs.filter(o => o.email && o.email.trim());

// --- Generate CSV ---
function escapeCSV(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const SUMMARY_MAX = 120; // truncate summaries for readability

const csvHeader = 'email,orgName,categories,summary';
const csvRows = withEmails.map(o => {
  const cats = Array.isArray(o.categories) ? o.categories.join(', ') : (o.categories || '');
  const summary = (o.summary || '').substring(0, SUMMARY_MAX);
  return [o.email, o.name, cats, summary].map(escapeCSV).join(',');
});

fs.writeFileSync(outputCsv, [csvHeader, ...csvRows].join('\n'));
console.log(`CSV: ${csvRows.length} rows written to ${outputCsv}`);

// --- Generate Google Apps Script ---
const scriptData = withEmails.map(o => {
  const cats = Array.isArray(o.categories) ? o.categories.join(', ') : (o.categories || '');
  const summary = (o.summary || '').substring(0, SUMMARY_MAX);
  return `    [${JSON.stringify(o.email)}, ${JSON.stringify(o.name)}, ${JSON.stringify(cats)}, ${JSON.stringify(summary)}]`;
});

const script = `function populateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var data = [
    ["email", "orgName", "categories", "summary"],
${scriptData.join(',\n')}
  ];
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}
`;

fs.writeFileSync(outputScript, script);
console.log(`Google Apps Script: ${outputScript}`);
