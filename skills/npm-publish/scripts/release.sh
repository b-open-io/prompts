#!/usr/bin/env bash
# Release: commit and push. Does NOT publish — the agent calls publish.sh
# separately so it can orchestrate auth recovery if needed.
# Usage: release.sh [--access public] [--dry-run]
set -euo pipefail

# Pass-through flags (stored for the agent to use with publish.sh)
EXTRA_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --access) EXTRA_FLAGS="--access $2"; shift 2 ;;
    --dry-run) EXTRA_FLAGS="--dry-run"; shift ;;
    *) shift ;;
  esac
done

VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
BRANCH=$(git branch --show-current)

# Stage and commit
echo "Committing v$VERSION..."
git add package.json
[ -f CHANGELOG.md ] && git add CHANGELOG.md
[ -f .claude-plugin/plugin.json ] && git add .claude-plugin/plugin.json
git diff --cached --quiet && { echo "Nothing to commit."; } || \
  git commit -m "Release v$VERSION"

# Push
echo "Pushing to $BRANCH..."
git push origin "$BRANCH"

echo "RELEASE_DONE:$PKG_NAME:$VERSION:$EXTRA_FLAGS"
