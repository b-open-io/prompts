#!/usr/bin/env bash
# Verify npm publish propagation with exponential backoff.
# Usage: verify.sh <package-name> <expected-version> [max-attempts]
set -euo pipefail

PKG="${1:?Usage: verify.sh <package-name> <expected-version> [max-attempts]}"
EXPECTED="${2:?Usage: verify.sh <package-name> <expected-version> [max-attempts]}"
MAX_ATTEMPTS="${3:-5}"
DELAYS=(0 5 10 20 40 60)

view_version() {
  local cache
  cache=$(mktemp -d)
  npm view "$1" version --cache "$cache" 2>/dev/null || echo unknown
  rm -rf "$cache"
}

for i in $(seq 0 $((MAX_ATTEMPTS - 1))); do
  DELAY=${DELAYS[$i]:-60}
  if [ "$DELAY" -gt 0 ]; then
    sleep "$DELAY"
  fi

  PUBLISHED=$(view_version "$PKG@$EXPECTED")
  if [ "$PUBLISHED" = "$EXPECTED" ]; then
    echo "$PKG@$EXPECTED verified after $((i + 1)) attempt(s)."
    exit 0
  fi
  echo "Attempt $((i + 1))/$MAX_ATTEMPTS: registry does not have $PKG@$EXPECTED yet (got $PUBLISHED). Retrying..."
done

echo "Registry still missing $PKG@$EXPECTED after $MAX_ATTEMPTS attempts."
echo "bun may have reported success before the registry document was visible."
exit 1
