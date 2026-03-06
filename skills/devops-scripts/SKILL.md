---
name: devops-scripts
description: "Deterministic shell scripts for infrastructure health checks and environment validation. This skill should be used when checking deployment health, verifying service connectivity, validating required environment variables before deployment, running pre-deploy smoke checks, diagnosing connectivity issues with Vercel, Railway, Redis, or PostgreSQL, or when the agent needs structured JSON output about infrastructure state without burning context on inline bash logic."
user-invocable: true
allowed-tools:
  - Bash
---

# DevOps Scripts

Mechanical infrastructure checks are handled by scripts. The agent's job is to run them and act on the structured JSON they return — not to reinvent connectivity probes inline.

## Scripts

### `health-check.sh` — Service Connectivity

Checks Vercel deployment status, Railway project status, Redis connectivity, and PostgreSQL connectivity. Each service is checked independently; missing CLI tools produce an informative JSON error rather than crashing the script.

```bash
bash <skill-path>/scripts/health-check.sh
```

Reads from environment:
- `REDIS_URL` — defaults to `redis://localhost:6379`
- `DATABASE_URL` — defaults to `postgresql://localhost:5432/dev`
- `VERCEL_ORG_ID` — optional, scopes the `vercel ls` check

Returns JSON:

```json
{
  "overall": "ok",
  "services": {
    "vercel":   { "status": "ok",           "error": "" },
    "railway":  { "status": "missing_tool", "error": "railway CLI not found — install with: bun add -g @railway/cli" },
    "redis":    { "status": "ok",           "error": "" },
    "postgres": { "status": "error",        "error": "Connection refused" }
  }
}
```

| `status` value  | Meaning |
|-----------------|---------|
| `ok`            | Service responded successfully |
| `error`         | CLI found but check failed — read `error` for details |
| `missing_tool`  | CLI not installed — `error` contains install instructions |
| `skipped`       | Not reached (should not appear in normal output) |

Act on results:

- `overall: "ok"` — all checked services healthy, proceed
- `overall: "error"` — at least one service failed; read the `error` field and fix before deploying
- Any `missing_tool` — tell the user which CLI to install; do not block deployment for unrelated services

### `verify-env.sh` — Environment Variable Validation

Takes a list of variable names as arguments. Reports which are set and which are missing.

```bash
bash <skill-path>/scripts/verify-env.sh REDIS_URL DATABASE_URL VERCEL_TOKEN BSV_PRIVATE_KEY
```

Returns JSON:

```json
{
  "all_set": false,
  "present": ["REDIS_URL", "DATABASE_URL"],
  "missing": ["VERCEL_TOKEN", "BSV_PRIVATE_KEY"]
}
```

Use this before any deployment or migration. If `all_set` is `false`, report each missing variable and where to set it (Vercel dashboard, Railway variables, or `.env.local`) — then stop. Do not proceed with a deployment that is missing required secrets.

## When to Use Each Script

| Situation | Script |
|-----------|--------|
| Pre-deploy smoke check | Both — verify env first, then health-check |
| Diagnosing a broken staging environment | `health-check.sh` |
| Setting up a new environment | `verify-env.sh` with the project's required vars |
| Post-deploy validation | `health-check.sh` |
| CI pre-flight gate | `verify-env.sh` with secrets the pipeline needs |

## Typical Workflow

```
1. Run verify-env.sh with required vars → confirm all_set: true
2. Run health-check.sh → confirm overall: "ok"
3. Deploy
4. Run health-check.sh again post-deploy → confirm services still healthy
```

If any step produces an error, fix it before continuing. These scripts never retry or fall back silently — a clear failure now prevents a silent failure in production.
