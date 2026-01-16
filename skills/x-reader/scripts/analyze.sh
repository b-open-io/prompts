#!/bin/bash
# Analyze sentiment and discussion on X (Twitter) about a topic using xAI Grok API
# Usage: ./analyze.sh "<topic>"

set -e

TOPIC="$1"

if [ -z "$TOPIC" ]; then
    echo "Usage: analyze.sh <topic>"
    echo "Example: analyze.sh \"AI safety\""
    echo "Example: analyze.sh \"cryptocurrency regulation\""
    exit 1
fi

if [ -z "$XAI_API_KEY" ]; then
    echo "Error: XAI_API_KEY environment variable not set"
    exit 1
fi

# Build the prompt for sentiment analysis
PROMPT="Analyze the current discussion and sentiment on X (Twitter) about: ${TOPIC}

Please provide:
1. Overall sentiment (positive/negative/neutral/mixed) with percentage breakdown
2. Key themes and talking points being discussed
3. Notable voices or influential accounts discussing this topic
4. Recent news or events driving the conversation
5. Controversial or divisive aspects of the discussion
6. Summary of the main arguments on different sides

Be specific and cite actual tweets or trends where possible."

# Make the API request with X search enabled
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d "$(jq -n \
    --arg prompt "$TOPIC" \
    --arg sys_prompt "$PROMPT" \
    '{
      "messages": [
        {"role": "system", "content": "You are an expert social media analyst with access to real-time X (Twitter) data. Provide thorough, balanced analysis with specific examples."},
        {"role": "user", "content": $sys_prompt}
      ],
      "model": "grok-3-latest",
      "search_parameters": {
        "mode": "on",
        "sources": [{"type": "x"}]
      }
    }')" | jq -r '.choices[0].message.content // .error.message // "Error: No response"'
