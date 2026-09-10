#!/usr/bin/env bash
# Pre-publish preflight: check versions, bump if needed, build, output commit log.
#
# Version logic:
#   - local == npm        → bump (patch/minor/major)
#   - local == npm+1      → perfect, publish as-is
#   - local > npm+1       → gap detected (abandoned bumps), reset to npm+1
#   - npm == "unpublished" → first publish, use local version as-is
#
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

# Helper: compute next version from a base
next_version() {
  local BASE="$1"
  local TYPE="$2"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE"
  case "$TYPE" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    *) PATCH=$((PATCH + 1)) ;;
  esac
  echo "$MAJOR.$MINOR.$PATCH"
}

# Helper: update version in package.json and plugin.json
set_version() {
  local OLD="$1"
  local NEW="$2"
  sed "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" package.json > package.json.tmp && mv package.json.tmp package.json

  PLUGIN_JSON=".claude-plugin/plugin.json"
  if [ -f "$PLUGIN_JSON" ]; then
    sed "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$PLUGIN_JSON" > "$PLUGIN_JSON.tmp" && mv "$PLUGIN_JSON.tmp" "$PLUGIN_JSON"
    echo "Updated $PLUGIN_JSON"
  fi
}

if [ "$NPM_VERSION" = "unpublished" ]; then
  # First publish — use whatever local version is set
  echo "First publish. Using local version $LOCAL_VERSION."

elif [ "$LOCAL_VERSION" = "$NPM_VERSION" ]; then
  # Local matches npm — need to bump
  NEW_VERSION=$(next_version "$NPM_VERSION" "$BUMP_TYPE")
  echo "Bumping: $LOCAL_VERSION → $NEW_VERSION"
  set_version "$LOCAL_VERSION" "$NEW_VERSION"
  LOCAL_VERSION="$NEW_VERSION"
  bun run build

else
  # Local differs from npm — check if it's exactly npm+1 or a gap
  EXPECTED=$(next_version "$NPM_VERSION" "$BUMP_TYPE")

  if [ "$LOCAL_VERSION" = "$EXPECTED" ]; then
    # Perfect — local is exactly one bump ahead
    echo "Version $LOCAL_VERSION is next after npm $NPM_VERSION. No bump needed."
  else
    # Gap detected — local jumped too far ahead (abandoned bumps)
    echo "Version gap detected: npm=$NPM_VERSION, local=$LOCAL_VERSION, expected=$EXPECTED"
    echo "Resetting to $EXPECTED (next $BUMP_TYPE after published version)"
    set_version "$LOCAL_VERSION" "$EXPECTED"
    LOCAL_VERSION="$EXPECTED"
    bun run build
  fi
fi

# Commit log since last tag or last 10 commits
echo ""
echo "=== COMMITS FOR CHANGELOG ==="
git log --oneline "$(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD" 2>/dev/null || git log --oneline -10
echo "=== END COMMITS ==="

echo ""
echo "Ready to release v$LOCAL_VERSION"
echo "Next: write CHANGELOG.md entry, then run release.sh"
