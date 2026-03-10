#!/usr/bin/env bash
# Release: commit, push, publish, verify. Run after preflight + changelog.
# Usage: release.sh [--access public] [--dry-run]
set -euo pipefail

EXTRA_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --access) EXTRA_FLAGS="$EXTRA_FLAGS --access $2"; shift 2 ;;
    --dry-run) EXTRA_FLAGS="$EXTRA_FLAGS --dry-run"; shift ;;
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
[ -f dist/index.js ] && git add -f dist/index.js
git diff --cached --quiet && { echo "Nothing to commit."; } || \
  git commit -m "Release v$VERSION"

# Push
echo "Pushing to $BRANCH..."
git push origin "$BRANCH"

# Publish (pipes ENTER so browser auth opens automatically)
echo "Publishing $PKG_NAME@$VERSION..."
echo "" | bun publish $EXTRA_FLAGS

# Done — verification is handled separately by the agent as a background task
echo ""
echo "$PKG_NAME@$VERSION publish complete."
echo "Run verify.sh in background to confirm registry propagation."
