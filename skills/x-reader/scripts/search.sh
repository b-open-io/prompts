#!/bin/bash
# Search X (Twitter) for a topic using xAI Grok API
# Usage: ./search.sh "<query>"

set -e

QUERY="$1"

if [ -z "$QUERY" ]; then
    echo "Usage: search.sh <query>"
    echo "Example: search.sh \"Bitcoin BSV\""
    exit 1
fi

if [ -z "$XAI_API_KEY" ]; then
    echo "Error: XAI_API_KEY environment variable not set"
    exit 1
fi

# Build the prompt for searching X
PROMPT="Search X (Twitter) for recent posts about: ${QUERY}

Please provide:
1. The most relevant and recent tweets about this topic
2. For each tweet include: author handle, content, timestamp, engagement (likes/retweets if available)
3. A brief summary of the overall sentiment and key themes

Format the results clearly with each tweet separated."

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
