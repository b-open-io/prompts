#!/bin/bash
# Fetch a specific tweet by URL or ID using X.com API v2
# Usage: ./fetch.sh "<url_or_id>"

set -e

INPUT="$1"

if [ -z "$INPUT" ]; then
    echo "Usage: fetch.sh <url_or_id>"
    echo "Example: fetch.sh https://x.com/user/status/1234567890"
    echo "Example: fetch.sh 1234567890"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    echo "Error: X_BEARER_TOKEN not set"
    echo "Get one at: https://developer.x.com/en/portal/dashboard"
    echo "Docs: https://docs.x.com/llms.txt"
    exit 1
fi

# Extract tweet ID - either from URL or use as-is if numeric
if [[ "$INPUT" =~ ^[0-9]+$ ]]; then
    TWEET_ID="$INPUT"
else
    TWEET_ID=$(echo "$INPUT" | grep -oE '[0-9]+$')
fi

if [ -z "$TWEET_ID" ]; then
    echo "Error: Could not extract tweet ID from input"
    exit 1
fi

# Fetch the tweet with full details
curl -s "https://api.x.com/2/tweets/${TWEET_ID}?tweet.fields=created_at,author_id,public_metrics,entities,context_annotations,conversation_id&expansions=author_id,referenced_tweets.id&user.fields=username,name,verified,description" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
