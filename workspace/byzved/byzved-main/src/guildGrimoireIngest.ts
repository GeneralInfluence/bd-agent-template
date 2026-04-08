import axios from 'axios';

interface GrimoireIngestPayload {
  text_content: string;
  visibility?: 'private' | 'shared' | 'cohort' | 'public';
  tag_ids?: string[];
}

/**
 * Sends a note to the Guild Grimoire Ingest API.
 * @param payload - The note data to send.
 * @returns The API response data.
 * @throws Error if the request fails or validation fails.
 */
export async function sendToGuildGrimoireIngest(payload: GrimoireIngestPayload) {
  const apiKey = process.env.GUILD_GRIMOIRE_INGEST_API_KEY;
  const userId = process.env.GUILD_GRIMOIRE_INGEST_USER_ID;
  if (!apiKey || !userId) {
    throw new Error('Missing GUILD_GRIMOIRE_INGEST_API_KEY or GUILD_GRIMOIRE_INGEST_USER_ID in environment');
  }

  // Validate payload
  if (!payload.text_content || typeof payload.text_content !== 'string' || payload.text_content.trim().length === 0) {
    throw new Error('text_content is required and must be a non-empty string');
  }
  if (payload.text_content.length > 256) {
    throw new Error('text_content must be at most 256 characters');
  }

  const data = {
    text_content: payload.text_content.trim(),
    visibility: payload.visibility || 'shared',
    tag_ids: payload.tag_ids,
  };

  const url = 'https://guild-grimoire.xyz/api/modules/guild-grimoire/ingest';

  const response = await axios.post(url, data, {
    headers: {
      'x-grimoire-api-key': apiKey,
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
  });
  return response.data;
}

/**
 * Usage example:
 *
 * import { sendToGuildGrimoireIngest } from './guildGrimoireIngest';
 *
 * await sendToGuildGrimoireIngest({
 *   text_content: 'Your bot note here',
 *   visibility: 'shared', // optional
 *   tag_ids: ['<tag-uuid-1>', '<tag-uuid-2>'], // optional
 * });
 */
