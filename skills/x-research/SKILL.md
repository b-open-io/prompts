---
name: x-research
version: 1.0.0
description: This skill should be used when the user asks about "what's trending on X", "Twitter trends", "social sentiment", "what are people saying about", "X/Twitter research", "real-time social data", "Grok research", "search Twitter", "check X for", "breaking news", or needs current events, social insights, or undiscovered tools/frameworks. Uses xAI/Grok API with live search for real-time intelligence from X/Twitter, web, and news sources.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# X Research (xAI/Grok)

Real-time research using xAI's Grok API with live search capabilities for X/Twitter trends, social sentiment, current events, and emerging tools/frameworks.

## When to Use

**USE THIS SKILL FOR:**
- Current events and breaking news
- Social sentiment ("What are developers saying about Y?")
- X/Twitter trending topics and viral posts
- Emerging tools/frameworks not in documentation yet
- Real-time status of services/outages
- Community opinions on best practices
- Undiscovered gems and new libraries

**DON'T USE FOR:**
- Well-documented APIs (use WebFetch instead)
- Static technical specifications
- Code syntax questions
- Historical information

## Setup Requirements

Check if the API key is set:

```bash
if [ -z "$XAI_API_KEY" ]; then
  echo "ERROR: XAI_API_KEY is not set"
  echo "1. Get API key from https://x.ai/api"
  echo "2. Add to profile: export XAI_API_KEY=\"your-key\""
  echo "3. Restart terminal and Claude Code"
  exit 1
else
  echo "XAI_API_KEY is configured"
fi
```

If unavailable, inform the user that XAI_API_KEY must be configured before using this skill.

## Basic Usage

### Simple Query with Live Search

```bash
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "[YOUR QUERY]"}
    ],
    "model": "grok-4-latest",
    "search_parameters": {},
    "stream": false,
    "temperature": 0
  }' | jq -r '.choices[0].message.content'
```

### Query with Cost Tracking (Recommended)

**ALWAYS use this pattern to track research costs:**

```bash
RESPONSE=$(curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "[YOUR QUERY]"}
    ],
    "model": "grok-4-latest",
    "search_parameters": {"mode": "on"},
    "stream": false,
    "temperature": 0
  }')

# Extract and report cost
SOURCES_USED=$(echo "$RESPONSE" | jq -r '.usage.num_sources_used // 0')
COST=$(echo "scale=3; $SOURCES_USED * 0.025" | bc)
echo "Research Cost: $SOURCES_USED sources x \$0.025 = \$$COST"
echo ""
echo "$RESPONSE" | jq -r '.choices[0].message.content'
```

## Search Parameters

### Mode Control

- `"mode": "auto"` (default) - Model decides whether to search
- `"mode": "on"` - Always search (recommended for real-time queries)
- `"mode": "off"` - Never search

### Data Sources

Specify which sources to search:

```json
"sources": [
  {"type": "web"},
  {"type": "x"},
  {"type": "news"},
  {"type": "rss", "links": ["https://example.com/feed.xml"]}
]
```

### Common Parameters

- `"return_citations": true` - Include source URLs (default: true)
- `"max_search_results": 20` - Limit sources (default: 20)
- `"from_date": "YYYY-MM-DD"` - Start date for results
- `"to_date": "YYYY-MM-DD"` - End date for results

## Advanced Examples

### X/Twitter Trending Topics

```bash
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is currently trending on X? Include viral posts and major discussions."}
    ],
    "model": "grok-4-latest",
    "search_parameters": {
      "mode": "on",
      "sources": [
        {
          "type": "x",
          "post_favorite_count": 1000,
          "post_view_count": 10000
        }
      ],
      "max_search_results": 30,
      "return_citations": true
    },
    "stream": false,
    "temperature": 0
  }' | jq -r '.choices[0].message.content'
```

### Developer Sentiment on a Topic

```bash
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are developers saying about [TOPIC] on X? Include recent discussions and opinions."}
    ],
    "model": "grok-4-latest",
    "search_parameters": {
      "mode": "on",
      "sources": [{"type": "x"}],
      "max_search_results": 20
    },
    "stream": false,
    "temperature": 0
  }' | jq -r '.choices[0].message.content'
```

### News and Web Combined

```bash
curl -s https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Latest news about [TOPIC]"}
    ],
    "model": "grok-4-latest",
    "search_parameters": {
      "mode": "on",
      "sources": [
        {"type": "news"},
        {"type": "web"}
      ],
      "max_search_results": 15
    },
    "stream": false,
    "temperature": 0
  }' | jq -r '.choices[0].message.content'
```

## Source-Specific Filters

### Web & News

- `"country": "US"` - ISO alpha-2 country code
- `"excluded_websites": ["site1.com"]` - Max 5 sites
- `"allowed_websites": ["site1.com"]` - Max 5 sites (web only)
- `"safe_search": false` - Disable safe search

### X/Twitter

- `"included_x_handles": ["handle1"]` - Max 10 handles
- `"excluded_x_handles": ["handle1"]` - Max 10 handles
- `"post_favorite_count": 1000` - Min favorites filter
- `"post_view_count": 10000` - Min views filter

## Pricing

Live Search costs **$0.025 per source used**. Check `response.usage.num_sources_used` for billing.

Always report costs to the user after research queries.

## Error Handling

If the API returns an error:
1. Check XAI_API_KEY is set and valid
2. Verify the model name is correct (`grok-4-latest`)
3. Check rate limits haven't been exceeded
4. Report the error to the user with the API response for debugging
