#!/bin/bash
# Get recent tweets from an X (Twitter) user using xAI Grok API
# Usage: ./user_tweets.sh "<handle>"

set -e

HANDLE="$1"

if [ -z "$HANDLE" ]; then
    echo "Usage: user_tweets.sh <handle>"
    echo "Example: user_tweets.sh @jack"
    echo "Example: user_tweets.sh elonmusk"
    exit 1
fi

if [ -z "$XAI_API_KEY" ]; then
    echo "Error: XAI_API_KEY environment variable not set"
    exit 1
fi

# Remove @ prefix if present for consistent handling
HANDLE="${HANDLE#@}"

# Build the prompt for fetching user tweets
PROMPT="Get the most recent tweets from X user @${HANDLE}

Please provide:
1. Their 5-10 most recent tweets
2. For each tweet include: content, timestamp, engagement metrics (likes, retweets, views if available)
3. Note any threads or ongoing conversations

Format each tweet clearly and include the date/time."

# Make the API request with X search enabled
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d "$(jq -n \
    --arg prompt "$PROMPT" \
    '{
      "messages": [{"role": "user", "content": $prompt}],
      "model": "grok-3-latest",
      "search_parameters": {
        "mode": "on",
        "sources": [{"type": "x"}]
      }
    }')" | jq -r '.choices[0].message.content // .error.message // "Error: No response"'
