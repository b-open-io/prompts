# Human artifacts

GitHub is for humans. The ticketing system is for work items. The loop ledger
is for the loop. Mixing those audiences is a field failure: auto-merged PRs
whose titles start with ticket ids and whose bodies dump checker state, so a
human cannot scan what shipped (Scribe, 2026-08). T3 Code discovers the
contract by putting it in `AGENTS.md`, which every session loads. T3 does
**not** auto-merge, so prompt-only is enough there. A loop that merges without
a human rewrite needs **code**.

Staff PR-text checks as code, not as another prompt. Reliability ranks
code > engineers > agents.

## When this applies

Any execution worker whose connectors include `gh pr create`, especially if
the blast-radius tier allows auto-merge to a staging branch.

Skip only when the loop never opens a GitHub pull request.

## Contract

- **Title:** an imperative summary a reviewer can read, then the ticket id as a
  suffix: `Fix invoice PDF 404 [ENG-1234]`. Never start the title with
  `ENG-1234:`. linear-sync and similar hooks match the id *anywhere* in the
  title. Commits may still start with `ENG-1234:` if a commit-guard requires it.
- **Body, in this order:** `## Problem` (what is broken or missing),
  `## Change` (what this PR does), optional `## Risk` (one sentence). At most
  40 lines. One concern per PR.
- **Loop process belongs in a PR comment**, never the body: checker
  objections, `NEXT CYCLE STARTS HERE`, phase timings, work-item ids, STE-100.
- **Chat voice is not GitHub voice.** Controlled English to the maintainer in
  the terminal does not belong on the pull request.

Discovery (always-on): a **Pull requests** section in the project's
`AGENTS.md` / `CLAUDE.md`. That is the T3 lever. Skills fade mid-session;
this file is injected every turn.

Enforcement (code): `scripts/lint-pr.sh` before `gh pr create`, plus
`.github/workflows/pr-lint.yml` so a skipped script still fails CI.

## Scaffold (`/factory-init` copies these)

From this skill directory:

| Source | Destination |
|---|---|
| `scripts/lint-pr.sh` | `<repo>/scripts/lint-pr.sh` |
| `templates/pr-lint.yml` | `<repo>/.github/workflows/pr-lint.yml` |
| `templates/pull_request_template.md` | `<repo>/.github/pull_request_template.md` |
| `templates/write-pr/SKILL.md` | `<repo>/.claude/skills/write-pr/SKILL.md` (if the project commits skills) |

Append the **Pull requests** section below to `AGENTS.md` or `CLAUDE.md`.
In the exec/ship prompt: run `bash scripts/lint-pr.sh --title "$TITLE" --body-file "$BODY"`
and do not call `gh pr create` on a non-zero exit.

## AGENTS.md section (paste)

```markdown
## Pull requests

GitHub is for humans. Tickets are for work items. The loop ledger is for the loop.

- **Title:** an imperative summary a reviewer can read, then `[KEY-1234]`.
  Example: `Fix invoice PDF 404 [ENG-1234]`. Never start the title with `ENG-1234:`.
- **Body, in this order:** `## Problem`, `## Change`, optional `## Risk`. At most 40 lines.
- **One concern per PR.** If the body says "also", split the work.
- **Loop process** (checker objections, `NEXT CYCLE STARTS HERE`, phase timings)
  belongs in a PR **comment**, never the body.
- Run `bash scripts/lint-pr.sh --title "$TITLE" --body-file "$BODY"` and do not
  open the PR if it fails.
```

Adapt `ENG` to the project's ticket prefix. The linter accepts any
`[A-Z]{2,5}-[0-9]+` key, or a GitHub issue `#123`.
