'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

let anthropic;

function init() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  anthropic = new Anthropic({ apiKey: key });
}

// Load the playbook — the agent's conversation guide
function loadPlaybook() {
  const playbookPath = path.join(__dirname, '..', '..', 'lead-agent', 'training', 'PLAYBOOK.md');
  try {
    return fs.readFileSync(playbookPath, 'utf8');
  } catch {
    return '(Playbook not found — use good judgment for warm introductions)';
  }
}

// Load org context from SOUL.md + IDENTITY.md
function loadOrgContext() {
  const base = path.join(__dirname, '..', '..');
  const files = ['SOUL.md', 'IDENTITY.md', 'MEMORY.md'];
  return files.map(f => {
    try { return fs.readFileSync(path.join(base, f), 'utf8'); }
    catch { return ''; }
  }).filter(Boolean).join('\n\n---\n\n');
}

// Build system prompt from workspace files + optional Prism context
function buildSystemPrompt(prismContext) {
  const orgContext = loadOrgContext();
  const playbook = loadPlaybook();
  const prismSection = prismContext
    ? `\n---\n\n# Recent Community Activity (from PrismBOT)\n${prismContext}\n`
    : '';
  return `You are a business development agent for an organization. Your job is to handle warm introductions via Telegram, qualify leads, and track opportunities.

${orgContext}
${prismSection}
---

# Conversation Playbook
${playbook}

---

## Response Guidelines
- Be warm, professional, and concise
- One question at a time — never dump a wall of text
- Match the energy of the conversation
- When you confirm a lead, include a JSON block at the end of your response:
  \`\`\`lead_confirmed
  {
    "client_name": "...",
    "client_contact": "...",
    "introducer": "...",
    "description": "...",
    "opportunity_type": "new-raid|sponsor|recruiting|new-venture|product-integration|other"
  }
  \`\`\`
- When you have nothing to say (not relevant to you), respond with exactly: NO_REPLY`;
}

// Chat history per group — kept in memory, cleared on restart
const histories = new Map();

function getHistory(chatId) {
  if (!histories.has(chatId)) histories.set(chatId, []);
  return histories.get(chatId);
}

function addToHistory(chatId, role, content) {
  const history = getHistory(chatId);
  history.push({ role, content });
  // Keep last 20 messages to limit context
  if (history.length > 20) history.splice(0, history.length - 20);
}

// Main LLM call — only triggered on @mention or bot-added-to-group
async function respond({ chatId, userMessage, senderName, groupName, trigger, prismContext }) {
  if (!anthropic) throw new Error('LLM not initialized');

  // Add user message to history
  addToHistory(chatId, 'user', `[${senderName} in ${groupName}]: ${userMessage}`);

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    max_tokens: 500,
    system: buildSystemPrompt(prismContext),
    messages: getHistory(chatId),
  });

  const reply = response.content[0].text.trim();

  // Add assistant response to history
  if (reply !== 'NO_REPLY') {
    addToHistory(chatId, 'assistant', reply);
  }

  return reply;
}

// Parse lead_confirmed block from LLM response
function extractLeadConfirmation(text) {
  const match = text.match(/```lead_confirmed\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

// Strip the JSON block from the response before sending to user
function stripLeadBlock(text) {
  return text.replace(/```lead_confirmed[\s\S]*?```/g, '').trim();
}

module.exports = { init, respond, extractLeadConfirmation, stripLeadBlock };
