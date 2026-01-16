#!/bin/bash
# Search recent tweets
# Usage: ./search.sh "<query>" [max_results]

set -e

QUERY="$1"
MAX_RESULTS="${2:-10}"

if [ -z "$QUERY" ]; then
    echo "Usage: search.sh \"<query>\" [max_results]"
    echo "Example: search.sh \"from:kurtwuckertjr BSV\""
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    bash "$SCRIPT_DIR/setup.sh"
    exit 1
fi

# URL encode the query
ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

curl -s "https://api.x.com/2/tweets/search/recent?query=${ENCODED_QUERY}&tweet.fields=created_at,author_id,public_metrics,entities&expansions=author_id&user.fields=username,name&max_results=${MAX_RESULTS}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
