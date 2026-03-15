#!/usr/bin/env bash
# npm-publish: Try publish, output status codes for agent to interpret.
# The agent orchestrates auth recovery — this script just reports status.
# Usage: publish.sh [--access public] [--dry-run]
set -uo pipefail

EXTRA_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --access) EXTRA_FLAGS="$EXTRA_FLAGS --access $2"; shift 2 ;;
    --dry-run) EXTRA_FLAGS="$EXTRA_FLAGS --dry-run"; shift ;;
    *) shift ;;
  esac
done

# Try publish — pipe ENTER for OTP browser prompt
OUTPUT=$(echo "" | bun publish $EXTRA_FLAGS 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$OUTPUT"
  echo "PUBLISH_SUCCESS"
  exit 0
fi

# Check if auth-related failure
if echo "$OUTPUT" | grep -qi "404\|401\|403\|unauthorized\|ENEEDAUTH\|authentication"; then
  echo "AUTH_FAILED"
  exit 1
else
  echo "$OUTPUT"
  echo "PUBLISH_ERROR"
  exit 1
fi
