#!/bin/bash
# X API token setup via browser automation.
# Uses agent-browser to navigate the X developer portal, find the bearer token,
# and save it to ~/.claude/persona/tokens.json.
#
# Two-phase flow (matches npm-publish pattern):
#   setup-token.sh navigate --username <handle>   → opens portal, detects login state
#   setup-token.sh capture  --username <handle>    → polls for token on Keys page
#
# Status codes for model orchestration:
#   ALREADY_VALID    — existing token works, nothing to do
#   NAVIGATED        — portal is open, model should drive to Keys and tokens
#   NOT_LOGGED_IN    — user needs to log into X in Chrome first
#   TOKEN_SAVED      — token extracted and saved
#   CAPTURE_TIMEOUT  — polling timed out waiting for token
#   NO_BROWSER       — agent-browser not available
set -e

TOKENS_DIR="${HOME}/.claude/persona"
TOKENS_FILE="$TOKENS_DIR/tokens.json"
AB="agent-browser --auto-connect"
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

# Initialize tokens file if missing
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

# Check agent-browser is available
if ! command -v agent-browser >/dev/null 2>&1; then
    echo "NO_BROWSER"
    echo "agent-browser not found. Install with: bun install -g agent-browser"
    echo "Or manually get your token at: https://developer.x.com/en/portal/dashboard"
    echo "Then run: save-token.sh --username $USERNAME --token <bearer_token>"
    exit 1
fi

# Check Chrome is reachable
if ! $AB snapshot -i >/dev/null 2>&1; then
    echo "NO_BROWSER"
    echo "Cannot connect to Chrome. Make sure Chrome is running with remote debugging enabled."
    echo "Or manually get your token at: https://developer.x.com/en/portal/dashboard"
    exit 1
fi

ab_nav() {
    $AB open "$1" 2>/dev/null || true
    sleep 3
}

# ============================================================
# Phase 1: Navigate to the developer portal
# ============================================================
if [ "$ACTION" = "navigate" ]; then
    echo "Opening X Developer Portal..."
    ab_nav "https://developer.x.com/en/portal/dashboard"

    # Snapshot to check login state and find apps
    SNAP=$($AB snapshot -i 2>/dev/null || true)

    # Check for login prompt
    if echo "$SNAP" | grep -qi "log in\|sign in\|sign up\|username.*password"; then
        echo "NOT_LOGGED_IN"
        echo "You need to log into X in Chrome first."
        echo "Log in at x.com, then run this again."
        exit 0
    fi

    # Look for project/app links
    APPS=$($AB eval '[...document.querySelectorAll("a")].filter(a => a.href && a.href.includes("/portal/projects/")).map(a => ({text: a.textContent.trim(), href: a.href}))' 2>/dev/null || true)

    echo "NAVIGATED"
    echo "USERNAME=$USERNAME"
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
    echo "Looking for Bearer Token on the current page..."

    # Poll for up to 120 seconds (60 iterations × 2 seconds)
    for i in $(seq 1 60); do
        SNAP=$($AB snapshot -i -C 2>/dev/null || true)

        # Look for a Copy button near Bearer Token
        COPY_REF=$(echo "$SNAP" | grep -i 'copy' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=//' || true)

        if [ -n "$COPY_REF" ]; then
            # Click Copy to put token on clipboard
            $AB click "@$COPY_REF" >/dev/null 2>&1 || true
            sleep 1
            TOKEN=$(pbpaste 2>/dev/null || true)

            # Bearer tokens are long base64-ish strings
            if [ -n "$TOKEN" ] && [ ${#TOKEN} -gt 50 ]; then
                # Validate it actually works
                http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                    "https://api.x.com/2/users/by/username/$USERNAME" \
                    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")

                if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                    # Save it
                    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                    jq --arg u "$USERNAME" --arg t "$TOKEN" --arg d "$now" \
                        '.[$u] = {"bearer": $t, "added": $d}' \
                        "$TOKENS_FILE" > "${TOKENS_FILE}.tmp" && mv "${TOKENS_FILE}.tmp" "$TOKENS_FILE"

                    # Clear clipboard for security
                    echo -n "" | pbcopy 2>/dev/null || true

                    echo "TOKEN_SAVED"
                    echo "Bearer token for @$USERNAME saved to $TOKENS_FILE"
                    echo "Validated: HTTP $http_code"
                    exit 0
                else
                    echo "Clipboard had a long string but it failed validation (HTTP $http_code), continuing..." >&2
                fi
            fi
        fi

        # Also try to find the token in the page text directly
        BEARER=$($AB eval 'document.body.innerText' 2>/dev/null | grep -oE 'AAAA[A-Za-z0-9%]{50,}' | head -1 || true)
        if [ -n "$BEARER" ]; then
            http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                "https://api.x.com/2/users/by/username/$USERNAME" \
                -H "Authorization: Bearer $BEARER" 2>/dev/null || echo "000")

            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                jq --arg u "$USERNAME" --arg t "$BEARER" --arg d "$now" \
                    '.[$u] = {"bearer": $t, "added": $d}' \
                    "$TOKENS_FILE" > "${TOKENS_FILE}.tmp" && mv "${TOKENS_FILE}.tmp" "$TOKENS_FILE"

                echo "TOKEN_SAVED"
                echo "Bearer token for @$USERNAME extracted from page and saved"
                echo "Validated: HTTP $http_code"
                exit 0
            fi
        fi

        sleep 2
    done

    echo "CAPTURE_TIMEOUT"
    echo "Could not find Bearer Token after 120 seconds."
    echo "If you can see the token, copy it and run:"
    echo "  save-token.sh --username $USERNAME --token <token>"
    exit 1
fi

echo "Unknown action: $ACTION"
echo "Usage: setup-token.sh <navigate|capture> --username <handle>"
exit 1
