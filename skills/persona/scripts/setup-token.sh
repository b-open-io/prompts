#!/bin/bash
# Interactive X API token setup via Chrome DevTools Protocol.
# Opens the X developer portal, checks login state, and reports page structure
# so the model can drive the rest via CDP commands.
#
# Usage: setup-token.sh --username <handle> [--cdp-script <path>]
#
# This script handles the opening and prerequisites. The model follows the
# CDP playbook in SKILL.md to navigate the portal and extract the token.
set -e

TOKENS_DIR="${HOME}/.claude/persona"
TOKENS_FILE="$TOKENS_DIR/tokens.json"
USERNAME=""
CDP_SCRIPT=""

while [ $# -gt 0 ]; do
    case "$1" in
        --username) USERNAME="${2#@}"; shift 2 ;;
        --cdp-script) CDP_SCRIPT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$USERNAME" ]; then
    echo "Error: --username is required"
    echo "Usage: setup-token.sh --username <handle> [--cdp-script <path>]"
    exit 1
fi

mkdir -p "$TOKENS_DIR"

# Initialize tokens file if missing
if [ ! -f "$TOKENS_FILE" ]; then
    echo '{}' > "$TOKENS_FILE"
fi

# Check if we already have a working token for this username
existing_token=$(jq -r --arg u "$USERNAME" '.[$u].bearer // empty' "$TOKENS_FILE" 2>/dev/null)
if [ -n "$existing_token" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://api.x.com/2/users/by/username/twitter" \
        -H "Authorization: Bearer $existing_token" 2>/dev/null || echo "000")
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "ALREADY_VALID"
        echo "Token for @$USERNAME is already valid (HTTP $http_code)"
        exit 0
    fi
    echo "Existing token for @$USERNAME is invalid (HTTP $http_code), need a new one"
fi

# Require CDP script
if [ -z "$CDP_SCRIPT" ]; then
    # Try to find it automatically
    CDP_SCRIPT=$(ls "${HOME}"/.claude/plugins/cache/b-open-io/bopen-tools/*/skills/chrome-cdp/scripts/cdp.ts 2>/dev/null | tail -1)
fi

if [ -z "$CDP_SCRIPT" ] || [ ! -f "$CDP_SCRIPT" ]; then
    echo "NO_CDP"
    echo "Chrome CDP script not found. Manual setup required."
    echo "Open: https://developer.x.com/en/portal/dashboard"
    echo "Copy your Bearer Token, then run:"
    echo "  save-token.sh --username $USERNAME --token <token>"
    exit 1
fi

# Check Chrome CDP is available
if ! bun "$CDP_SCRIPT" list >/dev/null 2>&1; then
    echo "NO_CHROME"
    echo "Chrome remote debugging not enabled."
    echo "Run: bun $CDP_SCRIPT enable"
    echo "Then toggle the switch in Chrome settings and retry."
    exit 1
fi

# Get a tab to work with — prefer an existing empty/new tab, or create one
TAB_ID=$(bun "$CDP_SCRIPT" list 2>/dev/null | grep -i "new tab\|chrome://newtab" | head -1 | awk '{print $1}')
if [ -z "$TAB_ID" ]; then
    # Use the first available tab
    TAB_ID=$(bun "$CDP_SCRIPT" list 2>/dev/null | head -1 | awk '{print $1}')
fi

if [ -z "$TAB_ID" ]; then
    echo "NO_TABS"
    echo "No Chrome tabs available. Open Chrome and retry."
    exit 1
fi

echo "CDP_READY"
echo "TAB_ID=$TAB_ID"
echo "CDP_SCRIPT=$CDP_SCRIPT"
echo "USERNAME=$USERNAME"

# Navigate to the developer portal
echo "Navigating to X Developer Portal..."
bun "$CDP_SCRIPT" nav "$TAB_ID" "https://developer.x.com/en/portal/dashboard" 2>/dev/null

# Give the page a moment to fully render
sleep 2

# Take a snapshot so the model can see the page state
echo ""
echo "PAGE_SNAPSHOT:"
bun "$CDP_SCRIPT" snap "$TAB_ID" 2>/dev/null
