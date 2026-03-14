#!/bin/bash
# Shared X API token resolution — sourced by capture.sh and track.sh.
# Tries tokens in order: X_BEARER_TOKEN → X_ACCESS_TOKEN → refresh via OAuth.
# Usage: source x-token.sh; TOKEN=$(resolve_x_token) || exit 1

resolve_x_token() {
    # 1. Try app-only bearer token (preferred for read operations — never expires)
    if [ -n "$X_BEARER_TOKEN" ]; then
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api.x.com/2/users/by/username/twitter" \
            -H "Authorization: Bearer $X_BEARER_TOKEN")
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "$X_BEARER_TOKEN"
            return 0
        fi
        echo "Warning: X_BEARER_TOKEN returned HTTP $http_code" >&2
    fi

    # 2. Try OAuth user access token (works for reads too)
    if [ -n "$X_ACCESS_TOKEN" ]; then
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api.x.com/2/users/by/username/twitter" \
            -H "Authorization: Bearer $X_ACCESS_TOKEN")
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "$X_ACCESS_TOKEN"
            return 0
        fi
        echo "Warning: X_ACCESS_TOKEN returned HTTP $http_code, attempting refresh..." >&2
    fi

    # 3. Try refresh if we have the credentials
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

    # 4. All methods exhausted
    echo "Error: No valid X token available" >&2
    echo "" >&2
    echo "Set one of:" >&2
    echo "  X_BEARER_TOKEN       — App-only token (preferred, never expires)" >&2
    echo "                         Get at https://developer.x.com/en/portal/dashboard" >&2
    echo "  X_ACCESS_TOKEN       — OAuth 2.0 user token (works for reads)" >&2
    echo "  X_REFRESH_TOKEN +    — For automatic token refresh" >&2
    echo "  X_CLIENT_SECRET_ID" >&2
    return 1
}
