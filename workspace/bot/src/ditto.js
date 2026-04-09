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
 * CONTRIBUTION LEDGER FORMAT
 * ===========================
 * Ditto is a contribution ledger, not a contact book.
 * Subject = the WORK (opportunity type + client), never a person.
 * When a deal closes, this graph determines who gets rewarded and how.
 *
 * Always use this structure for saveMemory content:
 *
 *   "Ditto, here is an update for the memory graph: [Opportunity Type] — [Client/Org],
 *    involving [contributor1], [contributor2], ...
 *
 *    Current status: [status]. Next step: [who does what by when].
 *
 *    Contributors and roles:
 *    - [Name] is the LEAD on this opportunity. [Brief role description.]
 *    - [Name] contributed as [role].
 *    - [Name] is the introducer — [context].
 *
 *    Note: [Anyone explicitly NOT a contributor, with reason]"
 *
 * Opportunity Types: Cohort Sponsorship | Raid / Contract |
 *   Recruiting for a Sponsor | Cohort Attendee Recruiting | New Venture
 *
 * Contributor Roles: LEAD | proposal-author | concept-developer |
 *   finance-intel | proposal-contributor | introducer | recruiter | warm-contact
 *
 * KEY INTEGRATION POINTS — call these from bot.js:
 *
 * Warm intro detected:
 *   ditto.saveMemory(
 *     `Ditto, here is an update for the memory graph: ${opportunity_type} — ${client_name}, involving ${introducer}.\n\n` +
 *     `Current status: Warm intro received via Telegram group ${group_name}.\n\n` +
 *     `Contributors and roles:\n- ${introducer} is the introducer — initiated warm intro via Telegram.`,
 *     `lead_id: ${lead_id}`
 *   )
 *
 * Lead qualified:
 *   ditto.saveMemory(
 *     `Ditto, here is an update for the memory graph: ${opportunity_type} — ${client_name}, involving ${introducer}, ${assigned_member}.\n\n` +
 *     `Current status: Lead qualified. ${description}\n\n` +
 *     `Contributors and roles:\n- ${assigned_member} is the LEAD (qualified the opportunity).\n- ${introducer} contributed as introducer.`,
 *     `lead_id: ${lead_id}`
 *   )
 *
 * Proposal submitted:
 *   ditto.saveMemory(
 *     `Ditto, here is an update for the memory graph: ${opportunity_type} — ${client_name}, involving ${member}, ${introducer}.\n\n` +
 *     `Current status: Proposal submitted.\n\n` +
 *     `Contributors and roles:\n- ${member} is the LEAD and proposal-author.\n- ${introducer} contributed as introducer.`,
 *     `lead_id: ${lead_id}`
 *   )
 *
 * Funded — CRITICAL, contributor list must be final and accurate:
 *   ditto.saveMemory(
 *     `Ditto, here is an update for the memory graph: ${opportunity_type} — ${client_name}, involving ${team.join(', ')}.\n\n` +
 *     `Current status: FUNDED. Amount: ${amount}.\n\n` +
 *     `Contributors and roles:\n${contributorLines}`,
 *     `lead_id: ${lead_id}`
 *   )
 */

module.exports = { isEnabled, saveMemory };
