#!/bin/bash
# Interactive X API token setup via Chrome DevTools Protocol.
# Opens the X developer portal in the user's browser, helps them grab a bearer token,
# and saves it to .claude/persona/tokens.json keyed by username.
#
# Usage: setup-token.sh --username <handle> [--cdp-script <path>]
#
# Requires Chrome with remote debugging enabled.
# If CDP isn't available, falls back to manual instructions.
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
TOKENS_FILE="$PERSONA_DIR/tokens.json"
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

mkdir -p "$PERSONA_DIR"

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
        echo "Token for @$USERNAME is already valid (HTTP $http_code)"
        exit 0
    fi
    echo "Existing token for @$USERNAME is invalid (HTTP $http_code), need a new one"
fi

# Try to open X developer portal via Chrome CDP
if [ -n "$CDP_SCRIPT" ] && [ -f "$CDP_SCRIPT" ]; then
    echo "Opening X Developer Portal in Chrome..."
    # Check if Chrome CDP is available
    if bun "$CDP_SCRIPT" list >/dev/null 2>&1; then
        # Open the developer portal
        bun "$CDP_SCRIPT" nav "$(bun "$CDP_SCRIPT" list 2>/dev/null | head -1 | awk '{print $1}')" \
            "https://developer.x.com/en/portal/dashboard" 2>/dev/null || true
        echo ""
        echo "The X Developer Portal should be open in Chrome."
        echo ""
        echo "To get your Bearer Token:"
        echo "  1. Click on your app (or create one if needed)"
        echo "  2. Go to 'Keys and tokens'"
        echo "  3. Under 'Bearer Token', click 'Regenerate' (or copy if shown)"
        echo "  4. Copy the token value"
        echo ""
    else
        echo "Chrome remote debugging not available."
        echo "Open this URL manually: https://developer.x.com/en/portal/dashboard"
        echo ""
        echo "To get your Bearer Token:"
        echo "  1. Click on your app (or create one if needed)"
        echo "  2. Go to 'Keys and tokens'"
        echo "  3. Under 'Bearer Token', click 'Regenerate' (or copy if shown)"
        echo "  4. Copy the token value"
        echo ""
    fi
else
    echo "Open this URL: https://developer.x.com/en/portal/dashboard"
    echo ""
    echo "To get your Bearer Token:"
    echo "  1. Click on your app (or create one if needed)"
    echo "  2. Go to 'Keys and tokens'"
    echo "  3. Under 'Bearer Token', click 'Regenerate' (or copy if shown)"
    echo "  4. Copy the token value"
    echo ""
fi

echo "WAITING_FOR_TOKEN"
echo "Paste the bearer token for @$USERNAME and the model will save it."
