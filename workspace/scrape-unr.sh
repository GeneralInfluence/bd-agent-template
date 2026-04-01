#!/bin/bash
# Fetch all orgs from CampusLabs API in batches of 100
OUTFILE="unr-orgs-raw.json"
echo "[" > "$OUTFILE"
SKIP=0
TOP=100
TOTAL=999
FIRST=true

while [ $SKIP -lt $TOTAL ]; do
  RESP=$(curl -s "https://unr.campuslabs.com/engage/api/discovery/search/organizations?orderBy%5B0%5D=UpperName%20asc&top=${TOP}&filter=&query=&skip=${SKIP}&branches=330518&branches=356605&branches=325978&categories=16312&categories=16418&categories=16570&categories=18649&categories=16306&categories=16462&categories=16303&categories=16579&categories=16481")
  
  TOTAL=$(echo "$RESP" | jq -r '.["@odata.count"]')
  COUNT=$(echo "$RESP" | jq '.value | length')
  
  echo "Fetched $SKIP-$((SKIP+COUNT)) of $TOTAL" >&2
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$OUTFILE"
  fi
  
  echo "$RESP" | jq -c '.value[]' | paste -sd',' >> "$OUTFILE"
  
  SKIP=$((SKIP + TOP))
  sleep 0.5
done

echo "]" >> "$OUTFILE"

# Validate and count
COUNT=$(jq length "$OUTFILE")
echo "Total orgs saved: $COUNT"
