---
allowed-tools: Skill(review:visual-review), Skill(core:humanize), Skill(core:postplan), Bash(git:*), Bash(gh:*), Bash(open:*), Bash(npx bitplan:*), Read, Write, Glob, Grep
description: Turn a PR, branch, commit, or diff into a plain-language visual review with grounded diagrams and decision questionnaires
argument-hint: "[branch | commit-sha | PR# | --base <ref>] (default: current branch vs main)"
---

## Your Task

Invoke `Skill(review:visual-review)` and follow it exactly.

Resolve the recap target from the arguments: `$ARGUMENTS`

- Empty → current branch vs `main` (or the repo's default branch): `git diff main...HEAD`
- A branch name → that branch vs the base (`--base <ref>` overrides `main`)
- A commit SHA → `git show <sha>`
- A PR number (e.g. `42` or `#42`) → `gh pr diff <number>`
- `--wt` → uncommitted working tree: `git diff HEAD`

If the resolved diff is tiny (1-2 files, no schema/API/UI surface), say so and
recommend reviewing it directly with `bunx critique --web --open` instead of
building a recap — then stop unless the user insists.

Otherwise build the recap per the skill: copy the template, ground every
structured section in the real diff, fill the canonical skeleton, and deliver
the rendered page through the delivery path selected by the skill.
