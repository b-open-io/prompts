#!/usr/bin/env bash
# Pre-publish preflight: check versions, bump if needed, build, output commit log.
# Usage: preflight.sh [patch|minor|major]
set -euo pipefail

BUMP_TYPE="${1:-patch}"
PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
LOCAL_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

# Run npm view and build in parallel
NPM_TMP=$(mktemp)
npm view "$PKG_NAME" version > "$NPM_TMP" 2>/dev/null &
NPM_PID=$!
bun run build &
BUILD_PID=$!

wait "$NPM_PID" 2>/dev/null && NPM_VERSION=$(cat "$NPM_TMP") || NPM_VERSION="unpublished"
rm -f "$NPM_TMP"
wait "$BUILD_PID"

echo "Package: $PKG_NAME"
echo "npm version: $NPM_VERSION"
echo "Local version: $LOCAL_VERSION"

# Bump if local matches npm (already published)
if [ "$LOCAL_VERSION" = "$NPM_VERSION" ]; then
  IFS='.' read -r MAJOR MINOR PATCH <<< "$LOCAL_VERSION"
  case "$BUMP_TYPE" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    *) PATCH=$((PATCH + 1)) ;;
  esac
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
  echo "Bumping: $LOCAL_VERSION → $NEW_VERSION"

  # Update package.json (portable sed: write to temp, then move)
  sed "s/\"version\": \"$LOCAL_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json > package.json.tmp && mv package.json.tmp package.json

  # Update plugin.json if it exists
  PLUGIN_JSON=".claude-plugin/plugin.json"
  if [ -f "$PLUGIN_JSON" ]; then
    sed "s/\"version\": \"$LOCAL_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PLUGIN_JSON" > "$PLUGIN_JSON.tmp" && mv "$PLUGIN_JSON.tmp" "$PLUGIN_JSON"
    echo "Updated $PLUGIN_JSON"
  fi

  LOCAL_VERSION="$NEW_VERSION"

  # Rebuild with new version
  bun run build
else
  echo "Version $LOCAL_VERSION not yet published. No bump needed."
fi

# Commit log since last tag or last 10 commits
echo ""
echo "=== COMMITS FOR CHANGELOG ==="
git log --oneline "$(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD" 2>/dev/null || git log --oneline -10
echo "=== END COMMITS ==="

echo ""
echo "Ready to release v$LOCAL_VERSION"
echo "Next: write CHANGELOG.md entry, then run release.sh"
