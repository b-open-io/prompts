---
name: vercel-security-dashboard
description: >-
  This skill should be used when the user asks to "audit Vercel security posture", "run
  vercel security check", "triage Vercel Security Dashboard findings", "mute a Vercel
  security finding", or "verify Vercel security remediation". Covers read-only posture
  scans, finding interpretation, risk acceptance, and closure evidence; not source-code
  vulnerability analysis.
version: 0.1.0
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - WebFetch
---

# Vercel Security Dashboard

Use the Security Dashboard for deployed platform posture: members, access
tokens, projects, deployments, and environment variables. Treat it as a
complement to source-code scanners, not a substitute for them.

## Load Only the Needed Detail

- Read [references/checks-and-output.md](references/checks-and-output.md) when
  selecting checks, parsing CLI output, interpreting counts, or troubleshooting
  coverage.
- Read [references/triage-and-remediation.md](references/triage-and-remediation.md)
  only when prioritizing findings, proposing changes, accepting risk, or proving
  closure.

Do not load both references for a simple posture snapshot.

## Essential Invariants

- Pass `--scope <TEAM_SLUG>` explicitly. Add `--project <NAME_OR_ID>` when the
  request names a project; do not silently widen a project audit to the team.
- Treat `vercel security check` as read-only. It reports findings but does not
  apply the linked fixes.
- Treat raw output as sensitive. Samples can identify members, tokens,
  projects, deployments, and environment-variable metadata even with
  `--limit 1`.
- Do not use process status as the policy result. The command exits 0 when
  findings exist.
- Treat unavailable or unauthorized checks as unknown coverage, never a pass.
- Obtain explicit authorization immediately before changing roles, MFA policy,
  tokens, secrets, OIDC, deployment protection, or mute state.

## Minimal Workflow

Confirm the intended team and project, then run the narrowest useful scan:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> --findings
```

For structured analysis, keep the raw report in a protected pipe or restricted
artifact and emit only a redacted summary:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> \
  --json --limit 1 --non-interactive --no-color
```

Record the timestamp, scope, check slug, violation count, truncation state, and
coverage state. Preserve capped values as lower bounds such as `100+`.

Before changing automation or relying on the check catalog, verify the live
CLI documentation at `https://vercel.com/docs/cli/security`; flags and schemas
can evolve.

## Ownership

- Route platform posture, finding triage, and risk acceptance to security-ops.
- Route Vercel setting changes and CI enforcement to devops.
- Route application-code or repository-configuration defects exposed by a
  finding to code-auditor.

Report resolved, remaining, muted, and unavailable findings separately. Claim
"all clear" only when the agreed scope has no unmuted High or Medium findings
and no untriaged coverage gaps.
