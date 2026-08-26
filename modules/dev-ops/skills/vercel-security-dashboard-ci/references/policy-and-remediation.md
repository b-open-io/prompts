# CI Policy and Remediation

Read this reference when implementing the gate, changing its policy, applying
an approved Vercel fix, or diagnosing unexpected output.

## Safe Input Projection

Request structured non-interactive output and remove sample identities before
ordinary logging:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> \
  --json --limit 1 --non-interactive --no-color \
  | jq '.report | with_entries(.value |= {
      violationsCount,
      truncated: (.truncated // false)
    })'
```

The raw JSON lives under `.report`, keyed by check slug. Values include
`violationsCount`, `sampleType`, and `samples`, with optional `totalCount` and
`truncated`. Do not confuse `totalCount` with violations. Preserve a truncated
count as `N+`. Do not infer risk, status, or mute state from an absent field.

## Explicit Policy Map

Define policy from reviewed slugs rather than trusting labels omitted from
machine output.

High-risk slugs:

- `members-no-mfa`
- `members-too-many-owners`
- `pats-no-expiration`
- `env-vars-creds-instead-of-oidc`
- `depl-no-git-fork-protection`
- `proj-no-preview-depl-protection`

Medium-risk slugs:

- `env-vars-non-sensitive`
- `env-vars-non-sensitive-stale`
- `env-vars-exposed-web-app-fwk`

A typical gate fails on any positive High-risk count, reports Medium findings
for triage, and fails closed on unknown slugs or incomplete coverage. Keep the
policy configurable when a team has a documented alternative. Do not encode
muting from JSON unless the selected CLI surface actually reports it.

The command can exit 0 with findings, so use parse success and policy outcome
as separate states:

1. Fail the job when the command or JSON parse fails.
2. Fail closed when expected coverage is absent or permissions are insufficient.
3. Evaluate every returned slug against the reviewed risk map.
4. Emit a redacted summary and link the restricted artifact or Dashboard.

## Credentials and Scope

Use the narrowest credential that can read the intended checks. Separate scan
credentials from mutation credentials when practical. Do not let a team-wide
token silently widen a project gate.

Pin the Vercel CLI version when schema stability matters. Treat a version bump
as a parser/policy change: inspect the live docs, capture a protected fixture,
and test unknown-field and missing-coverage behavior.

## Authorized Remediation

Apply fixes through Vercel settings or another authorized interface; the check
command is report-only. Common fixes include:

- enabling Git fork and preview deployment protection;
- marking environment variables Sensitive and rotating their values;
- removing or rotating stale variables;
- keeping secrets out of framework-exposed namespaces;
- replacing supported static credentials with OIDC federation;
- enforcing MFA, reducing owners, and replacing non-expiring PATs.

Require explicit approval for team membership, MFA policy, token revocation,
secret rotation, OIDC migration, deployment protection, production auth, and
muting. Muting is recorded risk acceptance, not remediation; route that
decision to security-ops.

Send application-code or repository-configuration changes to code-auditor.
After remediation, rerun the identical scoped check, timestamp both snapshots,
and correlate the delta with the authorized action or audit log before claiming
closure.
