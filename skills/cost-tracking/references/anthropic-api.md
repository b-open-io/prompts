# Anthropic Admin API — Usage & Cost Endpoints

## Authentication

All org-level endpoints require an **Admin API key**, not a standard user API key.

**Generate one:**
1. Go to `console.anthropic.com`
2. Navigate to Settings > Admin API keys
3. Create a key — store it as `ANTHROPIC_ADMIN_KEY`

Admin keys have the prefix `sk-ant-admin...`. Standard API keys (`sk-ant-api...`) return 403 on these endpoints.

## Endpoint 1: Usage Report (Messages)

Returns token-level usage data with sub-hourly granularity.

```
GET https://api.anthropic.com/v1/organizations/usage_report/messages
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | ISO 8601 string | Yes | Start of reporting window (e.g. `2026-03-07T00:00:00Z`) |
| `end_date` | ISO 8601 string | Yes | End of reporting window (exclusive) |
| `bucket_size` | `1m` \| `1h` \| `1d` | Yes | Time bucket granularity |
| `group_by` | string | No | Dimension to group by (see below) |
| `limit` | integer | No | Max results per page (default: 100) |
| `page` | integer | No | Page number for pagination (1-indexed) |

**`group_by` values:**
- `model` — Break down by model ID
- `workspace` — Break down by workspace
- `api_key` — Break down by API key (useful for per-agent analysis)
- `invoiced_at` — Group by invoice date
- `service_tier` — Standard vs Priority tier
- `context_window_type` — Normal vs extended context
- `geo` — Geographic region

**Data freshness:** ~5 minute lag. Do not use for real-time monitoring.

### Example Requests

```bash
# Usage by model for last 24 hours (hourly buckets)
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=2026-03-13T00:00:00Z&end_date=2026-03-14T00:00:00Z&bucket_size=1h&group_by=model"

# Usage by API key for last 7 days (daily buckets) — per-agent analysis
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=2026-03-07&end_date=2026-03-14&bucket_size=1d&group_by=api_key"

# Usage by workspace for last month
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=2026-02-01&end_date=2026-03-01&bucket_size=1d&group_by=workspace"
```

### Example Response

```json
{
  "data": [
    {
      "timestamp": "2026-03-13T00:00:00Z",
      "model": "claude-sonnet-4-5",
      "input_tokens": 1240000,
      "output_tokens": 320000,
      "cache_read_input_tokens": 480000,
      "cache_creation_input_tokens": 210000,
      "requests": 4821
    },
    {
      "timestamp": "2026-03-13T00:00:00Z",
      "model": "claude-haiku-4-5",
      "input_tokens": 9800000,
      "output_tokens": 1100000,
      "cache_read_input_tokens": 2100000,
      "cache_creation_input_tokens": 750000,
      "requests": 62400
    }
  ],
  "has_more": false,
  "next_page": null
}
```

### Rate Limits

- 60 requests per minute per Admin API key
- Paginate using `limit` and `page` for large date ranges

## Endpoint 2: Cost Report

Returns dollar-denominated costs at daily granularity.

```
GET https://api.anthropic.com/v1/organizations/cost_report
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | `YYYY-MM-DD` | Yes | Start date (inclusive) |
| `end_date` | `YYYY-MM-DD` | Yes | End date (inclusive) |
| `bucket_size` | `1d` | Yes | Must be `1d` — only daily granularity is supported |

**Note:** The cost report does NOT support hourly or per-minute buckets. For finer granularity, use the usage endpoint and apply pricing rates manually.

### What Is Included

- Input and output token costs
- Cache read and cache creation costs
- Web search tool costs
- Code execution costs

### What Is NOT Included

- **Priority Tier costs** — These appear on invoices but are not returned by this endpoint. If your org uses Priority Tier, the cost report will undercount total spend. Use the usage endpoint with `group_by=service_tier` to identify Priority Tier volume.

### Example Request

```bash
# Cost report for current billing period
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/cost_report?start_date=2026-03-01&end_date=2026-03-14&bucket_size=1d"
```

### Example Response

```json
{
  "data": [
    {
      "date": "2026-03-13",
      "workspace": "production",
      "description": "claude-sonnet-4-5 input tokens",
      "cost": "4.8600"
    },
    {
      "date": "2026-03-13",
      "workspace": "production",
      "description": "claude-sonnet-4-5 output tokens",
      "cost": "19.2000"
    },
    {
      "date": "2026-03-13",
      "workspace": "agents",
      "description": "claude-haiku-4-5 input tokens",
      "cost": "0.9800"
    }
  ],
  "has_more": false
}
```

Costs are USD decimal strings. Parse with `parseFloat()` or a decimal library — do not use integer arithmetic.

## Claude Code Analytics API (Separate)

For per-user Claude Code session costs (not org billing), a separate endpoint exists:

```
GET https://api.anthropic.com/v1/organizations/claude_code/usage
```

This returns session-level data: user email, session duration, token counts. Requires the same Admin API key. Use this for understanding individual developer spend, not agent/API spend.

## Practical Recipes

### Last 7 Days by Model (Summary)

```bash
curl -s -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=$(date -v-7d +%Y-%m-%d)&end_date=$(date +%Y-%m-%d)&bucket_size=1d&group_by=model" \
  | jq '[.data[] | {model, input_tokens, output_tokens, requests}] | group_by(.model) | map({model: .[0].model, total_requests: map(.requests) | add})'
```

### Current Month Cost Totals by Workspace

```bash
START=$(date +%Y-%m-01)
END=$(date +%Y-%m-%d)
curl -s -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/cost_report?start_date=$START&end_date=$END&bucket_size=1d" \
  | jq '[.data[]] | group_by(.workspace) | map({workspace: .[0].workspace, total_cost: (map(.cost | tonumber) | add)})'
```

### Detect Anomaly: Days Exceeding 2x Rolling Average

Fetch daily cost totals, compute 7-day rolling mean, flag outliers. The cost report returns one row per workspace+description combination per day, so sum across all rows for the day first before comparing.
