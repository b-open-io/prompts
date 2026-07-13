---
name: visual-review
version: 0.0.2
description: Use this skill to turn a PR, branch, commit, or working-tree diff into a visual recap — a single self-contained, theme-aware HTML page with before/after UI wireframes, schema/API contract summaries, a file footprint map, and annotated key-change diffs — so a reviewer sees the SHAPE of a change before reading raw lines. Invoke it when the user asks to critique a change, review a diff visually, run a code review or diff review, or says "recap this PR", "visual recap", "show me what this branch changed", "summarize this diff visually", "make this PR reviewable", "explain what changed", or before reviewing any large, multi-file, UI-heavy, or schema/API-touching change. Code-review agents (code-auditor, architecture-reviewer) should produce one as the opening artifact of any big review. NOT for small single-file diffs — those review faster as a raw diff via `bunx critique --web --open`.
---

# Visual Review

A visual recap is the reverse of a plan: instead of describing a change you are
about to make, it describes the change that was just made, at a higher altitude
than line-by-line review. A reviewer scans the shape of the change — what UI
moved, which contracts changed, where the risky lines live — before spending
attention on literal lines. Diffs hide the shape of a change; the recap restores
it.

Heavily inspired by BuilderIO's visual recap skill, adapted for this stack: the
deliverable is a **single self-contained HTML file** built from
`assets/template.html` — no hosted service, no external requests, works offline,
theme-aware in light and dark. When the Artifact tool is available in the
session, publish it as an Artifact (default-private); otherwise write it locally
and `open` it in the browser.

## When to use — and when to skip

Build a recap when a change is large, multi-file, UI-heavy, or touches schema,
API contracts, permissions, or architecture — anywhere a reviewer benefits from
a map before the territory. Skip it for small, single-file, or obvious diffs: a
recap is review overhead, and a tiny change reviews faster as a plain diff
(`bunx critique --web --open`). The recap complements the raw diff, it never
replaces it — recap first for shape, raw diff for lines.

## Quick terminal alternative

For a fast local look without generating a recap page, `bunx critique --web
--open` renders the current diff in the browser with syntax highlighting and
split view (requires Bun). Use `bunx critique main HEAD --web --open` for a
PR-style branch comparison.

## Scope: recap the whole work unit

When invoked mid-session after work has happened, the default scope is the whole
work unit — original implementation, later bug fixes, tests, docs — not just the
most recent edit. Use the diff plus conversation context to separate work-unit
changes from unrelated pre-existing dirty state, and exclude the unrelated
edits. If scope is genuinely ambiguous, state your assumption in one line rather
than blocking on a question.

Resolve the diff mechanically before authoring anything:

```bash
# PR / branch (three-dot: changes since divergence, not target drift)
git diff --numstat main...HEAD
git diff --name-status main...HEAD
git diff main...HEAD -- <file>          # per-file, for key changes
# single commit:      git show <sha>
# working tree:       git diff HEAD
# GitHub PR:          gh pr diff <number>
```

## The grounding rule (the most important rule)

