#!/bin/bash
# Guild Grimoire Ingest API wrapper
# Usage: ./grimoire-ingest.sh <text_content> [visibility] [tag_ids_comma_separated]
#
# Examples:
#   ./grimoire-ingest.sh "Warm intro: Alice from Acme Corp" shared
#   ./grimoire-ingest.sh "Proposal submitted to Acme" shared "uuid1,uuid2"

set -euo pipefail

TEXT_CONTENT="${1:?text_content is required}"
VISIBILITY="${2:-shared}"
TAG_IDS_CSV="${3:-}"

API_URL="https://guild-grimoire.xyz/api/modules/guild-grimoire/ingest"
API_KEY="${GUILD_GRIMOIRE_INGEST_API_KEY:?Missing GUILD_GRIMOIRE_INGEST_API_KEY}"
USER_ID="${GUILD_GRIMOIRE_INGEST_USER_ID:?Missing GUILD_GRIMOIRE_INGEST_USER_ID}"

# Build tag_ids JSON array if provided
if [ -n "$TAG_IDS_CSV" ]; then
  TAG_IDS_JSON=$(echo "$TAG_IDS_CSV" | tr ',' '\n' | sed 's/^/"/;s/$/"/' | paste -sd, | sed 's/^/[/;s/$/]/')
else
  TAG_IDS_JSON="[]"
fi

# Build JSON payload
PAYLOAD=$(jq -n \
  --arg text "$TEXT_CONTENT" \
  --arg vis "$VISIBILITY" \
  --argjson tags "$TAG_IDS_JSON" \
  '{text_content: $text, visibility: $vis, tag_ids: $tags}')

curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-grimoire-api-key: $API_KEY" \
  -H "x-user-id: $USER_ID" \
  -d "$PAYLOAD"
