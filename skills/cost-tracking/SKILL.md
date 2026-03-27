---
name: cost-tracking
version: 1.0.1
description: >-
  This skill should be used when tracking API spend, analyzing billing data,
  monitoring service costs, running budget reports, or optimizing agent spend
  across Anthropic, Vercel, Railway, and other platforms. Invoke when asked
  about "cost tracking", "billing analysis", "spend report", "API costs",
  "usage monitoring", "budget vs actual", "cost optimization", or "which agents
  cost the most".
---

# Cost Tracking

Unified cost tracking and budget analysis across the bOpen agent organization's service stack.

## Supported Platforms

### Anthropic (Full API Access)

**Usage API:** `GET /v1/organizations/usage_report/messages`
- Auth: Admin API key (`sk-ant-admin...`) — org admin required
- Time buckets: `1m`, `1h`, `1d`
- Group by: model, workspace, api_key, service_tier, context_window_type, geo
- Data freshness: ~5 min lag

**Cost API:** `GET /v1/organizations/cost_report`
- Daily granularity only (`1d`), costs in USD as decimal strings
- Groups by workspace and description
- Includes token costs, web search, code execution
- Note: Priority Tier costs NOT included — use usage endpoint instead

**Quick examples:**

```bash
# Daily costs for last 7 days
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/cost_report?start_date=2026-03-07&end_date=2026-03-14&bucket_size=1d"

# Usage by model for last 24h
curl -H "x-api-key: $ANTHROPIC_ADMIN_KEY" \
  "https://api.anthropic.com/v1/organizations/usage_report/messages?start_date=2026-03-13T00:00:00Z&end_date=2026-03-14T00:00:00Z&bucket_size=1h&group_by=model"
```

Full parameter reference and response shapes: `references/anthropic-api.md`.

### Vercel (Full API Access)

**Billing API:** `GET /v1/billing/charges`
- Auth: Bearer token (same Vercel API token)
- Params: `from`, `to`, `teamId` or `slug`
- Response: newline-delimited JSONL, FOCUS v1.3 format
- Granularity: 1-day, max 1 year range

**Spend Management Webhooks:** fire at 50%/75%/100% of configured budget.

**CLI shortcut:** `vercel usage` for current-period spend at a glance.

Full API reference, FOCUS field descriptions, and webhook setup: `references/vercel-api.md`.

### Railway (No API)

Railway has no public billing API. The GraphQL API covers projects, services, and deployments — not costs. Cost data is only available in the Railway dashboard under Settings > Usage.

When asked about Railway costs: instruct the user to open the dashboard and report the numbers manually. Do not attempt to fetch them programmatically.

### Vantage MCP (Unified Dashboard)

Optional consolidated view across Anthropic, Vercel, and 30+ other providers.

```bash
claude mcp add --transport sse vantage https://mcp.vantage.sh/sse
```

Connects to Anthropic via Admin API key and to Vercel via a Community Integration with `read:billing` scope. Railway is NOT supported by Vantage.

Full setup steps: `references/vantage-setup.md`.

## Cost Analysis Patterns

### Per-Agent Cost Analysis

Query the Anthropic usage API grouped by `api_key` or `workspace`. Correlate workspace/key names with agent roles. Identify which agents burn the most tokens and recommend model tier changes (opus → sonnet → haiku) where quality allows.

### Budget vs Actual

Pull cost data for the billing period from the Anthropic cost report and Vercel billing charges. Compare against budgeted amounts. Flag overruns with percentage and absolute delta.

### Cost Anomaly Detection

Compare daily spend against the 7-day rolling average. Flag days where spend exceeds 2x the average. Drill into which model, workspace, or agent caused the spike by querying the usage endpoint grouped by model for that day.

### Optimization Recommendations

- Identify agents using `claude-opus` for tasks that `claude-sonnet` or `claude-haiku` could handle
- Flag unused Vercel projects with non-zero spend
- Recommend caching strategies for repeated API calls
- Identify high-volume low-complexity calls suitable for Haiku downgrade

## Key Principles

1. **Railway is manual-only.** Never attempt programmatic Railway cost fetching — the API does not expose it.
2. **Anthropic cost report is daily-only.** For hourly or per-minute analysis, use the usage endpoint, not the cost report.
3. **Priority Tier spend is missing from cost_report.** Always note this limitation when reporting Anthropic totals.
4. **Vantage MCP is optional infrastructure.** Useful for teams that want a persistent dashboard; not required for one-off queries.

## References

- `references/anthropic-api.md` — Full Anthropic Admin API docs for usage and cost endpoints
- `references/vercel-api.md` — Vercel Billing API, FOCUS format, and spend management webhooks
- `references/vantage-setup.md` — Vantage MCP server setup and platform coverage
