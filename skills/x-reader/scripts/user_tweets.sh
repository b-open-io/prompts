#!/bin/bash
# Get recent tweets from an X (Twitter) user using X.com API v2
# Usage: ./user_tweets.sh "<handle>"

set -e

HANDLE="$1"
MAX_RESULTS="${2:-10}"

if [ -z "$HANDLE" ]; then
    echo "Usage: user_tweets.sh <handle> [max_results]"
    echo "Example: user_tweets.sh @jack 10"
    echo "Example: user_tweets.sh elonmusk"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    echo "Error: X_BEARER_TOKEN environment variable not set"
    echo "Get one at: https://developer.x.com/en/portal/dashboard"
    exit 1
fi

# Remove @ prefix if present
HANDLE="${HANDLE#@}"

# First get the user ID from username
USER_RESPONSE=$(curl -s "https://api.x.com/2/users/by/username/${HANDLE}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN")

USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$USER_ID" ]; then
    echo "Error: Could not find user @${HANDLE}"
    echo "$USER_RESPONSE" | jq '.'
    exit 1
fi

# Get user's tweets
curl -s "https://api.x.com/2/users/${USER_ID}/tweets?tweet.fields=created_at,public_metrics,entities&max_results=${MAX_RESULTS}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
