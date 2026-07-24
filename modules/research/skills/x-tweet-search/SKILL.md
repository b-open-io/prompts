---
name: x-tweet-search
version: 1.0.1
description: Search recent X/Twitter posts by query. Returns RAW TWEETS (last 7 days). Use when user asks "search X for", "find tweets about", "what are people saying about", "Twitter search", "raw tweets about". For AI summaries/sentiment, use x-research instead. Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_SKILL_DIR}:*)
---

# X Tweet Search

Search recent tweets (last 7 days) by query.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_SKILL_DIR}/scripts/search.sh "<query>" [max_results]
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
${CLAUDE_SKILL_DIR}/scripts/search.sh "bitcoin"

# From specific user
${CLAUDE_SKILL_DIR}/scripts/search.sh "from:kurtwuckertjr"

# Combined query
${CLAUDE_SKILL_DIR}/scripts/search.sh "BSV -is:retweet" 20
```

## Pricing and Rate Limits

X API access is pay-per-use. Read the endpoint's rate-limit response headers and
consult the current X API pricing and rate-limit documentation instead of
assuming a fixed free-tier quota.

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/tweets/search
