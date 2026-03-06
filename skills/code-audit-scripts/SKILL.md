---
name: code-audit-scripts
description: "Run deterministic code security and quality scans — secret detection, debug artifact cleanup, and TODO/FIXME tracking. Use this skill before any security review, code audit, PR review, or when the user says 'scan for secrets', 'find debug logs', 'check for TODOs', 'audit this code', 'security scan', or 'clean up before shipping'. Also use proactively before deployments or when reviewing unfamiliar codebases. Runs all scans in parallel for speed."
user-invocable: true
allowed-tools:
  - Bash
---

# Code Audit Scripts

Deterministic security and quality scans that output structured JSON. No LLM reasoning needed for the scanning — your job is to interpret results and recommend fixes.

## Quick Start

Run everything at once:

```bash
bash <skill-path>/scripts/parallel-audit.sh /path/to/project
```

Returns a merged JSON report with all findings categorized by type and severity.

## Individual Scans

### Scan for Hardcoded Secrets

```bash
bash <skill-path>/scripts/scan-secrets.sh /path/to/project
```

Detects: API_KEY, SECRET, PASSWORD, PRIVATE_KEY, ACCESS_KEY, DATABASE_URL, JWT_SECRET, STRIPE_SK, and more. Filters out references to env vars (process.env, os.environ) to reduce false positives.

### Scan for Debug Artifacts

```bash
bash <skill-path>/scripts/scan-debug.sh /path/to/project
# Include test files:
bash <skill-path>/scripts/scan-debug.sh /path/to/project --include-tests
```

Detects: console.log/debug/warn, debugger statements (JS/TS), print/breakpoint (Python), fmt.Println (Go). Skips test files by default.

### Scan for TODOs and FIXMEs

```bash
bash <skill-path>/scripts/scan-todos.sh /path/to/project
```

Categorizes by severity:
- **High**: FIXME, BUG, HACK, XXX — these need attention before shipping
- **Low**: TODO — tracked work items

## Acting on Results

| Finding Type | What to Do |
|---|---|
| **Secrets** with real values | Immediately flag to user. Rotate the credential. Move to env var. |
| **Secrets** that are env var refs | False positive — ignore |
| **Debug artifacts** in src/ | Remove before shipping. List specific files and lines. |
| **Debug artifacts** in tests | Usually fine. Only flag if excessive. |
| **FIXME/HACK/XXX** | Flag as blockers for the current PR/deployment |
| **TODO** | Informational. Mention count but don't block on them. |

The `parallel-audit.sh` output includes a `summary` object with counts per category and `high_priority` count — use this for quick pass/fail decisions.
