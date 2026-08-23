---
name: write-pr
description: This skill should be used when opening a GitHub pull request, running `gh pr create`, writing a PR title or body, editing a PR description, or when a PR dumps loop state (NEXT CYCLE STARTS HERE, checker verdict, ticket-id prefix).
---

# Write a pull request

GitHub is for humans. Tickets are for work items. The loop ledger is for the loop.

The always-on contract lives in `AGENTS.md` / `CLAUDE.md` under **Pull requests**.
`scripts/lint-pr.sh` is the gate. Detail: software-factory `references/human-artifacts.md`.

## Title

Imperative summary a reviewer can read, then `[KEY-1234]`.

```
Fix invoice PDF 404 [ENG-1234]
```

Do not start the title with `ENG-1234:`.

## Body

```markdown
## Problem
<what is broken or missing>

## Change
<what this PR does>

## Risk
<optional, one sentence>
```

At most 40 lines. Loop process belongs in a **PR comment**, not the body.

## Gate

```bash
bash scripts/lint-pr.sh --title "$TITLE" --body-file /tmp/pr-body.md
```

A non-zero exit means rewrite. Do not call `gh pr create` until it exits 0.
