#!/usr/bin/env bash
# Check if installed bopen-tools plugin is current vs GitHub.
# Outputs JSON. Completes in ~100ms (single HTTP request).
# Usage: check-version.sh [--plugin name@org] [--cache-dir path]
set -euo pipefail

PLUGIN_NAME="bopen-tools"
PLUGIN_ORG="b-open-io"
REPO="b-open-io/prompts"
CACHE_DIR="$HOME/.claude/plugins/cache"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plugin)
      PLUGIN_NAME="${2%%@*}"
      PLUGIN_ORG="${2##*@}"
      shift 2 ;;
    --cache-dir) CACHE_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Get local version from plugin cache (highest semver directory)
local_version=""
plugin_cache="$CACHE_DIR/$PLUGIN_ORG/$PLUGIN_NAME"
if [ -d "$plugin_cache" ]; then
  local_version=$(ls -1 "$plugin_cache" 2>/dev/null | grep -E '^[0-9]+\.' | sort -V | tail -1 || echo "")
fi

if [ -z "$local_version" ]; then
  cat <<EOF
{
  "plugin": "$PLUGIN_NAME",
  "org": "$PLUGIN_ORG",
  "local_version": null,
  "remote_version": null,
  "status": "not_installed",
  "message": "Plugin not found in cache at $plugin_cache"
}
EOF
  exit 0
fi

# Get remote version from GitHub (raw file, ~100ms)
remote_version=""
remote_json=$(curl -sf --max-time 3 "https://raw.githubusercontent.com/$REPO/master/.claude-plugin/plugin.json" 2>/dev/null || echo "")

if [ -n "$remote_json" ]; then
  remote_version=$(echo "$remote_json" | grep -o '"version": *"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
fi

if [ -z "$remote_version" ]; then
  cat <<EOF
{
  "plugin": "$PLUGIN_NAME",
  "org": "$PLUGIN_ORG",
  "local_version": "$local_version",
  "remote_version": null,
  "status": "check_failed",
  "message": "Could not fetch remote version from GitHub"
}
EOF
  exit 0
fi

# Compare versions
if [ "$local_version" = "$remote_version" ]; then
  status="current"
  message="Plugin is up to date"
else
  # Simple semver comparison using sort -V
  newer=$(printf '%s\n%s' "$local_version" "$remote_version" | sort -V | tail -1)
  if [ "$newer" = "$remote_version" ]; then
    status="outdated"
    message="Update available: $local_version -> $remote_version. Run: claude plugin update $PLUGIN_NAME@$PLUGIN_ORG"
  else
    status="ahead"
    message="Local version ($local_version) is ahead of remote ($remote_version)"
  fi
fi

cat <<EOF
{
  "plugin": "$PLUGIN_NAME",
  "org": "$PLUGIN_ORG",
  "local_version": "$local_version",
  "remote_version": "$remote_version",
  "status": "$status",
  "message": "$message"
}
EOF
