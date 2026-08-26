# Triage, Remediation, and Closure

Read this reference only when moving beyond a posture snapshot into ownership,
changes, risk acceptance, or closure evidence.

## Triage Record

Record each finding with:

- timestamp and exact team/project scope;
- check slug, documented risk, and affected entity;
- violation count plus any lower-bound or unavailable state;
- remediation owner, proposed change, and verification command;
- mute/risk-acceptance state only when the chosen output surface exposes it.

Prioritize High findings before Medium findings. Keep unavailable coverage in
the queue instead of treating it as clean.

## Common Remediation Paths

| Finding family | Typical remediation |
|---|---|
| Members without MFA | Enforce MFA after confirming team impact |
| Excess owners | Reduce owner privileges using least privilege |
| Non-expiring PATs | Replace or revoke tokens and require expiration |
| Static cloud credentials | Migrate supported integrations to short-lived OIDC |
| Fork deployments | Enable Git fork protection |
| Public previews | Enable preview deployment protection |
| Non-sensitive variables | Mark secrets Sensitive and rotate their values |
| Stale variables | Confirm ownership, then rotate or remove |
| Framework-exposed variables | Remove secrets from client-exposed namespaces and review application code |

Marking an existing variable Sensitive does not erase its previous
readability. Rotate the value as part of the same authorized fix.

## Authorization and Muting

Treat the scan itself as read-only. Obtain explicit authorization immediately
before changing team roles, MFA enforcement, tokens, secrets, OIDC,
deployment protection, or production authentication.

Do not mute a check or finding autonomously. Muting excludes it from the
security score and represents accepted risk. Show the exact finding and
rationale, obtain approval, and record who accepted the risk, why, and when.

## Closure Evidence

Rerun the identical scoped command after an authorized change. Compare by
check slug and affected entity, keeping truncated counts as lower bounds.
Report resolved, remaining, muted, and unavailable findings separately.

Timestamp both snapshots. Findings can change because another operator or an
asynchronous dashboard refresh ran between scans. Correlate the delta with the
authorized action or audit log before claiming causation. A successful deploy
or code review does not prove that the platform finding closed.

Route implementation deliberately:

- send Vercel settings and CI work to devops;
- send application-code or repository-configuration changes to code-auditor;
- retain posture ownership and risk acceptance with security-ops.
