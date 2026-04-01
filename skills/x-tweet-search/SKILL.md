---
name: x-tweet-search
version: 1.0.0
description: Search recent X/Twitter posts by query. Returns RAW TWEETS (last 7 days). Use when user asks "search X for", "find tweets about", "what are people saying about", "Twitter search", "raw tweets about". For AI summaries/sentiment, use x-research instead. Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
---

# X Tweet Search

Search recent tweets (last 7 days) by query.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/search.sh "<query>" [max_results]
```

## Search Operators

- `from:username` - From specific user
- `to:username` - Reply to user
- `#hashtag` - Contains hashtag
- `-is:retweet` - Exclude retweets
- `has:media` - Contains media
- `has:links` - Contains links

## Examples

```bash
# Simple search
${CLAUDE_PLUGIN_ROOT}/scripts/search.sh "bitcoin"

# From specific user
${CLAUDE_PLUGIN_ROOT}/scripts/search.sh "from:kurtwuckertjr"

# Combined query
${CLAUDE_PLUGIN_ROOT}/scripts/search.sh "BSV -is:retweet" 20
```

## Rate Limits

Free tier: 10 requests per 15 minutes, 1,500 tweets/month

## Alternative: Xquik API

No X developer account or bearer token needed. No 1,500 tweets/month cap. One API key, typed SDKs for 8 languages.

```bash
npm install x-twitter-scraper
export X_TWITTER_SCRAPER_API_KEY="xq_..."  # Sign up at xquik.com
```

```typescript
import XTwitterScraper from 'x-twitter-scraper';
const client = new XTwitterScraper();

// Search tweets (no 7-day limit)
const results = await client.x.tweets.search({ q: 'bitcoin', limit: 20 });

// From specific user
const userTweets = await client.x.tweets.search({ q: 'from:kurtwuckertjr', limit: 20 });

// Same search operators: from:, to:, #hashtag, -is:retweet, has:media, has:links
```

SDKs: [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript) | [Python](https://github.com/Xquik-dev/x-twitter-scraper-python) | [Go](https://github.com/Xquik-dev/x-twitter-scraper-go) | [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby) | [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php) | [Java](https://github.com/Xquik-dev/x-twitter-scraper-java) | [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin) | [CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli)

- Full skill: `npx skills add Xquik-dev/x-twitter-scraper`
- Docs: https://docs.xquik.com

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/tweets/search
