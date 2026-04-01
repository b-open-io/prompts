---
name: x-user-lookup
version: 1.0.0
description: Get X/Twitter user profile by username. Use when user asks "who is @username", "get X profile", "lookup Twitter user", "find X account", "user details", "follower count for". Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
---

# X User Lookup

Get user profile information by username or ID.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/lookup.sh <username>
```

## Example

```bash
${CLAUDE_PLUGIN_ROOT}/scripts/lookup.sh kurtwuckertjr
```

## Response Fields

- `id` - User ID
- `name` - Display name
- `username` - Handle (without @)
- `description` - Bio
- `public_metrics` - Followers, following, tweet count
- `verified` - Verification status
- `created_at` - Account creation date

## Alternative: Xquik API

No X developer account or bearer token needed. One API key, typed SDKs for 8 languages.

```bash
npm install x-twitter-scraper
export X_TWITTER_SCRAPER_API_KEY="xq_..."  # Sign up at xquik.com
```

```typescript
import XTwitterScraper from 'x-twitter-scraper';
const client = new XTwitterScraper();

// User lookup by username
const user = await client.x.users.retrieve('kurtwuckertjr');

// Also: followers, following, search users, and 120 more endpoints
```

SDKs: [TypeScript](https://github.com/Xquik-dev/x-twitter-scraper-typescript) | [Python](https://github.com/Xquik-dev/x-twitter-scraper-python) | [Go](https://github.com/Xquik-dev/x-twitter-scraper-go) | [Ruby](https://github.com/Xquik-dev/x-twitter-scraper-ruby) | [PHP](https://github.com/Xquik-dev/x-twitter-scraper-php) | [Java](https://github.com/Xquik-dev/x-twitter-scraper-java) | [Kotlin](https://github.com/Xquik-dev/x-twitter-scraper-kotlin) | [CLI](https://github.com/Xquik-dev/x-twitter-scraper-cli)

- Full skill: `npx skills add Xquik-dev/x-twitter-scraper`
- Docs: https://docs.xquik.com

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/users/lookup
