# Checks and CLI Output

Read this reference when running a scan, selecting a check, parsing JSON, or
explaining coverage. The observations below were validated with Vercel CLI
59.5.0 on 2026-08-26; verify the live documentation before treating them as an
evergreen contract.

## Scope and Output Modes

Use a project scan when a project is named:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> --findings
```

Use a team-wide scan only when the entire team is in scope:

```bash
vercel security check --scope <TEAM_SLUG> --findings
```

Pass a check slug to deep-dive one control. For automation, request JSON and
non-interactive output explicitly. `--limit 1` reduces samples but does not
remove identities:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> \
  --json --limit 1 --non-interactive --no-color
```

Do not print raw JSON in a public CI log. Pipe it directly into a parser or
retain it as a restricted artifact.

## Current Check Catalog

| Check slug | Risk | Control |
|---|---|---|
| `members-no-mfa` | High | Team members without MFA |
| `members-too-many-owners` | High | Too many team owners |
| `pats-no-expiration` | High | Personal access tokens without expiration |
| `env-vars-creds-instead-of-oidc` | High | Static credentials where OIDC is available |
| `depl-no-git-fork-protection` | High | Projects without Git fork deploy prevention |
| `proj-no-preview-depl-protection` | High | Public preview deployments |
| `env-vars-non-sensitive` | Medium | Variables not marked Sensitive |
| `env-vars-non-sensitive-stale` | Medium | Variables older than 90 days |
| `env-vars-exposed-web-app-fwk` | Medium | Framework-exposed variables |

Fail closed on an unknown slug until the live catalog is reviewed. Do not
guess its risk from its name.

## JSON Contract and Count Semantics

Machine output places results under `.report`, keyed by check slug. Each value
contains `violationsCount`, `sampleType`, and `samples`; some values also
contain `totalCount` and `truncated`.

- Interpret `violationsCount` as the finding count, subject to truncation.
- Interpret `totalCount` as the inspected population, not the finding count.
- Interpret `truncated: true` as a lower bound. Render `100` as `100+`, not as
  an exact result.
- Do not infer risk, status, or mute state when the JSON omits those fields.
- Treat `no access`, permission errors, and unavailable data as incomplete
  coverage.

Project a report to count-only data before emitting it to ordinary logs:

```bash
vercel security check --scope <TEAM_SLUG> --project <NAME_OR_ID> \
  --json --limit 1 --non-interactive --no-color \
  | jq '.report | with_entries(.value |= {
      violationsCount,
      truncated: (.truncated // false)
    })'
```

The CLI exit code does not communicate finding status: a completed scan can
exit 0 with violations. Parse the report and apply an explicit policy.

## Other Surfaces

Interactive output includes risk, status, violation count, and muted count.
Use a surface that actually exposes mute state when policy depends on it;
absence from JSON is not evidence of zero muted findings.

The UI lives at Team Settings → Security & Privacy → Security Dashboard and
supports CSV export for authorized triage or evidence collection.
