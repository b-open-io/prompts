---
name: x-reader
version: 2.0.0
description: Fetch X (Twitter) content directly using the X.com API v2. Use when user shares tweet URLs, wants to fetch tweets by ID, search recent posts, or get user timelines. Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*)
---

# X (Twitter) Reader Skill

Fetch X (Twitter) content directly using the official X.com API v2.

## When to Use This Skill

Trigger when user:
- Shares a tweet URL (`https://x.com/...` or `https://twitter.com/...`)
- Wants to fetch a specific tweet by ID
- Wants to search recent X posts
- Wants tweets from a specific user

## Setup Requirements

**Required:** X.com API Bearer Token

```bash
if [ -z "$X_BEARER_TOKEN" ]; then
  echo "ERROR: X_BEARER_TOKEN is not set"
  echo "1. Go to https://developer.x.com/en/portal/dashboard"
  echo "2. Create a project and app"
  echo "3. Generate a Bearer Token"
  echo "4. Add to profile: export X_BEARER_TOKEN=\"your-token\""
  exit 1
else
  echo "X_BEARER_TOKEN is configured"
fi
```

## API Overview

**Base URL**: `https://api.x.com/2`

**Authentication**: Bearer Token in header

**Key Endpoints**:
- `GET /2/tweets/:id` - Get single tweet
- `GET /2/tweets` - Get multiple tweets by IDs
- `GET /2/tweets/search/recent` - Search recent tweets (last 7 days)
- `GET /2/users/:id/tweets` - Get user's tweets

## Basic Usage

### Fetch Tweet by URL

When user provides a URL like `https://x.com/user/status/123456789`:

1. Extract the tweet ID from the URL
2. Call the tweets endpoint

```bash
# Extract ID from URL (last numeric segment)
URL="https://x.com/someone/status/1234567890123456789"
TWEET_ID=$(echo "$URL" | grep -oE '[0-9]+$')

# Fetch the tweet
curl -s "https://api.x.com/2/tweets/${TWEET_ID}?tweet.fields=created_at,author_id,public_metrics,entities&expansions=author_id&user.fields=username,name" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

### Fetch Tweet by ID

```bash
curl -s "https://api.x.com/2/tweets/1234567890?tweet.fields=created_at,author_id,public_metrics,context_annotations,entities&expansions=author_id&user.fields=username,name,verified" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

### Fetch Multiple Tweets

```bash
curl -s "https://api.x.com/2/tweets?ids=1234567890,9876543210&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=username,name" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

### Search Recent Tweets

Search tweets from the last 7 days:

```bash
curl -s "https://api.x.com/2/tweets/search/recent?query=bitcoin&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=username&max_results=10" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

**Search Operators:**
- `bitcoin` - Contains "bitcoin"
- `from:username` - From specific user
- `to:username` - Reply to user
- `#hashtag` - Contains hashtag
- `-is:retweet` - Exclude retweets
- `is:verified` - Only verified users
- `has:links` - Contains links
- `has:media` - Contains media

### Get User's Tweets

First get user ID, then fetch tweets:

```bash
# Get user ID by username
USER_ID=$(curl -s "https://api.x.com/2/users/by/username/elonmusk" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq -r '.data.id')

# Get their tweets
curl -s "https://api.x.com/2/users/${USER_ID}/tweets?tweet.fields=created_at,public_metrics&max_results=10" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

## Response Fields

### Tweet Fields (`tweet.fields`)
- `created_at` - Timestamp
- `author_id` - Author's user ID
- `public_metrics` - likes, retweets, replies, quotes
- `entities` - URLs, mentions, hashtags
- `context_annotations` - Topics, entities
- `conversation_id` - Thread ID

### User Fields (`user.fields`)
- `username` - @handle
- `name` - Display name
- `verified` - Verification status
- `description` - Bio
- `public_metrics` - followers, following, tweet count

### Expansions (`expansions`)
- `author_id` - Include author user object
- `referenced_tweets.id` - Include quoted/replied tweets

## Example Response

```json
{
  "data": {
    "id": "1234567890",
    "text": "Hello world!",
    "created_at": "2025-01-15T10:30:00.000Z",
    "author_id": "987654321",
    "public_metrics": {
      "retweet_count": 100,
      "reply_count": 50,
      "like_count": 500,
      "quote_count": 25
    }
  },
  "includes": {
    "users": [{
      "id": "987654321",
      "username": "someone",
      "name": "Some One"
    }]
  }
}
```

## Common Patterns

### Parse Tweet URL and Fetch Content

```bash
fetch_tweet() {
  local URL="$1"
  local TWEET_ID=$(echo "$URL" | grep -oE '[0-9]+$')

  if [ -z "$TWEET_ID" ]; then
    echo "Error: Could not extract tweet ID from URL"
    return 1
  fi

  curl -s "https://api.x.com/2/tweets/${TWEET_ID}?tweet.fields=created_at,author_id,public_metrics,entities&expansions=author_id&user.fields=username,name" \
    -H "Authorization: Bearer $X_BEARER_TOKEN"
}

# Usage
fetch_tweet "https://x.com/user/status/1234567890"
```

### Format Tweet for Display

```bash
format_tweet() {
  local RESPONSE="$1"

  local TEXT=$(echo "$RESPONSE" | jq -r '.data.text')
  local USERNAME=$(echo "$RESPONSE" | jq -r '.includes.users[0].username')
  local NAME=$(echo "$RESPONSE" | jq -r '.includes.users[0].name')
  local DATE=$(echo "$RESPONSE" | jq -r '.data.created_at')
  local LIKES=$(echo "$RESPONSE" | jq -r '.data.public_metrics.like_count')
  local RTS=$(echo "$RESPONSE" | jq -r '.data.public_metrics.retweet_count')

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 @${USERNAME} (${NAME})"
  echo "📅 ${DATE}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "$TEXT"
  echo ""
  echo "❤️ ${LIKES} likes | 🔄 ${RTS} retweets"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}
```

## Rate Limits

Free tier limits:
- 10 requests per 15 minutes for search
- 10 requests per 15 minutes for tweet lookup
- 1,500 tweets per month

Higher tiers have higher limits. Check your plan at developer.x.com.

## Error Handling

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Unauthorized | Check X_BEARER_TOKEN is valid |
| 403 | Forbidden | Check API access level |
| 404 | Not Found | Tweet may be deleted or private |
| 429 | Rate Limited | Wait and retry |

## Comparison with xAI Grok

| Feature | X.com API | xAI Grok |
|---------|-----------|----------|
| Direct tweet data | Yes | Summarized |
| Real-time | Yes | Yes |
| Auth required | X_BEARER_TOKEN | XAI_API_KEY |
| Rate limits | Strict (free tier) | More generous |
| AI analysis | No | Yes |
| Exact tweet text | Yes | May paraphrase |

**Use X.com API when:** You need exact tweet content, metrics, or metadata.

**Use xAI Grok when:** You need sentiment analysis, search across many tweets, or AI-powered insights.

## References

- [X API Documentation](https://developer.x.com/en/docs/x-api)
- [Tweet Lookup](https://developer.x.com/en/docs/x-api/tweets/lookup)
- [Search Tweets](https://developer.x.com/en/docs/x-api/tweets/search)
- [Rate Limits](https://developer.x.com/en/docs/x-api/rate-limits)