Structured sections are **true by construction** only if derived from the actual
changed lines. File paths, field names, types, methods, routes, line numbers,
and before/after code MUST come mechanically from the real diff — never
inferred, rounded, or invented. You write freely only in the prose narrative:
the why, the decisions, the risk read. A confidently wrong recap is worse than
no recap, because a reviewer who trusts the summary skips the very line the
summary got wrong. When the diff doesn't contain a fact, leave it out; when you
infer something (like a rendered layout you didn't screenshot), label it
inferred in a caption.

## Canonical skeleton

Copy `assets/template.html` (in this skill directory) and fill it top to bottom.
Every section maps to a template block; delete sections that don't apply rather
than padding them.

1. **Header** — title (≤70 chars), repo + ref, file/line stats as pills.
2. **UI impact** — before/after wireframes FIRST when the diff changes rendered
   UI. Read `references/wireframe.md` before authoring any wireframe. Delete
   the section for non-UI changes.
3. **What changed and why** — 1-3 paragraphs of narrative: the objective the
   diff served, key decisions visible in it, risks a reviewer should weigh.
   This is the only free prose. No boilerplate ("this recap is an aid…", "the
   reviewer should still…") — the header already carries provenance.
4. **Contract changes** — `table.model` cards for schema entities (per-field
   `added/modified/removed/renamed` badges; show the prior type with
   `<span class="was">`), endpoint cards for API changes (method, path, params
   as they exist AFTER the change; mark removed routes and breaking changes
   with the `breaking` badge plus a `note-risk`). Delete if no contracts moved.
5. **File footprint** — every changed file with its change badge and +/− stats,
   a short note only where the path doesn't explain itself.
6. **Key changes** — 3-8 tabs, one file per tab, each with a one-line
   `tab-summary` saying what the hunk changes and why, a split diff of the
   load-bearing hunks (≤~150 lines per tab; collapse boring stretches with a
   `ln skip` row), and a few `annotation` callouts anchored to line numbers.
   Brand-new files get an annotated walkthrough of the new code instead of a
   one-sided diff. Never leave a diff unlabeled.

Architecture or data-flow shifts get a `diagram` block (CSS panels from the
template — `diagram-panel` / `diagram-node` / `diagram-arrow`, two panels for
before/after) placed near the narrative. Use diagrams for structure and flow
only; rendered UI always gets wireframes, never a diagram.

## Budgets — substantial but lean

Lean is not thin. A recap that is one wireframe plus a sentence under-serves the
reviewer as much as boilerplate over-serves them. Before authoring, make a
surface inventory from the diff: changed routes, components, dialogs,
role/permission variants, empty/error states, shared abstractions. Each
meaningful item either gets represented or is intentionally omitted because it's
tiny or not reviewer-visible.

- 3-8 key-change tabs. Fewer than 3 on a large change under-serves; more than 8
  stops being a summary.
- ≤~150 diff lines per tab — summarize or skip-collapse the rest.
- Title ≤70 chars; narrative 1-3 paragraphs.
- A UI-heavy change needs more than one before/after pair: show the entry
  point, the changed interaction surface, and the resulting state. Permission
  changes need the role variants (what admins see vs. what viewers see).

## Before/after is the headline

The recap's center of gravity is comparison:

- **UI** → paired wireframes in the `ba-grid` (labels live in the column
  headers, never inside the frame). The grid auto-stacks wide surfaces
  (`browser`, `desktop`) and puts narrow ones (`mobile`, `popover`, `panel`)
  side by side.
- **Schema / API** → a single card showing the AFTER shape with per-field
  change badges and `was` values usually beats two full side-by-side tables;
  use two cards only when the whole contract was replaced.
- **Code** → split diffs. Split is the default because before/after legibility
  is the point; use a unified single column only for a genuinely narrow hunk.
- **Architecture** → two `diagram-panel`s, Before and After.

## Deliverable and delivery

1. Copy the template to a working file — never edit the template in place:
   `recaps/<slug>.html` in the repo (gitignored or committed, follow the
   project's lead) or the session scratchpad for throwaway recaps.
2. Fill the sections per the skeleton above. All colors through the `--wf-*`
   tokens — never hard-code hex in content, or the dark theme breaks.
3. Deliver:
   - **Artifact tool available** → publish as an Artifact (it is
     default-private; strip the outer `<!doctype>`/`<html>`/`<head>`/`<body>`
     skeleton and keep the `<style>`, content, and `<script>` — the Artifact
     harness provides the document shell).
   - **Otherwise** → `open recaps/<slug>.html` (macOS) and report the absolute
     path.
4. Sanity-check the render before reporting it done: open it, look at it, in
   both themes if you changed any color usage. Overlapping labels or a crushed
   diff column means fixing the HTML, not shipping it.

The recap page is the deliverable — never paste the recap inline into chat as a
wall of markdown; inline summaries are the thing a recap replaces. A 2-3
sentence handoff plus the link/path is the right chat footprint.

## Security

- **A recap is as sensitive as the source it summarizes.** It can expose
  unreleased schema, internal endpoints, and architecture. Keep it local or
  default-private (Artifacts are private by default); never publish a recap of
  a private repo anywhere public.
- **Never transcribe secrets.** Diffs can contain API keys, tokens, webhook
  URLs, `.env` values. Redact them in every block, caption, and annotation
  (`sk-•••`, `<redacted>`) — the recap must be safe to share with anyone who
  may review the code.

## Review loop

After the reviewer reads the recap, feedback arrives in chat or PR comments.
Revise the same recap file in place so it still covers the whole work unit plus
the correction — don't replace a broad recap with a narrow recap of only the
latest feedback. Pair with `bunx critique --web --open` when the reviewer wants
to drop from the recap into the full raw diff.
