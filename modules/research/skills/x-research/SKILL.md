---
name: x-research
version: 1.1.5
description: This skill should be used for AI-powered X/Twitter research via xAI Grok when the user asks "what's trending", "social sentiment", "summarize X discussion about", "analyze X conversation about", or "research topic on X". Returns AI summaries with analysis, not raw tweets. For raw tweet data, use x-user-timeline, x-tweet-search, or x-tweet-fetch. Requires XAI_API_KEY.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
---

# X Research (xAI/Grok)

AI-powered research using xAI's Grok API. Returns **AI summaries with citations**, not raw tweet data.

> **Want raw tweets instead?** Use these skills:
> - `x-user-timeline` - Raw tweets from a user
> - `x-tweet-search` - Raw search results
> - `x-tweet-fetch` - Raw single tweet
> - `x-user-lookup` - User profile data
>
> When tools from X's official
> [XMCP server](https://github.com/xdevplatform/xmcp) are available, prefer
> them for raw X data. XMCP normally runs locally at
> `http://127.0.0.1:8000/mcp`; `https://docs.x.com/mcp` is the separate hosted
> documentation server. Otherwise use the skills above. Both raw-data routes
> require X credentials; this synthesis skill uses `XAI_API_KEY` instead.

## When to Use

**USE THIS SKILL FOR:**
- Summarized research with AI analysis
- Current events and breaking news
- Social sentiment ("What are developers saying about Y?")
- X/Twitter trending topics and viral posts
- Emerging tools/frameworks not in documentation yet
- Community opinions on best practices

**DON'T USE FOR:**
- Raw tweet data (use x-user-timeline, x-tweet-search)
- Specific user's posts verbatim (use x-user-timeline)
- Well-documented APIs (use WebFetch instead)

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

## API Overview

**Endpoint**: `https://api.x.ai/v1/responses`

Resolve the loaded skill directory once per shell call, then use its request
wrapper. For Claude Code plugins, derive it from `CLAUDE_PLUGIN_ROOT`. For
Codex, use the absolute directory of this loaded `SKILL.md`:

```bash
X_RESEARCH_SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/x-research"
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON'
{"input":"[YOUR QUERY]","tools":[{"type":"web_search"},{"type":"x_search"}]}
JSON
```

Leave `XAI_RESEARCH_MODEL` unset, or set it to `auto`, `latest`, or
`grok-latest`/`grok-4-latest`, to select the newest canonical general-purpose Grok model
available to the current API key. The selector currently resolves that policy
to `grok-4.5`; it advances automatically when xAI publishes a newer canonical
model. Do not trust an alias merely because its name contains `latest`—the live
catalog can retain a lagging alias. Set a versioned ID such as `grok-4.5`, or a
versioned alias such as `grok-4.5-latest`, only to request a deliberate pin.
The selector verifies explicit pins and always emits the canonical model ID.
The wrapper selects and calls the model in one process, so model choice cannot
disappear between separate shell tool calls. It accepts a request JSON object
on stdin, overwrites any embedded `model`, and returns the raw Responses API
JSON.

**Available Search Tools**:
- `web_search` - Searches the internet and browses web pages
- `x_search` - Semantic and keyword search across X posts

## Basic Usage

### Simple Query with Search Tools

```bash
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON' \
  | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
{
    "input": [{"role": "user", "content": "[YOUR QUERY]"}],
    "tools": [{"type": "web_search"}, {"type": "x_search"}]
}
JSON
```

### Query with Usage Tracking (Recommended)

```bash
RESPONSE=$("$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON'
{
    "input": [{"role": "user", "content": "[YOUR QUERY]"}],
    "tools": [{"type": "web_search"}, {"type": "x_search"}]
}
JSON
)

# Extract usage stats
TOOL_CALLS=$(echo "$RESPONSE" | jq -r '.usage.num_server_side_tools_used // 0')
COST_TICKS=$(echo "$RESPONSE" | jq -r '.usage.cost_in_usd_ticks // 0')
COST_USD=$(jq -n --argjson ticks "$COST_TICKS" '$ticks / 10000000000')
echo "Tool calls: $TOOL_CALLS | Estimated cost: \$$COST_USD"
echo ""
echo "$RESPONSE" | tr -d '\000-\010\013\014\016-\037' | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
```

## Search Tool Parameters

### Web Search Options

```json
"tools": [{
  "type": "web_search",
  "allowed_domains": ["github.com", "stackoverflow.com"],
  "excluded_domains": ["pinterest.com"],
  "enable_image_understanding": true
}]
```

- `allowed_domains` - Restrict to these domains only (max 5)
- `excluded_domains` - Exclude these domains (max 5)
- `enable_image_understanding` - Analyze images found during search

### X Search Options

```json
"tools": [{
  "type": "x_search",
  "allowed_x_handles": ["elikimonimus", "anthropaboris"],
  "excluded_x_handles": ["spambot"],
  "from_date": "2025-01-01",
  "to_date": "2025-01-16",
  "enable_image_understanding": true,
  "enable_video_understanding": true
}]
```

- `allowed_x_handles` - Only include posts from these accounts (max 20)
- `excluded_x_handles` - Exclude posts from these accounts (max 20)
- `from_date` / `to_date` - ISO8601 date range (YYYY-MM-DD)
- `enable_image_understanding` - Analyze images in posts
- `enable_video_understanding` - Analyze videos in posts

## Examples

### X/Twitter Trending Topics

```bash
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON' \
  | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
{
    "input": [{"role": "user", "content": "What is currently trending on X? Include viral posts and major discussions."}],
    "tools": [{"type": "x_search"}]
}
JSON
```

### Developer Sentiment on a Topic

```bash
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON' \
  | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
{
    "input": [{"role": "user", "content": "What are developers saying about [TOPIC] on X? Include recent discussions and opinions."}],
    "tools": [{"type": "x_search"}, {"type": "web_search"}]
}
JSON
```

### News and Web Research

```bash
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON' \
  | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
{
    "input": [{"role": "user", "content": "Latest news and developments about [TOPIC]"}],
    "tools": [{"type": "web_search"}]
}
JSON
```

### Historical Research with Date Range

```bash
"$X_RESEARCH_SKILL_DIR/scripts/research.sh" <<'JSON' \
  | tr -d '\000-\010\013\014\016-\037' \
  | jq -r '[.output[] | select(.type=="message")][-1].content[0].text'
{
    "input": [{"role": "user", "content": "What happened with [TOPIC] from January 9 through January 16, 2025?"}],
    "tools": [{
      "type": "x_search",
      "from_date": "2025-01-09",
      "to_date": "2025-01-16"
    }, {
      "type": "web_search"
    }]
}
JSON
```

## Response Structure

The response contains:

```json
{
  "output": [
    {"type": "web_search_call", "status": "completed", ...},
    {"type": "custom_tool_call", "name": "x_semantic_search", ...},
    {
      "type": "message",
      "content": [{
        "type": "output_text",
        "text": "The actual response with [[1]](url) inline citations",
        "annotations": [{"type": "url_citation", "url": "...", ...}]
      }]
    }
  ],
  "citations": ["url1", "url2", ...],
  "usage": {
    "input_tokens": 11408,
    "output_tokens": 2846,
    "num_server_side_tools_used": 8,
    "cost_in_usd_ticks": 429052500
  }
}
```

**Extracting content**: `jq -r '[.output[] | select(.type=="message")][-1].content[0].text'` — select the last MESSAGE element explicitly; on grok-4.5 the final `output[]` element is a reasoning block, and reasoning summaries can contain raw control characters that break strict JSON parsing of the whole payload. The `tr` strip in every example removes raw control characters grok-4.5 reasoning summaries can emit, which otherwise break strict JSON parsing of the whole payload before jq ever selects.

**Extracting citations**: `jq -r '.citations[]'`

## Pricing

Search and token pricing changes independently of this skill. Read the exact
charge from `response.usage.cost_in_usd_ticks`; xAI defines one USD as
10,000,000,000 ticks. Consult the provider pricing page before estimating future
requests.

## Error Handling

If the API returns an error:
1. Check XAI_API_KEY is set and valid
2. Verify the model resolves for the current API key with `GET /v1/models`
3. Check rate limits haven't been exceeded
4. Ensure `tools` array is properly formatted
5. Report the error to the user with the API response

Common errors:
- `"Internal error"` - Usually wrong model name or malformed request
- Timeout - Request took too long (rare with agentic API)

## Migration Notes

**DEPRECATED (January 12, 2026)**: The old Live Search API using `search_parameters` is being deprecated. This skill uses the new agentic tool calling API which is faster and more capable.

Old format (deprecated):
```json
{
  "model": "grok-4-latest",
  "messages": [...],
  "search_parameters": {"mode": "on"}
}
```

New format (use this after verifying a current model ID):
```json
{
  "model": "<verified-current-model-id>",
  "input": [...],
  "tools": [{"type": "web_search"}, {"type": "x_search"}]
}
```

## References

- **LLMs.txt (AI-optimized docs)**: https://docs.x.com/llms.txt
- [xAI API Documentation](https://docs.x.ai)
- [Search Tools Guide](https://docs.x.ai/docs/guides/tools/search-tools)
- [Models Reference](https://docs.x.ai/docs/models)
- [X.com API v2](https://developer.x.com/en/docs/x-api)
