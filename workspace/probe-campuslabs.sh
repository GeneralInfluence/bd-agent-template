#!/bin/bash
# Probe universities for CampusLabs/Engage API availability
# Pattern: https://<slug>.campuslabs.com/engage/api/discovery/organization?top=5

schools=(
  # Large US public universities
  "unr"        # Nevada Reno (known working)
  "asu"        # Arizona State
  "utexas"     # UT Austin
  "gatech"     # Georgia Tech
  "umich"      # Michigan
  "ucla"       # UCLA
  "berkeley"   # UC Berkeley
  "ufl"        # Florida
  "uw"         # Washington
  "osu"        # Ohio State
  "psu"        # Penn State
  "uiuc"       # Illinois
  "purdue"     # Purdue
  "umn"        # Minnesota
  "wisc"       # Wisconsin
  "umd"        # Maryland
  "vt"         # Virginia Tech
  "ncsu"       # NC State
  "tamu"       # Texas A&M
  "cu"         # Colorado
  "msu"        # Michigan State
  "iu"         # Indiana
  "uoregon"    # Oregon
  "arizona"    # Arizona
  "rutgers"    # Rutgers
  "pitt"       # Pittsburgh
  "usc"        # USC
  "nyu"        # NYU
  "bu"         # Boston University
  "northeastern" # Northeastern
  "rice"       # Rice
  "cmu"        # Carnegie Mellon
  "mit"        # MIT
  "stanford"   # Stanford
  "cornell"    # Cornell
  "duke"       # Duke
  "jhu"        # Johns Hopkins
  "emory"      # Emory
  "vanderbilt" # Vanderbilt
  "wustl"      # WashU St Louis
  "tulane"     # Tulane
  # Tech-focused
  "rit"        # RIT
  "wpi"        # WPI
  "drexel"     # Drexel
  "stevens"    # Stevens
  # International (less likely but worth trying)
  "uoft"       # Toronto
  "ubc"        # UBC
  "mcgill"     # McGill
  "kcl"        # King's College London
  "nus"        # NUS Singapore
)

echo "school,status,org_count,url"
for school in "${schools[@]}"; do
  url="https://${school}.campuslabs.com/engage/api/discovery/organization?top=5"
  response=$(curl -s -o /tmp/cl_response.json -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    count=$(cat /tmp/cl_response.json | node -e "
      const d=require('fs').readFileSync('/dev/stdin','utf8');
      try { const j=JSON.parse(d); console.log(j.value?.length || j.length || '?'); }
      catch(e) { console.log('parse_err'); }
    " 2>/dev/null)
    echo "${school},200,${count},${url}"
  else
    echo "${school},${response},0,"
  fi
done
