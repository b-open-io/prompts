# shadscan — Full Reference

Deep detail for the `shadscan` skill. Load this when you need the complete flag
surface, the CI workflow, or a per-category fix playbook. Keep the top-level
`SKILL.md` as the day-to-day driver.

## Install / invocation

`shadscan` is distributed as `@shadscan/cli` and is normally run without a local
install:

```bash
npx @shadscan/cli [path] [options]     # npm
pnpm dlx @shadscan/cli [path] [options] # pnpm
bunx @shadscan/cli [path] [options]     # bun
```

`[path]` defaults to the current directory. Point it at `src/components` or a
single feature folder for tight loops.

## Full flag reference

| Flag | Purpose |
|------|---------|
| `--format <human\|json\|prompt>` | Output mode. `human` (default) prints a progress bar, per-category scores, cited evidence, and suggested fixes. `json` emits the full report (schema version 4). `prompt` emits neutral, paste-ready Markdown for an AI agent. |
| `--json` | Shorthand for `--format json`. |
| `--prompt` | Shorthand for `--format prompt`. |
| `--apply` | Launch the installed coding agent with the findings handoff. |
| `--agent <claude\|codex\|grok>` | Which agent `--apply` should launch. |
| `--fail-under <0–100>` | Exit status `1` when the score is below the floor or cannot be assessed. Otherwise exit `0`. |
| `--category <name>` | Audit a single category only. |
| `--no-roast` | Neutral findings — disable "roast" copy. Use in CI/logs. |
| `--roast` | Force roast copy into CI/JSON output. |
| `--no-interactive` | Disable the post-scan menu. Always set this in scripts/CI. |
| `--help` | Usage and options. |
| `--version` | Installed CLI version. |

### Subcommand

```bash
shadscan setup --pre-commit [--dry-run] [--yes]
```

Installs a pre-commit hook that runs the scan. `--dry-run` previews the change;
`--yes` skips confirmation.

## Exit codes

- `0` — scan completed (findings alone do **not** fail the run).
- `1` — with `--fail-under`, the score is below the floor or could not be
  assessed.

This is deliberate: a scan is informational until you opt into a gate. CI must
pass `--fail-under` to enforce a threshold.

## JSON report

`--json` returns the complete audit report at **schema version 4**. Expect a
top-level score and grade plus a per-category breakdown, each category carrying
its findings with cited file locations. Parse the score/grade for gating and
the per-category findings to route fixes. Pin the schema version you parse
against so a future CLI bump doesn't silently change your assumptions.

## Categories

| Category | Focus | Typical fixes |
|----------|-------|---------------|
| `foundation` | Base setup, tokens, structural correctness | Use theme CSS variables (`bg-background`, `text-foreground`) not hardcoded colors; correct component composition; consistent radii/spacing tokens. |
| `interaction` | Pointer + keyboard interaction wiring | Ensure interactive elements are real controls; keyboard operable; ESC/arrow handling on menus/dialogs. |
| `states` | Interactive state coverage | Implement **all** of hover, focus, active, disabled, loading, error for every interactive element. Missing `loading`/`error` states are the most common point loss. |
| `accessibility` | Labels, roles, ARIA, contrast, keyboard | Associate labels; add `aria-*` where semantics need it; visible focus indicators; contrast ≥ 4.5:1 (3:1 large text / UI); alt text. |
| `forms` | Form composition and validation | react-hook-form + zod with `Form`/`FormField`/`FormControl`/`FormLabel`/`FormMessage`; every field has an associated label and an announced error message. |
| `production-polish` | Finishing details | Empty states designed; responsive across mobile/tablet/desktop; no layout thrash; loading skeletons; optimized images/fonts. |

## Per-category fix playbook

Run `--category <name>` to isolate a category, apply the fixes below, then
re-scan that category only. Order: fix the lowest-scoring category first.

### accessibility
1. Every interactive element gets an accessible name (visible label, `aria-label`, or `aria-labelledby`).
2. Dialogs/menus: `aria-labelledby` + `aria-describedby`, focus trap, ESC to close, restore focus on close.
3. Visible focus ring on all focusable elements (never `outline: none` without a replacement).
4. Contrast: text ≥ 4.5:1, large text/UI ≥ 3:1. Fix tokens, not one-off overrides.

### states
1. For each interactive element, enumerate hover, focus, active, disabled, loading, error — implement each.
2. Buttons that trigger async work need an explicit `loading` (disabled + spinner) and an `error` surface.
3. Prefer shadcn/tailwind state variants (`hover:`, `focus-visible:`, `disabled:`, `aria-busy:`) over ad-hoc JS.

### forms
1. Wrap in shadcn `Form` with react-hook-form + `zodResolver`.
2. Each input inside `FormField` → `FormItem` → `FormLabel` + `FormControl` + `FormMessage`.
3. Errors render through `FormMessage` (announced), not a bare `<p>`.

### foundation / interaction / production-polish
1. Replace hardcoded colors with theme variables; unify radii/spacing to tokens.
2. Make custom interactive divs into real controls (`button`, `a`, Radix/Base primitives).
3. Add empty/loading/error surfaces and verify responsiveness; avoid CLS from unsized media.

Never edit `components/ui/*.tsx` shadcn source directly — customize via
`className`/props from the consumer, or `npx shadcn@latest add <c> --overwrite`.

## GitHub Action (ready to drop)

shadscan ships a reusable workflow. A minimal gate that fails PRs below a floor
and files an issue on regression:

```yaml
# .github/workflows/shadscan.yml
name: shadscan
on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run shadscan
        id: shadscan
        run: npx @shadscan/cli . --fail-under 85 --no-interactive --no-roast --json
```

If you prefer the packaged action (inputs `path`, `version`, `category`,
`fail-under`, `create-issue`, `issue-label`, `github-token`; outputs `score`,
`grade`, `report-path`), consult the shadscan docs for the exact
`uses:` reference and pin it to a released version. Surface `score`/`grade` in
the PR summary so reviewers see the delta.

## Ownership (bopen-tools agents)

- **`designer` (Ridd)** — primary fixer. Categories map onto his existing
  Accessibility Checklist, States list, and Form pattern.
- **`nextjs` (Theo)** — secondary fixer for structural/composition/data-bound
  findings (`foundation`, `interaction`, parts of `production-polish`).
- **`tester` (Jason)** — owns the CI gate: `--fail-under`, the Action, and the
  pre-commit hook. Enforces the score; does not apply UI fixes.

## Sources

- https://www.shadscan.com/
- https://www.shadscan.com/docs
