---
name: shadscan
version: 1.0.0
description: >-
  This skill should be used when the user asks to "audit my shadcn app",
  "run shadscan", "improve my shadscan score", "raise my shadscan grade",
  "fix accessibility/states/forms regressions in my shadcn components", or
  "add a shadscan CI gate". Drives the shadscan static analyzer
  (`npx @shadscan/cli`) through an audit → fix → re-score loop against shadcn
  React components, and wires it into CI as a score gate.
user-invocable: true
---

# shadscan

`shadscan` is a **deterministic static analyzer for shadcn/React apps**. It
grades UI fundamentals — same result every run, built for the terminal and CI.
Use it to measure and then *raise* the quality of shadcn components, and to gate
merges on a minimum score.

This skill is the driver. The actual fixes belong to the shadcn-capable agents
(`designer` / Ridd, `nextjs` / Theo); this skill tells you how to run the tool,
read the score, and loop until the grade passes.

## What it scores

One `0–100` score plus a letter grade, across six categories:

| Category | What it inspects |
|----------|------------------|
| `foundation` | Base component setup, tokens, structural correctness |
| `interaction` | Pointer/keyboard interaction wiring |
| `states` | hover / focus / active / disabled / loading / error coverage |
| `accessibility` | Labels, roles, ARIA, contrast, keyboard reachability |
| `forms` | Form composition, validation, field/label association |
| `production-polish` | Empty states, responsiveness, finishing details |

## Command surface

```bash
# Audit the project (or a path). Human output with evidence + suggested fixes.
npx @shadscan/cli [path]

# Machine-readable report (schema v4) — parse this in scripts/CI.
npx @shadscan/cli --json

# Paste-ready Markdown handoff for an AI agent — THIS is the fix-loop input.
npx @shadscan/cli --format prompt

# Launch an installed coding agent directly with the findings.
npx @shadscan/cli --apply --agent claude   # or: codex | grok

# Audit one category only (tight loops).
npx @shadscan/cli --category accessibility

# CI gate: exit 1 when the score is below the floor (or can't be assessed).
npx @shadscan/cli --fail-under 85

# Neutral copy for CI/logs (disable the "roast" tone).
npx @shadscan/cli --json --no-roast

# Install a pre-commit hook that runs the scan.
npx @shadscan/cli setup --pre-commit
```

Other flags: `--no-interactive` (skip the post-scan menu — always use this in
scripts), `--roast` (force roast copy into JSON/CI), `--version`, `--help`.

## The audit → fix → re-score loop (how to get a good score)

Do not one-shot fixes and declare victory. Iterate against the tool:

1. **Baseline.** Run `npx @shadscan/cli <path> --json --no-interactive` and
   record the score, grade, and per-category breakdown. Report the number.
2. **Get the handoff.** Run `npx @shadscan/cli <path> --format prompt` to get
   the neutral, paste-ready findings, or scan one category with `--category`
   to focus. The `prompt` output is written *for* an agent — feed it to the
   fixer.
3. **Fix by category, lowest first.** Apply changes with the shadcn patterns
   the fixer already knows (see mapping below). Never edit
   `components/ui/*.tsx` source directly — customize via `className`/props or
   re-add with `shadcn@latest add <c> --overwrite`.
4. **Re-scan only what changed.** Re-run on the touched path (or category) and
   confirm the score moved up. If a category didn't improve, read its evidence
   again — the tool cites exact locations.
5. **Repeat** until the grade meets the target (or `--fail-under` passes).
6. **Report the delta.** State before → after score and which categories moved.

### Category → fixer knowledge

The categories map almost 1:1 onto patterns the `designer` (Ridd) agent already
documents — reuse them rather than inventing fixes:

- `accessibility` → Ridd's Accessibility Checklist (labels, ARIA, focus order,
  contrast ≥ 4.5:1).
- `states` → Ridd's States list: implement hover, focus, active, disabled,
  loading, **and** error for every interactive element.
- `forms` → Ridd's react-hook-form + zod Form pattern (`FormField`/`FormLabel`/
  `FormMessage` association).
- `foundation` / `interaction` / `production-polish` → composition and
  app-integration concerns; hand to `nextjs` (Theo) when the fix is structural
  or data-bound, keep with Ridd when it's presentational.

## Agent handoff modes

- **Advisory (default in this repo):** `--format prompt` → paste the findings to
  the fixer agent, apply, re-scan. Keeps the human/agent in control of edits.
- **Direct:** `--apply --agent claude` launches Claude Code with the handoff.
  Use when you want the tool to drive the agent end-to-end.

## CI gate (checker-owned)

The `tester` (Jason) agent owns the gate, not the fix:

- **Threshold:** add `npx @shadscan/cli . --fail-under <N> --no-interactive
  --no-roast` as a CI step. Non-zero exit fails the build.
- **GitHub Action:** shadscan ships `.github/workflows/shadscan.yml`. Inputs:
  `path`, `version`, `category`, `fail-under`, `create-issue`, `issue-label`,
  `github-token`. Outputs: `score`, `grade`, `report-path` — surface these in
  the PR.
- **Pre-commit:** `npx @shadscan/cli setup --pre-commit` for local enforcement.

See `references/reference.md` for the full flag list, JSON schema notes, a
ready-to-drop Action workflow, and a per-category fix playbook.
