#!/bin/bash
# Fetch a specific tweet by URL or ID
# Usage: ./fetch.sh <url_or_id>

set -e

INPUT="$1"

if [ -z "$INPUT" ]; then
    echo "Usage: fetch.sh <url_or_id>"
    echo "Example: fetch.sh https://x.com/user/status/1234567890"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    bash "$SCRIPT_DIR/setup.sh"
    exit 1
fi

# Extract tweet ID from URL or use as-is
TWEET_ID=$(echo "$INPUT" | grep -oE '[0-9]{10,}' | tail -1)

if [ -z "$TWEET_ID" ]; then
    echo "Error: Could not extract tweet ID from: $INPUT"
    exit 1
fi

curl -s "https://api.x.com/2/tweets/${TWEET_ID}?tweet.fields=created_at,author_id,public_metrics,entities,conversation_id&expansions=author_id,referenced_tweets.id&user.fields=username,name,verified" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
