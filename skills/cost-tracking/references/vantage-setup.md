# Vantage MCP Server — Unified Cost Dashboard

## What It Is

Vantage is a cloud cost management platform. They expose a hosted MCP server that lets Claude query cost data from 30+ providers in a single session, without you having to write API calls manually.

The MCP server is free to connect to. Vantage's platform has its own pricing tiers (free tier available), but the MCP access itself does not add a separate charge.

## Install the MCP Server

```bash
claude mcp add --transport sse vantage https://mcp.vantage.sh/sse
```

This adds the Vantage MCP server to your Claude Code configuration. Restart Claude Code after running this command.

Verify it's connected:

```bash
claude mcp list
```

You should see `vantage` listed with status `connected`.

## Connecting Anthropic

1. Log in to `app.vantage.sh`
2. Go to Settings > Integrations > Anthropic
3. Enter your Anthropic Admin API key (`sk-ant-admin...`)
4. Save — Vantage will begin pulling usage and cost data

Vantage polls Anthropic's Admin API and makes the data available through the MCP server. Once connected, you can ask Claude things like:

- "What did we spend on Anthropic last month?"
- "Which workspace used the most tokens this week?"
- "Show me Anthropic costs broken down by model."

## Connecting Vercel

Vercel uses a Community Integration (OAuth-based), not an API key.

1. In the Vantage dashboard: Settings > Integrations > Vercel
2. Click "Connect with Vercel"
3. Authorize with `read:billing` scope — Vantage requests read-only billing access
4. Select the teams to include

After connection, Vantage pulls billing charges from Vercel's `/v1/billing/charges` endpoint and makes them queryable through the MCP server.

## Platform Coverage

### Supported (relevant to bOpen stack)

| Platform | Connection Method | Data Available |
|----------|------------------|----------------|
| Anthropic | Admin API key | Token usage, cost by model/workspace |
| Vercel | Community Integration (OAuth) | Billing charges by project/service |
| AWS | IAM role | Full AWS cost explorer |
| GCP | Service account | GCP billing |
| Azure | Service principal | Azure cost management |
| Datadog | API key | Datadog usage |
| MongoDB Atlas | API key | Atlas usage |

Vantage supports 30+ providers total. See `app.vantage.sh/integrations` for the full list.

### Not Supported

**Railway** — Railway has no public billing API. Vantage cannot integrate with it. There is no workaround; Railway costs must be checked manually in the Railway dashboard.

## Using the MCP Server in Claude

Once installed and configured, you can ask cost questions in natural language:

```
What was our total Anthropic spend last week?
Break down Vercel costs by project for March.
Which model cost us the most this month?
Compare our Anthropic spend in February vs March.
```

Claude will call the appropriate Vantage MCP tools and return results. You do not need to write curl commands or know the API endpoints.

## Vantage Platform Pricing

The MCP server access is free. The Vantage platform itself has tiers:

- **Free** — Up to $5k/month tracked spend, limited history
- **Pro** — Higher limits, longer history, anomaly detection, savings recommendations
- **Enterprise** — Unlimited, custom contracts

For bOpen's current scale, the free tier is likely sufficient for Anthropic and Vercel cost visibility. Check `vantage.sh/pricing` for current limits.

## When to Use Vantage vs Direct API

| Scenario | Recommended Approach |
|----------|---------------------|
| One-off cost query during a session | Vantage MCP (faster, no scripting) |
| Automated daily cost report | Direct API (Anthropic + Vercel endpoints) |
| Multi-platform cost comparison | Vantage MCP |
| Railway cost check | Dashboard only (neither works) |
| Invoice reconciliation | Direct API (exact match to billing) |
| Team-wide cost dashboard | Vantage platform (persistent, shareable) |

## Troubleshooting

**MCP server shows disconnected:**
Run `claude mcp list` to check status. If disconnected, remove and re-add:
```bash
claude mcp remove vantage
claude mcp add --transport sse vantage https://mcp.vantage.sh/sse
```

**Anthropic data not showing:**
Check that your Admin API key is still valid in `console.anthropic.com`. Admin keys can be revoked or expired.

**Vercel integration errors:**
The OAuth token may have expired. Re-connect in the Vantage dashboard: Settings > Integrations > Vercel > Reconnect.

**Data is stale:**
Vantage polls providers on a schedule (typically hourly for Anthropic, daily for Vercel). For real-time data, use the direct APIs instead.
