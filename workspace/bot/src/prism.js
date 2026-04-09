'use strict';

/**
 * PrismBOT API Client
 * https://prism-api-production-409d.up.railway.app/
 *
 * PrismBOT is RaidGuild's community memory — it tracks Discord activity,
 * decisions, action items, participants, and knowledge docs.
 *
 * The BD agent uses Prism to:
 * 1. Stay current on RaidGuild meeting decisions that affect BD
 * 2. Verify member activity/participation when assessing introducers
 * 3. Search RaidGuild knowledge (SOPs, glossary, policies) to answer client questions accurately
 * 4. Get product suggestions that might match a lead's needs
 */

const BASE = process.env.PRISM_API_URL || 'https://prism-api-production-409d.up.railway.app';

function isEnabled() {
  return !!process.env.PRISM_API_KEY;
}

async function prismGet(path) {
  if (!isEnabled()) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-Prism-Api-Key': process.env.PRISM_API_KEY },
    });
    if (!res.ok) {
      console.error(`[prism] ${path} → ${res.status}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error('[prism] fetch error:', e.message);
    return null;
  }
}

// Latest community memory snapshot — decisions + action items
async function getLatestMemory() {
  return prismGet('/memory/latest');
}

// Memory for a specific date
async function getMemoryForDate(date) {
  return prismGet(`/memory/date/${date}`);
}

// Digest for a specific date (summarized)
async function getDigestForDate(date) {
  return prismGet(`/digests/date/${date}`);
}

// Active participants in a time window — useful for member verification
async function getParticipants({ start, end, bucket } = {}) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (bucket) params.set('bucket', bucket);
  return prismGet(`/memory/participants?${params}`);
}

// Search knowledge base (SOPs, glossary, policies, guides)
async function searchKnowledge(query, { kind, tag, limit = 5 } = {}) {
  const params = new URLSearchParams({ q: query, limit });
  if (kind) params.set('kind', kind);
  if (tag) params.set('tag', tag);
  return prismGet(`/knowledge/search?${params}`);
}

// Fetch a specific knowledge doc by slug
async function getKnowledgeDoc(slug) {
  return prismGet(`/knowledge/docs/${slug}`);
}

// Latest product suggestions — useful for matching leads to RaidGuild capabilities
async function getProductSuggestions() {
  return prismGet('/products/suggestions/latest');
}

/**
 * BD-specific helpers
 */

// Get a brief summary of recent RaidGuild activity for context
async function getBDContext() {
  const memory = await getLatestMemory();
  if (!memory) return null;

  const decisions = memory.sections?.key_decisions?.map(d => d.text).join('\n') || 'None';
  const actions = memory.sections?.action_items?.map(a => a.text).join('\n') || 'None';

  return {
    date: memory.date,
    decisions,
    actions,
    summary: `RaidGuild community snapshot (${memory.date}):\nDecisions: ${decisions}\nAction items: ${actions}`,
  };
}

// Check if a username appears as an active participant (member credibility check)
async function checkMemberActivity(username, days = 30) {
  const end = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split('T')[0];

  const data = await getParticipants({ start, end });
  if (!data) return null;

  const participants = data.participants || data || [];
  const match = participants.find(p =>
    p.username?.toLowerCase() === username.toLowerCase() ||
    p.display_name?.toLowerCase() === username.toLowerCase()
  );

  return match ? { active: true, participant: match } : { active: false };
}

module.exports = {
  isEnabled,
  getLatestMemory,
  getMemoryForDate,
  getDigestForDate,
  getParticipants,
  searchKnowledge,
  getKnowledgeDoc,
  getProductSuggestions,
  getBDContext,
  checkMemberActivity,
};
