#!/usr/bin/env bash
# Release: commit, push, publish. Run after preflight + changelog.
# Delegates to publish.sh which handles auth automatically.
# Usage: release.sh [--access public] [--dry-run]
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
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

# Publish — delegates to publish.sh which handles auth automatically
echo "Publishing $PKG_NAME@$VERSION..."
bash "$SKILL_DIR/scripts/publish.sh" $EXTRA_FLAGS

echo ""
echo "$PKG_NAME@$VERSION publish complete."
echo "Run verify.sh in background to confirm registry propagation."
