# ccusage — Local Claude Code Session Cost Tracking

## What It Is

ccusage parses the local JSONL session files written by AI coding assistants on your machine and computes token-based cost estimates. It does NOT connect to any billing API. It reads files from disk.

**This is personal dev spend tracking, not org billing.** Use it to understand how much you (one developer, one machine) are spending in coding sessions. Do not present ccusage output as organization-wide API cost data.

## Supported Clients

ccusage reads session logs from:
- **Claude Code** (`~/.claude/projects/`)
- **OpenCode** (`~/.opencode/sessions/`)
- **Codex CLI** (`~/.codex/sessions/`)
- **Amp** (`~/.amp/sessions/`)

If a client stores sessions in a non-default path, ccusage may not find them automatically.

## Installation

No installation required. Run directly with npx:

```bash
npx ccusage@latest
```

This always pulls the latest version. For repeated use in scripts, pin a version:

```bash
npx ccusage@0.9.2
```

## Usage Modes

### Interactive Report (Default)

```bash
npx ccusage@latest
```

Opens an interactive TUI showing sessions sorted by cost, with model breakdown and date range selector.

### Daily Breakdown

```bash
npx ccusage@latest --daily
```

Shows cost per day for the past 30 days. Useful for spotting high-spend days.

### Monthly Breakdown

```bash
npx ccusage@latest --monthly
```

Aggregates by calendar month. Good for trend analysis.

### Per-Model Breakdown

```bash
npx ccusage@latest --model
```

Shows total tokens and cost broken down by model (opus, sonnet, haiku). Useful for identifying which model is driving most of your personal spend.

### 5-Hour Billing Window Blocks

```bash
npx ccusage@latest --blocks
```

Aligns costs to Anthropic's 5-hour billing window blocks (used for Max plan and similar subscription pricing). Useful if you're on a usage-based plan with windowed rate limits.

### Session List

```bash
npx ccusage@latest --sessions
```

Lists individual sessions with start time, duration, model, and cost estimate.

### JSON Output (for scripting)

```bash
npx ccusage@latest --json
```

Outputs raw JSON suitable for piping to `jq` or importing into other tools.

```bash
# Example: sum total cost in USD
npx ccusage@latest --json | jq '.totalCost'

# Example: find most expensive sessions
npx ccusage@latest --json --sessions | jq '[.sessions[]] | sort_by(-.cost) | .[0:5]'
```

## Example Output

```
ccusage v0.9.2 — Claude Code Usage Report

Period: 2026-03-07 → 2026-03-14

┌─────────────────────────────────────────┐
│ Total Cost:        $24.18               │
│ Total Sessions:    47                   │
│ Active Days:       7 / 7                │
└─────────────────────────────────────────┘

By Model:
  claude-sonnet-4-5    $18.42  (76%)
  claude-haiku-4-5     $4.21   (17%)
  claude-opus-4        $1.55   (7%)

By Day:
  2026-03-13  $5.84  ████████████████
  2026-03-12  $4.12  ███████████
  2026-03-11  $3.91  ██████████
  ...
```

## Pricing Model

ccusage applies Anthropic's published per-token pricing to compute cost estimates. Prices are bundled in the package and updated with each release. If Anthropic changes pricing, you may need to update ccusage.

Cache tokens (cache read vs cache creation) are priced separately and are tracked correctly when the session logs include cache token counts.

## Limitations

- **Local machine only.** ccusage cannot aggregate across a team. Each developer runs it on their own machine.
- **Estimate, not invoice.** Costs are computed from token counts × published rates. They will not exactly match Anthropic invoices due to rounding, subscription plan credits, and Priority Tier costs.
- **No historical data beyond what's on disk.** If you delete session logs or work across multiple machines, ccusage will not have a complete picture.
- **No real-time data.** ccusage reads completed sessions, not live sessions.

## When to Use vs Anthropic Admin API

| Need | Tool |
|------|------|
| My personal dev spend this week | ccusage |
| How much our org spent on claude-sonnet | Anthropic Admin API (`usage_report`) |
| Which agent called the API most | Anthropic Admin API (`group_by=api_key`) |
| What did a specific session cost me | ccusage `--sessions` |
| Org invoice reconciliation | Anthropic Admin API (`cost_report`) |
