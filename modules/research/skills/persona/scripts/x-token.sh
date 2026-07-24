#!/bin/bash
# Shared X API token resolution — sourced by capture.sh, track.sh, draft.sh.
#
# Resolution order:
#   1. tokens.json lookup by username (if RESOLVE_USERNAME is set)
#   2. X_BEARER_TOKEN env var
#   3. X_ACCESS_TOKEN env var
#   4. OAuth refresh (X_REFRESH_TOKEN + X_CLIENT_SECRET_ID)
#   5. Fail with TOKEN_SETUP_NEEDED error (model should offer browser setup)
#
# Usage:
#   source x-token.sh
#   RESOLVE_USERNAME="wildsatchmo" TOKEN=$(resolve_x_token) || exit 1
#
# Multi-account: tokens are stored in ~/.claude/persona/tokens.json (user-global,
# outside any repo, never committed). The RESOLVE_USERNAME variable tells the
# resolver which account to check first.

TOKENS_FILE="${HOME}/.claude/persona/tokens.json"

_validate_token() {
    local token="$1"
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://api.x.com/2/users/by/username/twitter" \
        -H "Authorization: Bearer $token" 2>/dev/null || echo "000")
    echo "$http_code"
}

resolve_x_token() {
    # 1. Try tokens.json lookup by username (multi-account support)
    if [ -n "$RESOLVE_USERNAME" ] && [ -f "$TOKENS_FILE" ]; then
        local stored_token
        stored_token=$(jq -r --arg u "$RESOLVE_USERNAME" '.[$u].bearer // empty' "$TOKENS_FILE" 2>/dev/null)
        if [ -n "$stored_token" ]; then
            local http_code
            http_code=$(_validate_token "$stored_token")
            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                echo "$stored_token"
                return 0
            fi
            echo "Warning: stored token for @$RESOLVE_USERNAME returned HTTP $http_code" >&2
        fi
    fi

    # 2. Try any valid token from tokens.json (fallback across accounts)
    if [ -f "$TOKENS_FILE" ]; then
        local usernames
        usernames=$(jq -r 'keys[]' "$TOKENS_FILE" 2>/dev/null)
        for u in $usernames; do
            [ "$u" = "$RESOLVE_USERNAME" ] && continue  # Already tried above
            local token
            token=$(jq -r --arg u "$u" '.[$u].bearer // empty' "$TOKENS_FILE" 2>/dev/null)
            if [ -n "$token" ]; then
                local http_code
                http_code=$(_validate_token "$token")
                if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
                    echo "Using token from @$u account" >&2
                    echo "$token"
                    return 0
                fi
            fi
        done
    fi

    # 3. Try X_BEARER_TOKEN env var
    if [ -n "$X_BEARER_TOKEN" ]; then
        local http_code
        http_code=$(_validate_token "$X_BEARER_TOKEN")
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "$X_BEARER_TOKEN"
            return 0
        fi
        echo "Warning: X_BEARER_TOKEN returned HTTP $http_code" >&2
    fi

    # 4. Try OAuth user access token
    if [ -n "$X_ACCESS_TOKEN" ]; then
        local http_code
        http_code=$(_validate_token "$X_ACCESS_TOKEN")
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "$X_ACCESS_TOKEN"
            return 0
        fi
        echo "Warning: X_ACCESS_TOKEN returned HTTP $http_code, attempting refresh..." >&2
    fi

    # 5. Try refresh if we have the credentials
    if [ -n "$X_REFRESH_TOKEN" ] && [ -n "$X_CLIENT_SECRET_ID" ]; then
        local refresh_response
        refresh_response=$(curl -s "https://api.x.com/2/oauth2/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "grant_type=refresh_token&refresh_token=$X_REFRESH_TOKEN&client_id=$X_CLIENT_SECRET_ID")
        local new_token
        new_token=$(echo "$refresh_response" | jq -r '.access_token // empty')
        if [ -n "$new_token" ]; then
            export X_ACCESS_TOKEN="$new_token"
            local new_refresh
            new_refresh=$(echo "$refresh_response" | jq -r '.refresh_token // empty')
            if [ -n "$new_refresh" ]; then
                export X_REFRESH_TOKEN="$new_refresh"
            fi
            echo "Token refreshed via OAuth" >&2
            echo "$new_token"
            return 0
        fi
        echo "Token refresh failed: $(echo "$refresh_response" | jq -r '.error_description // .error // "unknown"')" >&2
    fi

    # 6. All methods exhausted — emit structured error for the model
    echo "TOKEN_SETUP_NEEDED" >&2
    if [ -n "$RESOLVE_USERNAME" ]; then
        echo "No valid X token for @$RESOLVE_USERNAME" >&2
    else
        echo "No valid X token available" >&2
    fi
    echo "Run: setup-token.sh --username <handle>" >&2
    return 1
}
