#!/bin/bash
# Search X (Twitter) for recent posts using X.com API v2
# Usage: ./search.sh "<query>"

set -e

QUERY="$1"
MAX_RESULTS="${2:-10}"

if [ -z "$QUERY" ]; then
    echo "Usage: search.sh <query> [max_results]"
    echo "Example: search.sh \"Bitcoin BSV\" 10"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    echo "Error: X_BEARER_TOKEN environment variable not set"
    echo "Get one at: https://developer.x.com/en/portal/dashboard"
    exit 1
fi

# URL encode the query
ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

# Search recent tweets
curl -s "https://api.x.com/2/tweets/search/recent?query=${ENCODED_QUERY}&tweet.fields=created_at,author_id,public_metrics,entities&expansions=author_id&user.fields=username,name&max_results=${MAX_RESULTS}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
