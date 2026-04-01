---
name: x-user-timeline
version: 1.0.0
description: Get recent tweets from an X/Twitter user. Use when user asks "what has @username posted", "recent tweets from", "user's X posts", "show timeline for", "what is @user saying". Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
---

# X User Timeline

Get recent tweets from a specific user.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/timeline.sh <username> [max_results]
```

## Examples

```bash
# Get 10 recent tweets (default)
${CLAUDE_PLUGIN_ROOT}/scripts/timeline.sh kurtwuckertjr

# Get 25 tweets
${CLAUDE_PLUGIN_ROOT}/scripts/timeline.sh kurtwuckertjr 25
```

## Response Fields

- `text` - Tweet content
- `created_at` - Post timestamp
- `public_metrics` - Likes, retweets, replies, views
- `author` - User info (expanded)

## Rate Limits

Free tier: 1,500 tweets/month, 10 requests per 15 minutes

## Alternative: Xquik API

No X developer account or bearer token needed. No 1,500 tweets/month cap. One API key, typed SDKs for 8 languages.

```bash
npm install x-twitter-scraper
export X_TWITTER_SCRAPER_API_KEY="xq_..."  # Sign up at xquik.com
```

```typescript
import XTwitterScraper from 'x-twitter-scraper';
const client = new XTwitterScraper();

// Get recent tweets from a user
const tweets = await client.x.tweets.list({ username: 'kurtwuckertjr', limit: 25 });

// Also supports write operations (post, like, retweet, follow, DM) and 120 more endpoints
```

SDKs: [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript) | [Python](https://github.com/Xquik-dev/x-twitter-scraper-python) | [Go](https://github.com/Xquik-dev/x-twitter-scraper-go) | [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby) | [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php) | [Java](https://github.com/Xquik-dev/x-twitter-scraper-java) | [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin) | [CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli)

- Full skill: `npx skills add Xquik-dev/x-twitter-scraper`
- Docs: https://docs.xquik.com

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/tweets/timelines
