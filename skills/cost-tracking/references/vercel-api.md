# Vercel Billing API & Spend Management

## Authentication

Use the same Vercel API token you use for deployments. Bearer token in the Authorization header.

```bash
export VERCEL_TOKEN="your-vercel-api-token"
```

Generate tokens at: `vercel.com/account/tokens`

## Billing Charges API

Returns historical billing charges in FOCUS v1.3 format.

```
GET https://api.vercel.com/v1/billing/charges
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | Unix timestamp (ms) | Yes | Start of billing window |
| `to` | Unix timestamp (ms) | Yes | End of billing window |
| `teamId` | string | No | Team ID (use instead of `slug`) |
| `slug` | string | No | Team slug (use instead of `teamId`) |

**Constraints:**
- Maximum range: 1 year
- Minimum granularity: 1 day
- Either `teamId` or `slug` is required for team accounts

### Example Request

```bash
# Last 30 days of charges
FROM=$(date -v-30d +%s)000
TO=$(date +%s)000

curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/billing/charges?from=$FROM&to=$TO&slug=my-team"
```

### Response Format

The response is **newline-delimited JSONL** (not a JSON array). Each line is one charge record in FOCUS v1.3 format.

```jsonl
{"BilledCost":"0.0240","EffectiveCost":"0.0240","BillingPeriodStart":"2026-03-13T00:00:00Z","BillingPeriodEnd":"2026-03-14T00:00:00Z","ServiceName":"Bandwidth","ResourceId":"dpl_xxxxx","Tags":{"projectName":"my-app","teamSlug":"my-team"}}
{"BilledCost":"0.0060","EffectiveCost":"0.0060","BillingPeriodStart":"2026-03-13T00:00:00Z","BillingPeriodEnd":"2026-03-14T00:00:00Z","ServiceName":"Function Duration","ResourceId":"dpl_yyyyy","Tags":{"projectName":"another-app","teamSlug":"my-team"}}
```

**Parse JSONL in bash:**
```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/billing/charges?from=$FROM&to=$TO&slug=my-team" \
  | while IFS= read -r line; do echo "$line" | jq .; done
```

**Parse JSONL with jq (slurp mode):**
```bash
curl -s ... | jq -s '[.[] | {service: .ServiceName, cost: (.BilledCost | tonumber), project: .Tags.projectName}]'
```

## FOCUS v1.3 Field Reference

FOCUS (FinOps Open Cost and Usage Specification) is the industry standard format. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `BilledCost` | decimal string | Amount charged to the account in USD |
| `EffectiveCost` | decimal string | Cost after discounts and credits |
| `BillingPeriodStart` | ISO 8601 | Start of the billing period for this charge |
| `BillingPeriodEnd` | ISO 8601 | End of the billing period |
| `ServiceName` | string | Vercel service category (see below) |
| `ResourceId` | string | Deployment ID or resource identifier |
| `Tags` | object | Metadata including `projectName`, `teamSlug` |
| `ChargeCategory` | string | `Usage`, `Tax`, `Credit`, etc. |
| `ChargeSubcategory` | string | More specific charge type |

**Common `ServiceName` values:**
- `Bandwidth` — Data transfer out
- `Function Duration` — Serverless function compute time
- `Function Invocations` — Number of function calls
- `Build Minutes` — CI/CD build time
- `Edge Middleware` — Edge function invocations
- `Image Optimization` — Image resizing/conversion
- `KV Storage` — Vercel KV (Redis) reads/writes
- `Blob Storage` — Vercel Blob storage/egress
- `Postgres` — Vercel Postgres compute/storage

## Spend Management Webhooks

Configure budget thresholds in the Vercel dashboard. Webhooks fire automatically when spend crosses thresholds.

### Setup

1. Go to `vercel.com/teams/<slug>/settings/billing`
2. Enable Spend Management
3. Set monthly budget
4. Configure webhook endpoint URL

### Threshold Events

Webhooks fire at:
- **50%** of configured monthly budget
- **75%** of configured monthly budget
- **100%** of configured monthly budget

### Webhook Payload

```json
{
  "type": "billing.spend_limit_reached",
  "teamId": "team_xxxxx",
  "teamSlug": "my-team",
  "currentSpend": "75.42",
  "budgetAmount": "100.00",
  "percentageReached": 75,
  "timestamp": "2026-03-13T14:22:00Z"
}
```

### Webhook Handler (Hono example)

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.post('/webhooks/vercel-billing', async (c) => {
  const payload = await c.req.json()

  if (payload.type === 'billing.spend_limit_reached') {
    const { currentSpend, budgetAmount, percentageReached, teamSlug } = payload
    // Alert your team, pause non-critical deploys, etc.
    console.log(`Team ${teamSlug}: ${percentageReached}% of $${budgetAmount} budget used ($${currentSpend})`)
  }

  return c.json({ received: true })
})
```

## CLI: Quick Spend Check

For a fast summary of current-period spend without scripting:

```bash
vercel usage
```

Outputs current billing period start date, amount spent, and any configured budget. Requires Vercel CLI installed and authenticated (`vercel login`).

## Important Limitation: Vercel MCP Server

The official Vercel MCP server does NOT expose billing or cost data. It provides project management, deployment, and log access only.

To query billing data you must use the direct REST API (`/v1/billing/charges`) — not the MCP server.

## Cost Analysis Recipes

### Per-Project Cost Breakdown

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/billing/charges?from=${FROM}&to=${TO}&slug=${SLUG}" \
  | jq -s '[.[] | {project: .Tags.projectName, service: .ServiceName, cost: (.BilledCost | tonumber)}]
    | group_by(.project)
    | map({project: .[0].project, total: (map(.cost) | add)})
    | sort_by(-.total)'
```

### Top Services by Cost

```bash
curl -s ... \
  | jq -s '[.[] | {service: .ServiceName, cost: (.BilledCost | tonumber)}]
    | group_by(.service)
    | map({service: .[0].service, total: (map(.cost) | add)})
    | sort_by(-.total)
    | .[0:10]'
```

### Identify Unused Projects with Non-Zero Spend

Combine Vercel billing data with project list to find projects that are costing money but have had no recent deployments. Query `GET /v9/projects` for deployment timestamps, then cross-reference with billing charges by `Tags.projectName`.
