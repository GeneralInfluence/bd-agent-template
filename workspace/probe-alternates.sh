#!/bin/bash
# Try alternate slugs for schools that 404'd

alternates=(
  "asunew"       # ASU
  "utaustin"     # UT Austin alt
  "uconn"        # UConn
  "ucsd"         # UC San Diego
  "ucdavis"      # UC Davis
  "ucsb"         # UC Santa Barbara
  "ucr"          # UC Riverside
  "uci"          # UC Irvine
  "calpoly"      # Cal Poly
  "sjsu"         # San Jose State
  "unc"          # UNC Chapel Hill
  "uga"          # Georgia
  "clemson"      # Clemson
  "uark"         # Arkansas
  "utk"          # Tennessee
  "uky"          # Kentucky
  "ua"           # Alabama
  "lsu"          # LSU
  "fsu"          # Florida State
  "usf"          # South Florida
  "ucf"          # Central Florida
  "temple"       # Temple
  "gwu"          # George Washington
  "american"     # American
  "gmu"          # George Mason
  "hofstra"      # Hofstra
  "fordham"      # Fordham
  "scu"          # Santa Clara
  "depaul"       # DePaul
  "loyola"       # Loyola
  "baylor"       # Baylor
  "tcu"          # TCU
  "smu"          # SMU
  "colorado"     # CU Boulder
  "usu"          # Utah State
  "byu"          # BYU
  "unlv"         # UNLV
  "unm"          # New Mexico
  "wsu"          # Washington State
  "oregonstate"  # Oregon State
  "hawaii"       # Hawaii
)

echo "school,status,total_orgs,url"
for school in "${alternates[@]}"; do
  url="https://${school}.campuslabs.com/engage/api/discovery/organization?\$count=true&top=0"
  response=$(curl -s -o /tmp/cl_alt.json -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    count=$(cat /tmp/cl_alt.json | node -e "
      const d=require('fs').readFileSync('/dev/stdin','utf8');
      try { const j=JSON.parse(d); console.log(j['@odata.count'] || 'unknown'); }
      catch(e) { console.log('err'); }
    " 2>/dev/null)
    echo "${school},200,${count},https://${school}.campuslabs.com/engage/"
  else
    echo "${school},${response},0,"
  fi
done
