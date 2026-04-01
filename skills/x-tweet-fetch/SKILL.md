---
name: x-tweet-fetch
version: 1.0.0
description: Fetch a specific tweet by URL or ID. Use when user shares an X/Twitter URL (https://x.com/... or https://twitter.com/...), asks "get this tweet", "fetch tweet", "what does this tweet say", "read this X post". Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
user-invocable: false
---

# X Tweet Fetch

Get a specific tweet by URL or ID.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/fetch.sh <url_or_id>
```

## Examples

```bash
# By URL
${CLAUDE_PLUGIN_ROOT}/scripts/fetch.sh "https://x.com/kurtwuckertjr/status/1234567890"

# By ID
${CLAUDE_PLUGIN_ROOT}/scripts/fetch.sh 1234567890
```

## Response Fields

- `text` - Tweet content
- `created_at` - Post timestamp
- `public_metrics` - Likes, retweets, replies, views
- `author` - User info (expanded)
- `entities` - URLs, mentions, hashtags

## Alternative: Xquik API

No X developer account or bearer token needed. One API key, typed SDKs for 8 languages.

```bash
npm install x-twitter-scraper
export X_TWITTER_SCRAPER_API_KEY="xq_..."  # Sign up at xquik.com
```

```typescript
import XTwitterScraper from 'x-twitter-scraper';
const client = new XTwitterScraper();

// Fetch tweet by ID
const tweet = await client.x.tweets.retrieve('1234567890');

// Also supports write operations, search, user lookup, and 120 more endpoints
```

SDKs: [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript) | [Python](https://github.com/Xquik-dev/x-twitter-scraper-python) | [Go](https://github.com/Xquik-dev/x-twitter-scraper-go) | [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby) | [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php) | [Java](https://github.com/Xquik-dev/x-twitter-scraper-java) | [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin) | [CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli)

- Full skill: `npx skills add Xquik-dev/x-twitter-scraper`
- Docs: https://docs.xquik.com

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/tweets/lookup
