---
name: x-reader
version: 1.0.0
description: Fetch and search X (Twitter) content using xAI Grok and browser automation. Use when user wants to search X, get tweets from a user, fetch specific tweet URLs, or analyze X discussions.
---

# X (Twitter) Reader Skill

Search, fetch, and analyze X (Twitter) content using a hybrid approach: xAI Grok for discovery/analysis, browser automation for specific URLs.

## When to Use This Skill

Trigger when user:
- Wants to search X/Twitter for a topic
- Asks about recent tweets from a user
- Shares a tweet URL (`https://x.com/...` or `https://twitter.com/...`)
- Wants sentiment analysis of X discussions
- Uses phrases like "x search", "search twitter", "get tweets", "fetch tweet"

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    X Skill Entry Point                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   search    │  │  user_tweets │  │   fetch_url    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│         ▼                ▼                   ▼           │
│    ┌─────────────────────────┐        ┌─────────────┐   │
│    │     xAI Grok API        │        │  Browser    │   │
│    │  (No auth required)     │        │  Automation │   │
│    └─────────────────────────┘        └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Commands

### 1. Search X by Topic

**Usage:** `x search <query>`

Search X for tweets about a specific topic using xAI Grok's real-time X access.

**Examples:**
- `x search Bitcoin BSV`
- `x search "artificial intelligence" recent`
- `x search #blockchain`

**Implementation:**
```bash
bash "${CLAUDE_SKILL_ROOT}/scripts/search.sh" "<query>"
```

### 2. Get User's Recent Tweets

**Usage:** `x user <handle>`

Fetch recent tweets from a specific X user.

**Examples:**
- `x user @jack`
- `x user elonmusk`
- `x user @naval`

**Implementation:**
```bash
bash "${CLAUDE_SKILL_ROOT}/scripts/user_tweets.sh" "<handle>"
```

### 3. Fetch Specific Tweet/Thread by URL

**Usage:** `x fetch <url>`

Fetch a specific tweet or thread by URL using browser automation. This requires the Claude-in-Chrome MCP to be available.

**Examples:**
- `x fetch https://x.com/elonmusk/status/1234567890`
- `x fetch https://twitter.com/jack/status/9876543210`

**Implementation:** Use browser automation (Claude-in-Chrome MCP):
1. Call `mcp__claude-in-chrome__tabs_context_mcp` to get browser context
2. Create new tab with `mcp__claude-in-chrome__tabs_create_mcp`
3. Navigate to URL with `mcp__claude-in-chrome__navigate`
4. Wait for page load with `mcp__claude-in-chrome__computer` (action: wait, duration: 3)
5. Extract content with `mcp__claude-in-chrome__get_page_text`

### 4. Analyze Sentiment/Discussion

**Usage:** `x analyze <topic>`

Get sentiment analysis and summary of current X discussion on a topic.

**Examples:**
- `x analyze "AI safety"`
- `x analyze cryptocurrency regulation`
- `x analyze "climate change"`

**Implementation:**
```bash
bash "${CLAUDE_SKILL_ROOT}/scripts/analyze.sh" "<topic>"
```

## Routing Logic

When user invokes this skill, route based on command:

| Pattern | Action |
|---------|--------|
| `x search <query>` | Run `search.sh` with xAI |
| `x user <handle>` | Run `user_tweets.sh` with xAI |
| `x fetch <url>` | Use browser automation MCP |
| `x analyze <topic>` | Run `analyze.sh` with xAI |
| URL only (auto-detect x.com/twitter.com) | Use browser automation MCP |

## Environment Variables

Required:
- `XAI_API_KEY` - xAI Grok API key for search/user/analyze commands

## Capabilities by Method

| Operation | xAI Grok | Browser MCP |
|-----------|----------|-------------|
| Search by topic | Best | Works |
| User's recent tweets | Best | Works |
| Specific tweet URL | Cannot | Required |
| Complete thread/replies | Partial | Required |
| Sentiment analysis | Excellent | N/A |

## Decision Flow

```
User wants X content
    │
    ├── Contains x.com/twitter.com URL?
    │   └── Yes → Use browser automation
    │
    ├── "x search <query>" or "search twitter <query>"?
    │   └── Yes → Run search.sh with xAI
    │
    ├── "x user <handle>" or "tweets from @user"?
    │   └── Yes → Run user_tweets.sh with xAI
    │
    └── "x analyze <topic>" or "sentiment on X about..."?
        └── Yes → Run analyze.sh with xAI
```

## Notes

- xAI Grok has real-time access to X content without requiring user authentication
- Browser automation uses the user's authenticated browser session
- For URL fetching, ensure Chrome is open with the Claude-in-Chrome extension active
- The xAI API returns tweet metadata including timestamps, view counts, and engagement metrics

## Troubleshooting

| Problem | Solution |
|---------|----------|
| XAI_API_KEY not set | Export the key: `export XAI_API_KEY="your-key"` |
| Browser MCP unavailable | Ensure Chrome is open with Claude-in-Chrome extension |
| Rate limits | xAI has usage limits; wait and retry |
| Empty results | Try broader search terms or check user handle spelling |
