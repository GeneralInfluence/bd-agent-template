#!/bin/bash
# Get total org counts from confirmed CampusLabs schools

schools=(
  "unr" "utexas" "gatech" "umich" "berkeley" "ufl" "psu" "purdue"
  "wisc" "umd" "vt" "ncsu" "msu" "uoregon" "rutgers" "nyu" "bu"
  "rice" "vanderbilt" "tulane" "drexel"
)

echo "school,total_orgs"
for school in "${schools[@]}"; do
  url="https://${school}.campuslabs.com/engage/api/discovery/organization?\$count=true&top=0"
  count=$(curl -s --max-time 5 "$url" 2>/dev/null | node -e "
    const d=require('fs').readFileSync('/dev/stdin','utf8');
    try { const j=JSON.parse(d); console.log(j['@odata.count'] || j['@count'] || j.totalItems || 'unknown'); }
    catch(e) { console.log('err'); }
  " 2>/dev/null)
  echo "${school},${count}"
done
