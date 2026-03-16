#!/bin/bash
# Save an X API bearer token for a specific username.
# Usage: save-token.sh --username <handle> --token <bearer_token>
#
# Validates the token against the X API before saving.
# Stores in .claude/persona/tokens.json keyed by username.
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
TOKENS_FILE="$PERSONA_DIR/tokens.json"
USERNAME=""
TOKEN=""

while [ $# -gt 0 ]; do
    case "$1" in
        --username) USERNAME="${2#@}"; shift 2 ;;
        --token) TOKEN="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
    echo "Error: --username and --token are required"
    echo "Usage: save-token.sh --username <handle> --token <bearer_token>"
    exit 1
fi

# Validate the token
echo "Validating token for @$USERNAME..."
http_code=$(curl -s -o /tmp/persona_token_check.json -w "%{http_code}" \
    "https://api.x.com/2/users/by/username/${USERNAME}" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")

if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    echo "Error: Token validation failed (HTTP $http_code)"
    cat /tmp/persona_token_check.json 2>/dev/null | jq -r '.title // .detail // .errors[0].detail // .' 2>/dev/null
    exit 1
fi

# Verify the response has the right user
response_username=$(cat /tmp/persona_token_check.json | jq -r '.data.username // empty' 2>/dev/null)
echo "Token valid — resolved @$USERNAME (API returned: @${response_username:-unknown})"

# Save to tokens.json
mkdir -p "$PERSONA_DIR"
if [ ! -f "$TOKENS_FILE" ]; then
    echo '{}' > "$TOKENS_FILE"
fi

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg u "$USERNAME" --arg t "$TOKEN" --arg d "$now" \
    '.[$u] = {"bearer": $t, "added": $d}' \
    "$TOKENS_FILE" > "${TOKENS_FILE}.tmp" && mv "${TOKENS_FILE}.tmp" "$TOKENS_FILE"

echo "Saved token for @$USERNAME to $TOKENS_FILE"

# Show all stored accounts
echo ""
echo "Available accounts:"
jq -r 'to_entries[] | "  @\(.key) — added \(.value.added)"' "$TOKENS_FILE"
