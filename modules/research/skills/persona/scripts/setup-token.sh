#!/bin/bash
# X API token setup via Chrome DevTools Protocol.
# Uses the chrome-cdp skill (bun cdp.ts) to navigate the X developer portal.
#
# Two-phase flow:
#   setup-token.sh navigate --username <handle>   → opens portal, detects login state
#   setup-token.sh capture  --username <handle>    → extracts token from Keys page
#
# Status codes for model orchestration:
#   ALREADY_VALID    — existing token works
#   NAVIGATED        — portal is open, model drives navigation via CDP
#   NOT_LOGGED_IN    — user needs to log into X in Chrome
#   TOKEN_SAVED      — token extracted and saved
#   CAPTURE_TIMEOUT  — couldn't find token
#   NO_BROWSER       — Chrome CDP not available
set -e

TOKENS_DIR="${HOME}/.claude/persona"
TOKENS_FILE="$TOKENS_DIR/tokens.json"
USERNAME=""
ACTION="${1:-navigate}"
shift 2>/dev/null || true

while [ $# -gt 0 ]; do
    case "$1" in
        --username) USERNAME="${2#@}"; shift 2 ;;
        *) shift ;;
    esac
done

if [ -z "$USERNAME" ]; then
    echo "Error: --username is required"
    echo "Usage: setup-token.sh <navigate|capture> --username <handle>"
    exit 1
fi

mkdir -p "$TOKENS_DIR"
if [ ! -f "$TOKENS_FILE" ]; then
    echo '{}' > "$TOKENS_FILE"
fi

# Check if we already have a working token
existing_token=$(jq -r --arg u "$USERNAME" '.[$u].bearer // empty' "$TOKENS_FILE" 2>/dev/null)
if [ -n "$existing_token" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://api.x.com/2/users/by/username/twitter" \
        -H "Authorization: Bearer $existing_token" 2>/dev/null || echo "000")
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "ALREADY_VALID"
        echo "Token for @$USERNAME works (HTTP $http_code)"
        exit 0
    fi
    echo "Existing token invalid (HTTP $http_code), setting up new one..." >&2
fi

