#!/usr/bin/env bash
# npm-publish: Try publish, handle auth failure automatically.
# Happy path: token valid → OTP checkbox → done (one click).
# Auth failure: detect 404/401 → call setup-token.sh → retry.
# Usage: publish.sh [--access public] [--dry-run]
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTRA_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --access) EXTRA_FLAGS="$EXTRA_FLAGS --access $2"; shift 2 ;;
    --dry-run) EXTRA_FLAGS="$EXTRA_FLAGS --dry-run"; shift ;;
    *) shift ;;
  esac
done

# First attempt — succeeds if token in ~/.npmrc is valid.
# Pipe ENTER so bun auto-opens the OTP checkbox page.
echo "Publishing..."
OUTPUT=$(echo "" | bun publish $EXTRA_FLAGS 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$OUTPUT"
  exit 0
fi

# Check if failure is auth-related.
# npm returns 404 for scoped packages when token is expired (not 401),
# and ENEEDAUTH when no token exists at all.
if echo "$OUTPUT" | grep -qi "404\|401\|403\|unauthorized\|ENEEDAUTH\|authentication"; then
  echo "Auth token expired or missing. Setting up new token..."
  echo ""

  # Run token setup — fills npm form, user clicks Generate,
  # token is captured via clipboard and written to ~/.npmrc
  bash "$SKILL_DIR/scripts/setup-token.sh"
  SETUP_EXIT=$?

  if [ $SETUP_EXIT -ne 0 ]; then
    echo "ERROR: Token setup failed." >&2
    exit 1
  fi

  # Verify token works
  if ! npm whoami >/dev/null 2>&1; then
    echo "ERROR: New token is not valid." >&2
    exit 1
  fi
  echo "Token verified. Authenticated as: $(npm whoami)"
  echo ""

  # Retry publish with fresh token
  echo "Retrying publish..."
  echo "" | bun publish $EXTRA_FLAGS
else
  # Non-auth failure — show output and exit
  echo "$OUTPUT"
  exit $EXIT_CODE
fi
