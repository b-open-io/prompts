#!/usr/bin/env bash
# npm-publish: Ensures npm auth is valid, then publishes.
# If token is expired, auto-opens browser for web login.
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

# Check auth first — if expired, login via browser before publishing
if ! npm whoami >/dev/null 2>&1; then
  echo "npm token expired or missing. Opening browser for login..."
  npm login --auth-type=web
  # Verify login succeeded
  if ! npm whoami >/dev/null 2>&1; then
    echo "ERROR: npm login failed. Cannot publish." >&2
    exit 1
  fi
  echo "Authenticated as: $(npm whoami)"
fi

# Pipe ENTER so bun doesn't block on "press ENTER to open in browser"
echo "" | bun publish $EXTRA_FLAGS
