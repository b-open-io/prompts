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

BRANCH=$(git branch --show-current)
REMOTE_DEFAULT_REF=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
DEFAULT_BRANCH="${REMOTE_DEFAULT_REF#origin/}"

# Older/local clones may not have origin/HEAD. Prefer the conventional branch
# that actually exists on origin rather than guessing a release target.
if [ -z "$DEFAULT_BRANCH" ] || [ "$DEFAULT_BRANCH" = "$REMOTE_DEFAULT_REF" ]; then
  for CANDIDATE in master main; do
    if git show-ref --verify --quiet "refs/remotes/origin/$CANDIDATE"; then
      DEFAULT_BRANCH="$CANDIDATE"
      break
    fi
  done
fi

if [ -z "$BRANCH" ] || [ -z "$DEFAULT_BRANCH" ]; then
  echo "DEFAULT_BRANCH_UNKNOWN: release requires a named branch and origin/HEAD (or origin/master/origin/main)." >&2
  exit 2
fi

if [ "$BRANCH" != "$DEFAULT_BRANCH" ]; then
  echo "WRONG_BRANCH: release must run from $DEFAULT_BRANCH (current: $BRANCH). No commit or push performed." >&2
  exit 2
fi

VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

# Stage all tracked changes + any new files the agent created (e.g. CHANGELOG.md)
# Uses git add -u for tracked files, then explicitly adds known release artifacts.
# Does NOT use git add -A (could catch .env, credentials, large binaries).
echo "Committing v$VERSION..."
git add -u
[ -f CHANGELOG.md ] && git add CHANGELOG.md
[ -f .claude-plugin/plugin.json ] && git add .claude-plugin/plugin.json

# Show what's staged so the agent can report it
STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
  echo "Nothing to commit."
else
  echo "Staged: $STAGED"
  git commit -m "Release v$VERSION"
fi

# Push
echo "Pushing to $BRANCH..."
git push origin "$BRANCH"

echo "RELEASE_DONE:$PKG_NAME:$VERSION:$EXTRA_FLAGS"
