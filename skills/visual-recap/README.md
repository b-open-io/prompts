# visual-recap

Turn a PR, branch, commit, or working-tree diff into a **visual recap**: a
single self-contained, theme-aware HTML page a reviewer reads before the raw
diff — before/after UI wireframes, schema/API contract summaries with change
flags, a file footprint map, and 3-8 tabs of annotated key-change diffs.

Heavily inspired by [BuilderIO's visual-recap](https://github.com/BuilderIO/skills#visual-recap),
adapted for bopen-tools: no hosted plan service or MCP connector — the
deliverable is one offline HTML file built from `assets/template.html`, opened
locally or published as a default-private Artifact.

## Why

Raw diffs hide the shape of a change. Reviewers of a 25-file PR need to know
what UI moved, which contracts changed, and where the risky lines are *before*
line-by-line review. The recap is that map; the raw diff (via the `critique`
skill) is the territory.

## Usage

```
/visual-recap                      # recap the current branch vs main
recap this PR                      # via gh pr diff
show me what this branch changed
```

Used by the code-review agents (`code-auditor`, `architecture-reviewer`) as the
opening artifact of large reviews.

## Structure

- `SKILL.md` — workflow, grounding rule, canonical skeleton, budgets
- `assets/template.html` — self-contained recap page (tokens, tabs, split
  diffs, wireframe frames, diagram panels) — copy, never edit in place
- `references/wireframe.md` — quality bar for wireframes; read before authoring
  any

## Ground rules (short version)

- Structured sections are built mechanically from the real diff — never
  invented. Prose is the only place the model writes freely.
- UI changes get before/after wireframes; schema/API changes get change-flagged
  contract cards; key files get annotated split diffs in tabs.
- Skip the recap for small diffs — they review faster as a plain diff.
- Redact secrets; treat the recap as being as sensitive as the source.
