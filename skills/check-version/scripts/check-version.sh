#!/usr/bin/env bash
# Check if installed core plugin is current vs GitHub.
# Outputs JSON. Completes in ~100ms (single HTTP request).
# Usage: check-version.sh [--plugin name@org] [--cache-dir path]
set -euo pipefail

PLUGIN_NAME="core"
PLUGIN_ORG="b-open-io"
CACHE_DIR="$HOME/.claude/plugins/cache"
MARKETPLACE_REPO="b-open-io/claude-plugins"

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

# Resolve where this plugin actually lives. Ten of our plugins are git-subdir
# entries in one repo and the rest are scattered across separate repos and
# owners, so the manifest path has to come from the marketplace rather than a
# constant.
marketplace_json=$(curl -sf --max-time 3 \
  "https://raw.githubusercontent.com/$MARKETPLACE_REPO/master/.claude-plugin/marketplace.json" \
  2>/dev/null || echo "")

manifest_paths=$(
  PLUGIN="$PLUGIN_NAME" python3 -c '
import json, os, sys

try:
    market = json.load(sys.stdin)
except ValueError:
    sys.exit(0)

name = os.environ["PLUGIN"]
entry = next((p for p in market.get("plugins", []) if p.get("name") == name), None)
if not entry:
    sys.exit(0)

source = entry.get("source") or {}
url = source.get("url") or ""
if not url.startswith("https://github.com/"):
    sys.exit(0)
repo = url[len("https://github.com/"):].removesuffix(".git")

subdir = (source.get("path") or "").strip("/")
manifest = f"{subdir}/.claude-plugin/plugin.json" if subdir else ".claude-plugin/plugin.json"

# The entry names a ref only when it is not the default branch, and the two
# defaults in play across these repos are master and main.
refs = [source["ref"]] if source.get("ref") else ["master", "main"]
for ref in refs:
    print(f"https://raw.githubusercontent.com/{repo}/{ref}/{manifest}")
' <<<"$marketplace_json" 2>/dev/null || echo ""
)

remote_version=""
for manifest_url in $manifest_paths; do
  remote_json=$(curl -sf --max-time 3 "$manifest_url" 2>/dev/null || echo "")
  if [ -n "$remote_json" ]; then
    remote_version=$(echo "$remote_json" | grep -o '"version": *"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
    [ -n "$remote_version" ] && break
  fi
done

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
