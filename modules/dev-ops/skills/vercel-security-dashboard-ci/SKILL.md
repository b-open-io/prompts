---
name: vercel-security-dashboard-ci
description: >-
  This skill should be used when the user asks to "gate Vercel security in CI", "add
  vercel security check to GitHub Actions", "fail builds on Vercel security findings",
  or "automate Vercel Security Dashboard remediation". Covers redacted JSON policy
  gates, scoped credentials, authorized setting changes, and closure checks.
version: 0.1.0
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - WebFetch
---

# Vercel Security Dashboard CI

Build a deterministic CI policy around `vercel security check`. Keep posture
triage and risk acceptance with security-ops; own repeatable execution,
authorized Vercel changes, and verification.

## Load Detail on Demand

Read [references/policy-and-remediation.md](references/policy-and-remediation.md)
before implementing or modifying a CI gate, changing Vercel settings, or
diagnosing a policy mismatch. Do not load it for a simple explanation of who
owns the workflow.

## Essential Invariants

- Pass the team with `--scope` and add `--project` unless a team-wide gate is
  explicitly intended.
- Parse `.report`; do not gate on exit status because findings still exit 0.
- Keep raw samples out of public logs. `--limit 1` minimizes identities but
  does not redact them.
- Fail closed on unknown check slugs, schema changes, permission failures, and
  unavailable coverage.
- Treat `truncated: true` as a lower bound and `totalCount` as inspected
  population.
- Obtain explicit approval immediately before Vercel mutations or muting.

## Minimal Scan

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> \
  --json --limit 1 --non-interactive --no-color
```

Pipe the raw output directly into the policy evaluator or store it as a
restricted artifact. Emit only check slug, policy class, violations,
truncation, and coverage state.

Verify `https://vercel.com/docs/cli/security` before changing automation. Pin
the tested CLI version in CI when stable output is required, and update the
parser deliberately when that version changes.

After an authorized remediation, rerun the identical command and correlate the
timestamped delta with the applied change or audit log. A successful deploy is
not closure evidence.
