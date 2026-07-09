---
name: x-user-timeline
version: 1.0.1
description: Get recent tweets from an X/Twitter user. Use when user asks "what has @username posted", "recent tweets from", "user's X posts", "show timeline for", "what is @user saying". Requires X_BEARER_TOKEN.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_SKILL_DIR}:*)
---

# X User Timeline

Get recent tweets from a specific user.

## Setup

```bash
export X_BEARER_TOKEN="your-token"  # https://developer.x.com/en/portal/dashboard
```

## Usage

```bash
${CLAUDE_SKILL_DIR}/scripts/timeline.sh <username> [max_results]
```

## Examples

```bash
# Get 10 recent tweets (default)
${CLAUDE_SKILL_DIR}/scripts/timeline.sh kurtwuckertjr

# Get 25 tweets
${CLAUDE_SKILL_DIR}/scripts/timeline.sh kurtwuckertjr 25
```

## Response Fields

- `text` - Tweet content
- `created_at` - Post timestamp
- `public_metrics` - Likes, retweets, replies, views
- `author` - User info (expanded)

## Pricing and Rate Limits

X API access is pay-per-use. Read the endpoint's rate-limit response headers and
consult the current X API pricing and rate-limit documentation instead of
assuming a fixed free-tier quota.

## References

- https://docs.x.com/llms.txt
- https://developer.x.com/en/docs/x-api/tweets/timelines
