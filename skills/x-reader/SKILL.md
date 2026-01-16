---
name: x-reader
version: 2.0.1
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

## Setup

Requires `X_BEARER_TOKEN` environment variable.

```bash
# Get token at: https://developer.x.com/en/portal/dashboard
export X_BEARER_TOKEN="your-token-here"
```

## API Overview

**Base URL**: `https://api.x.com/2`

**Key Endpoints**:
- `GET /2/tweets/:id` - Get single tweet
- `GET /2/tweets` - Get multiple tweets by IDs
- `GET /2/tweets/search/recent` - Search recent tweets (last 7 days)
- `GET /2/users/:id/tweets` - Get user's tweets

## Basic Usage

### Fetch Tweet by URL

Extract tweet ID from URL and call the tweets endpoint:

```bash
URL="https://x.com/someone/status/1234567890123456789"
TWEET_ID=$(echo "$URL" | grep -oE '[0-9]+$')

curl -s "https://api.x.com/2/tweets/${TWEET_ID}?tweet.fields=created_at,author_id,public_metrics,entities&expansions=author_id&user.fields=username,name" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

### Search Recent Tweets

```bash
curl -s "https://api.x.com/2/tweets/search/recent?query=bitcoin&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=username&max_results=10" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
```

**Search Operators:**
- `from:username` - From specific user
- `to:username` - Reply to user
- `#hashtag` - Contains hashtag
- `-is:retweet` - Exclude retweets
- `has:media` - Contains media

### Get User's Tweets

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
- `created_at`, `author_id`, `public_metrics`, `entities`, `conversation_id`

### User Fields (`user.fields`)
- `username`, `name`, `verified`, `description`, `public_metrics`

### Expansions (`expansions`)
- `author_id` - Include author user object
- `referenced_tweets.id` - Include quoted/replied tweets

## Rate Limits (Free Tier)

- 10 requests per 15 minutes for search
- 10 requests per 15 minutes for tweet lookup
- 1,500 tweets per month

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check X_BEARER_TOKEN |
| 403 | Forbidden | Check API access level |
| 404 | Not Found | Tweet deleted or private |
| 429 | Rate Limited | Wait and retry |

## References

- **LLMs.txt**: https://docs.x.com/llms.txt
- [X API Documentation](https://developer.x.com/en/docs/x-api)
- [Tweet Lookup](https://developer.x.com/en/docs/x-api/tweets/lookup)
- [Search Tweets](https://developer.x.com/en/docs/x-api/tweets/search)