# Find chrome-cdp script
CDP_SCRIPT=$(ls "${HOME}"/.claude/plugins/cache/b-open-io/bopen-tools/*/skills/chrome-cdp/scripts/cdp.ts 2>/dev/null | sort -t/ -k9 -V | tail -1)
if [ -z "$CDP_SCRIPT" ] || [ ! -f "$CDP_SCRIPT" ]; then
    echo "NO_BROWSER"
    echo "Chrome CDP skill not found."
    echo "Manually get your token at: https://developer.x.com/en/portal/dashboard"
    echo "Then run: save-token.sh --username $USERNAME --token <bearer_token>"
    exit 1
fi

CDP="bun $CDP_SCRIPT"

# Check Chrome is reachable (with timeout — cdp list is fast)
if ! $CDP list >/dev/null 2>&1; then
    echo "NO_BROWSER"
    echo "Chrome remote debugging not enabled."
    echo "Run: $CDP enable"
    echo "Then toggle the switch in Chrome and retry."
    exit 1
fi

# ============================================================
# Phase 1: Navigate to the developer portal
# ============================================================
if [ "$ACTION" = "navigate" ]; then
    # Find a tab to use — prefer new tab, otherwise first data row (skip 2-line header)
    TAB_ID=$($CDP list 2>/dev/null | grep -i "new tab\|chrome://newtab" | awk '{print $1}' | head -1)
    if [ -z "$TAB_ID" ]; then
        TAB_ID=$($CDP list 2>/dev/null | awk 'NR>2 && /^  [0-9A-F]/ {print $1; exit}')
    fi

    if [ -z "$TAB_ID" ]; then
        echo "NO_BROWSER"
        echo "No Chrome tabs available."
        exit 1
    fi

    echo "Opening X Developer Portal..."
    $CDP nav "$TAB_ID" "https://developer.x.com/en/portal/dashboard" 2>/dev/null || true
    sleep 3

    # Snapshot to check login state
    SNAP=$($CDP snap "$TAB_ID" 2>/dev/null || true)

    # Check for login prompt
    if echo "$SNAP" | grep -qi "log in\|sign in\|username.*password\|Log in to X"; then
        echo "NOT_LOGGED_IN"
        echo "TAB_ID=$TAB_ID"
        echo "You need to log into X in Chrome first."
        exit 0
    fi

    # Look for project/app links
    APPS=$($CDP eval "$TAB_ID" '[...document.querySelectorAll("a")].filter(a => a.href && a.href.includes("/portal/projects/")).map(a => ({text: a.textContent.trim(), href: a.href}))' 2>/dev/null || true)

    echo "NAVIGATED"
    echo "TAB_ID=$TAB_ID"
    echo "CDP_SCRIPT=$CDP_SCRIPT"
    echo ""
    echo "PAGE_SNAPSHOT:"
    echo "$SNAP"
    echo ""
    echo "APPS_FOUND:"
    echo "$APPS"
    exit 0
fi

# ============================================================
# Phase 2: Capture the bearer token from Keys and tokens page
# ============================================================
if [ "$ACTION" = "capture" ]; then
    # Find the tab on developer.x.com, or first data row
    TAB_ID=$($CDP list 2>/dev/null | grep "developer.x.com" | awk '{print $1}' | head -1)
    if [ -z "$TAB_ID" ]; then
        TAB_ID=$($CDP list 2>/dev/null | awk 'NR>2 && /^  [0-9A-F]/ {print $1; exit}')
    fi

    echo "Looking for Bearer Token on current page..."

    # Try to extract token from the page
    # Bearer tokens from X start with "AAAA" and are long base64 strings
    for i in $(seq 1 30); do
        # Method 1: Look for token text directly on the page
        BEARER=$($CDP eval "$TAB_ID" '
            // Look in inputs, code blocks, and text elements
            var els = document.querySelectorAll("input, code, pre, span, p, div");
            var found = "";
            for (var el of els) {
                var text = el.value || el.textContent || "";
                var match = text.match(/AAAA[A-Za-z0-9%+\/=]{50,}/);
                if (match) { found = match[0]; break; }
            }
            found;
        ' 2>/dev/null | tr -d '"' || true)

        if [ -n "$BEARER" ] && [ ${#BEARER} -gt 50 ]; then
            # Validate it
            http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                "https://api.x.com/2/users/by/username/$USERNAME" \
                -H "Authorization: Bearer $BEARER" 2>/dev/null || echo "000")

            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                jq --arg u "$USERNAME" --arg t "$BEARER" --arg d "$now" \
                    '.[$u] = {"bearer": $t, "added": $d}' \
                    "$TOKENS_FILE" > "${TOKENS_FILE}.tmp" && mv "${TOKENS_FILE}.tmp" "$TOKENS_FILE"

                echo "TOKEN_SAVED"
                echo "Bearer token for @$USERNAME saved"
                echo "Validated: HTTP $http_code"
                exit 0
            fi
        fi

        # Method 2: Try clicking a Copy/Reveal button if present
        SNAP=$($CDP snap "$TAB_ID" 2>/dev/null || true)
        # Look for buttons with copy/reveal/regenerate text
        COPY_BTN=$($CDP eval "$TAB_ID" '
            var btns = [...document.querySelectorAll("button")];
            var copy = btns.find(b => /copy|reveal|show/i.test(b.textContent));
            copy ? "found" : "";
        ' 2>/dev/null | tr -d '"' || true)

        if [ "$COPY_BTN" = "found" ]; then
            $CDP eval "$TAB_ID" '
                var btns = [...document.querySelectorAll("button")];
                var copy = btns.find(b => /copy|reveal|show/i.test(b.textContent));
                if (copy) copy.click();
            ' 2>/dev/null || true
            sleep 2

            # Check clipboard
            CLIP=$(pbpaste 2>/dev/null || true)
            if [ -n "$CLIP" ] && [ ${#CLIP} -gt 50 ]; then
                http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                    "https://api.x.com/2/users/by/username/$USERNAME" \
                    -H "Authorization: Bearer $CLIP" 2>/dev/null || echo "000")

                if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                    jq --arg u "$USERNAME" --arg t "$CLIP" --arg d "$now" \
                        '.[$u] = {"bearer": $t, "added": $d}' \
                        "$TOKENS_FILE" > "${TOKENS_FILE}.tmp" && mv "${TOKENS_FILE}.tmp" "$TOKENS_FILE"

                    # Clear clipboard
                    echo -n "" | pbcopy 2>/dev/null || true

                    echo "TOKEN_SAVED"
                    echo "Bearer token for @$USERNAME saved (from clipboard)"
                    echo "Validated: HTTP $http_code"
                    exit 0
                fi
            fi
        fi

        sleep 2
    done

    echo "CAPTURE_TIMEOUT"
    echo "Could not find Bearer Token after 60 seconds."
    echo "If you can see the token, copy it and run:"
    echo "  save-token.sh --username $USERNAME --token <token>"
    exit 1
fi

echo "Unknown action: $ACTION"
echo "Usage: setup-token.sh <navigate|capture> --username <handle>"
exit 1
