#!/usr/bin/env bash
# Verify npm publish propagation with exponential backoff.
# Usage: verify.sh <package-name> <expected-version> [max-attempts]
# Exits 0 when verified, 1 after all attempts exhausted.
set -euo pipefail

PKG="${1:?Usage: verify.sh <package-name> <expected-version> [max-attempts]}"
EXPECTED="${2:?Usage: verify.sh <package-name> <expected-version> [max-attempts]}"
MAX_ATTEMPTS="${3:-5}"

# Backoff schedule: 5s, 10s, 20s, 40s, 60s (total ~2.25 min)
DELAYS=(5 10 20 40 60)

for i in $(seq 0 $((MAX_ATTEMPTS - 1))); do
  DELAY=${DELAYS[$i]:-60}
  sleep "$DELAY"

  PUBLISHED=$(npm view "$PKG" version 2>/dev/null || echo "unknown")
  if [ "$PUBLISHED" = "$EXPECTED" ]; then
    echo "$PKG@$EXPECTED verified after $((i + 1)) attempt(s)."
    exit 0
  fi
  echo "Attempt $((i + 1))/$MAX_ATTEMPTS: registry shows $PUBLISHED, expected $EXPECTED. Retrying in ${DELAYS[$((i + 1))]:-60}s..."
done

echo "Registry still shows $(npm view "$PKG" version 2>/dev/null || echo 'unknown') after $MAX_ATTEMPTS attempts."
echo "Package was likely published — registry propagation can take up to 5 minutes."
exit 1
