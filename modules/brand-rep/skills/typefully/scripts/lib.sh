#!/bin/bash
# Shared helpers for the Typefully scripts.

# TYPEFULLY_API_BASE exists so these scripts can be exercised against a local
# stub. Leave it unset in normal use.
TYPEFULLY_API="${TYPEFULLY_API_BASE:-https://api.typefully.com/v2}"

require_key() {
    if [ -z "${TYPEFULLY_API_KEY:-}" ]; then
        bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.sh"
        exit 1
    fi
}

require_deps() {
    for dep in curl jq; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            echo "Missing required dependency: $dep" >&2
            exit 1
        fi
    done
}

# resolve_social_set <explicit-id>
# Falls back to $TYPEFULLY_SOCIAL_SET, then to the only set on the account.
# Prints the id on stdout. Any failure is fatal to the whole script, not just
# to the subshell this runs in — see the callers, which check the exit status.
resolve_social_set() {
    local explicit="${1:-}"
    if [ -n "$explicit" ]; then
        printf '%s' "$explicit"
        return 0
    fi
    if [ -n "${TYPEFULLY_SOCIAL_SET:-}" ]; then
        printf '%s' "${TYPEFULLY_SOCIAL_SET}"
        return 0
    fi
    local body ids count
    body=$(api_get "/social-sets") || return 1
    # Accept either {"data":[...]} or a bare [...] payload.
    ids=$(printf '%s' "$body" | jq -r 'if type == "object" then (.data // .social_sets // .results // []) else . end | .[]?.id // empty') || return 1
    count=$(printf '%s\n' "$ids" | grep -c . || true)
    if [ "$count" = "1" ]; then
        printf '%s' "$ids"
        return 0
    fi
    if [ "$count" = "0" ]; then
        echo "Typefully returned no social sets for this API key." >&2
    else
        echo "This account has $count social sets; pick one explicitly." >&2
    fi
    echo "Run scripts/social-sets.sh, then export TYPEFULLY_SOCIAL_SET or pass --social-set <id>." >&2
    return 1
}

# api_request <method> <path> [json-body]
# Prints the response body. Exits non-zero on an HTTP error, echoing the
# status and the API's own error text rather than swallowing it.
api_request() {
    local method="$1" path="$2" body="${3:-}"
    local response status payload
    if [ -n "$body" ]; then
        response=$(curl -sS -w $'\n%{http_code}' -X "$method" "${TYPEFULLY_API}${path}" \
            -H "Authorization: Bearer $TYPEFULLY_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$body")
    else
        response=$(curl -sS -w $'\n%{http_code}' -X "$method" "${TYPEFULLY_API}${path}" \
            -H "Authorization: Bearer $TYPEFULLY_API_KEY")
    fi
    status=$(printf '%s' "$response" | tail -n 1)
    payload=$(printf '%s' "$response" | sed '$d')
    if [ "$status" -ge 400 ] 2>/dev/null; then
        echo "Typefully API error: HTTP $status on $method $path" >&2
        printf '%s\n' "$payload" >&2
        exit 1
    fi
    printf '%s' "$payload"
}

api_get() { api_request GET "$1" ""; }
