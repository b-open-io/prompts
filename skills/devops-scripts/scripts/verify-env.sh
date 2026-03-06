#!/usr/bin/env bash
# Verify that required environment variables are set.
# Usage: verify-env.sh VAR_ONE VAR_TWO VAR_THREE ...
# Outputs JSON: {"missing": [...], "present": [...], "all_set": true/false}
set -euo pipefail

if [ $# -eq 0 ]; then
  cat <<EOF
{"error": "No variable names provided. Usage: verify-env.sh VAR_ONE VAR_TWO ..."}
EOF
  exit 1
fi

missing=()
present=()

for var in "$@"; do
  if [ -n "${!var:-}" ]; then
    present+=("$var")
  else
    missing+=("$var")
  fi
done

all_set="true"
if [ ${#missing[@]} -gt 0 ]; then
  all_set="false"
fi

# Build JSON arrays
missing_json="["
for i in "${!missing[@]}"; do
  [ $i -gt 0 ] && missing_json+=", "
  missing_json+="\"${missing[$i]}\""
done
missing_json+="]"

present_json="["
for i in "${!present[@]}"; do
  [ $i -gt 0 ] && present_json+=", "
  present_json+="\"${present[$i]}\""
done
present_json+="]"

cat <<EOF
{
  "all_set": $all_set,
  "present": $present_json,
  "missing": $missing_json
}
EOF
