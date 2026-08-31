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
# shellcheck disable=SC2086 # Parsed above into fixed publish flags.
OUTPUT=$(echo "" | bun publish $EXTRA_FLAGS 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$OUTPUT"
  echo "PUBLISH_SUCCESS"
  exit 0
fi

echo "$OUTPUT"

# npm reports an immutable-version collision as HTTP 403. Check this before
# authentication so an already-published version never triggers token rotation.
if echo "$OUTPUT" | grep -Eqi \
  "cannot publish over (the )?previously published versions?|version[^[:cntrl:]]*already (exists|been published)|cannot publish the same version"; then
  echo "VERSION_ALREADY_PUBLISHED"
  exit 1
fi

# Match authentication evidence, not generic HTTP status codes. npm also uses
# 403/404 for package, permission, and version errors that token rotation cannot fix.
if echo "$OUTPUT" | grep -Eqi \
  "ENEEDAUTH|E401|401[^[:cntrl:]]*(unauthorized|authentication)|unable to authenticate|authentication (token|is required|required)|access token[^[:cntrl:]]*(expired|revoked|invalid)|token[^[:cntrl:]]*(expired|revoked)|not logged in"; then
  echo "AUTH_FAILED"
  exit 1
fi

echo "PUBLISH_ERROR"
exit 1
