#!/usr/bin/env bash
# npm-publish: Runs bun publish with ENTER piped to stdin so the browser
# auth prompt opens automatically. One command handles auth + OTP + publish.
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

# Pipe ENTER so bun doesn't block on "press ENTER to open in browser"
echo "" | bun publish $EXTRA_FLAGS
