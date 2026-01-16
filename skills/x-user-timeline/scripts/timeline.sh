#!/bin/bash
# Get recent tweets from a user
# Usage: ./timeline.sh <username> [max_results]

set -e

USERNAME="${1#@}"  # Remove @ if present
MAX_RESULTS="${2:-10}"

if [ -z "$USERNAME" ]; then
    echo "Usage: timeline.sh <username> [max_results]"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    bash "$SCRIPT_DIR/setup.sh"
    exit 1
fi

# Get user ID first
USER_ID=$(curl -s "https://api.x.com/2/users/by/username/${USERNAME}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq -r '.data.id')

if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
    echo "Error: User @${USERNAME} not found"
    exit 1
fi

# Get tweets
curl -s "https://api.x.com/2/users/${USER_ID}/tweets?tweet.fields=created_at,public_metrics,entities&expansions=author_id&user.fields=username,name&max_results=${MAX_RESULTS}" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
