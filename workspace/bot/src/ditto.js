'use strict';

/**
 * Ditto Knowledge Graph Integration (optional)
 * https://heyditto.ai/docs/mcp-server
 *
 * Ditto tracks the relationship web and contribution history for each BD event.
 * This enables precise rewards/kudos calculation based on who introduced, qualified,
 * and executed — however long that takes.
 *
 * Only active when DITTO_API_KEY is set. Falls back silently without it.
 */

const DITTO_API = 'https://api.heyditto.ai/mcp';

function isEnabled() {
  return !!process.env.DITTO_API_KEY;
}

async function callDitto(method, params) {
  if (!isEnabled()) return null;

  const res = await fetch(DITTO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DITTO_API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: `tools/call`,
      params: { name: method, arguments: params },
    }),
  });

  if (!res.ok) {
    console.error(`[ditto] ${method} failed: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data?.result;
}

/**
 * Save a BD event to the knowledge graph.
 * Call this on every meaningful pipeline milestone.
 *
 * @param {string} content - Human-readable description of what happened
 * @param {string} sourceContext - Additional metadata (e.g. "lead_id: xxx, group: Intro 2 Tae")
 */
async function saveMemory(content, sourceContext = '') {
  if (!isEnabled()) return;
  try {
    await callDitto('save_memory', {
      content,
      source: 'lead-agent-bot',
      sourceContext,
    });
    console.log(`[ditto] saved: ${content.slice(0, 60)}...`);
  } catch (e) {
    console.error('[ditto] saveMemory error:', e.message);
  }
}

/**
 * Key integration points — call these from bot.js:
 *
 * Warm intro detected:
 *   ditto.saveMemory(
 *     `${introducer} introduced ${client_name} to ${org_name} via Telegram`,
 *     `group: ${group_name}, opportunity: ${opportunity_type}`
 *   )
 *
 * Lead qualified:
 *   ditto.saveMemory(
 *     `${client_name} lead qualified — ${description}`,
 *     `lead_id: ${lead.id}, introducer: ${introducer}`
 *   )
 *
 * Proposal submitted:
 *   ditto.saveMemory(
 *     `${member} submitted proposal to ${client_name}`,
 *     `lead_id: ${lead.id}`
 *   )
 *
 * Funded:
 *   ditto.saveMemory(
 *     `${client_name} raid funded. Team: ${team.join(', ')}`,
 *     `lead_id: ${lead.id}, amount: ${amount}`
 *   )
 */

module.exports = { isEnabled, saveMemory };
