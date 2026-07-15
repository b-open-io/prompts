---
name: visual-proposal
version: 0.0.1
description: This skill should be used when the user asks to "make a visual proposal", "write this up so I can share it", "present these options visually", "diagram the trade-offs", "turn this plan into something reviewable", or requests a shareable design pitch, architecture proposal, RFC, options comparison, or visual roadmap for work that has not been built. It produces one self-contained, theme-aware HTML page led by grounded diagrams. Use visual-review instead for completed code changes; do not use this skill for internal task tracking.
---

# Visual Proposal

A visual proposal is the forward-looking sibling of a visual recap. A recap
describes a change that was just made; a proposal describes a design, an
options space, or a plan that has NOT been built yet, so a reviewer — often
someone with no prior context, sometimes a friend or an external maintainer —
can understand it, weigh it, and decide. The deliverable is a **single
self-contained, theme-aware HTML page**, published as an Artifact when the
Artifact tool is available (default-private; the user shares it), otherwise
written locally and opened in the browser.

When the optional `artifact-design` skill is installed, load it before writing
the page for additional craft guidance. Do not block when it is unavailable;
apply the self-contained, theme, layout, and accessibility requirements in this
skill directly. This skill governs the *content and stance* of a proposal.

## The two rules that make or break a proposal

### Rule 1 — Present options neutrally. Do not decide for the reviewer.

The single most common failure is editorializing: stamping options
"Recommended" / "Reject" and collapsing a live decision into a foregone
conclusion. **A proposal's job is to arm the reviewer with facts, not to hand
them a verdict.** When the page presents alternatives:

- Give each option the SAME visual weight and the SAME structure — mechanism,
  how it works, what it costs, where it fits, where it doesn't.
- Present **commonalities** (what all options share), **differences** (the axes
  they diverge on), and **challenges** (each option's honest costs and open
  questions) — explicitly, as their own sections.
- An option that "no server implements yet" or "is non-standard" is described by
  that fact, not branded a loser — an implementation gap common to every path is
  not a disqualifier. State the fact; let the reviewer judge its weight.
- **Only include a recommendation if the user explicitly asked for one.** If
  they did, put it in a clearly separated "author's lean" block that names it as
  a lean and an open call — never as a badge on one option that visually pre-empts
  the choice. Default: no recommendation at all.

Stop after writing "the one to reject" or "best option" and replace the verdict
with the underlying evidence. Leave the decision to the reviewer.

### Rule 2 — Diagram over prose. Some things must be shown, not told.

A proposal earns its "visual" name by making the reader *see* the idea. Wherever
a relationship, a structure, or a difference is clearer drawn than written, draw
it. Reach for diagrams (SVG or Canvas, never external images) for:

- **Structure** — how the pieces fit: transaction/output layouts, data trees,
  component graphs, request flows. A labeled box-and-wire diagram beats a
  paragraph describing the same shape.
- **Comparison** — a matrix of options × axes, so the reader scans differences
  at a glance instead of reading three parallel descriptions and holding them in
  their head. Encode state in form (a filled cell, a chip, a check/dash), not
  just words.
- **Before / after** and **flow** — what a thing looks like today vs under the
  proposal; the sequence of steps.
- **The thesis** — the hero should show the most characteristic thing about the
  idea, drawn, before any prose.

Prose then does what prose is good at: intent, nuance, the "why." The test:
if a section is three paragraphs comparing structures, it probably wants to be a
diagram plus one caption.

## Multi-agent advocacy — opposing representatives (optional, for real decisions)

For a proposal whose core is a **key decision between competing options** (or a
series of them), the strongest neutrality comes not from one author trying to be
even-handed, but from **giving each option a genuine advocate**. When the user
asks for this — or when a decision is important enough to warrant it — dispatch
one agent per option from the roster, each assigned to **steelman a different
option**:

- Give every advocate the SAME shared context (the problem, all options, the
  confirmed facts) and ask each for: the strongest case for THEIR option, its
  honest challenges (don't hide them), where it fits best, and a direct rebuttal
  to the other options. Require a structured return so the viewpoints are
  comparable.
- Pick advocates whose expertise or disposition genuinely leans toward the
  option they carry (an efficiency-minded agent for the minimal option, a
  standards-minded one for the standard option, a systems/composability one for
  the general option) — the reasoning styles should differ, not just the labels.
- In the page, present each key decision as a **panel of the N viewpoints**,
  equal visual weight, each attributed to its advocate. The reviewer reads three
  arguing positions per decision and decides — which is exactly the goal.
- This does NOT override Rule 1: add no author verdict. The panel
  is three advocates arguing; the author stays the neutral host. If the user
  later asks who's right, that's a separate ask.

Run the advocates concurrently because they are independent. Ground every
advocate's claims in the same evidence used by the host; an advocate that
invents facts is worse than no advocate.

## The grounding rule

Every claim, number, code shape, and diagram must trace to real research,
real code, or a real spec — never invented. If a fact is unverified, label it
(e.g. "unverified — needs a live check") rather than presenting it as settled.
A proposal that fudges its facts wastes the reviewer's trust and their time.
Pull the substance from the session's actual findings (files read, code cited,
specs quoted); if the substance isn't there yet, gather it before authoring.

## Structure of a proposal page

Adapt to the subject — not every section always applies — but the usual spine:

1. **Hero / thesis** — the one-sentence claim + the most characteristic diagram.
2. **Problem / context** — what's wrong or missing today, concretely.
3. **The approach / principle** — the core idea, and the constraint it respects
   (e.g. "changes X, leaves Y untouched"). Before/after helps here.
4. **The decision(s)** — where options exist, the neutral comparison (Rule 1),
   diagram-led (Rule 2): a matrix, per-option structure diagrams, commonalities,
   differences, challenges.
5. **Architecture** — how it's put together if adopted.
6. **Evidence** — what's confirmed vs open (cite the sources).
7. **Roadmap / plan** — sequenced steps, dependencies. Number only if it's a
   real sequence.
8. **Open questions** — what still needs deciding, each with the trade-off.

## Craft (via artifact-design)

- Self-contained: inline all CSS/JS, embed assets as data URIs, no external
  requests (the Artifact CSP blocks them). Diagrams are SVG/Canvas, not `<img>`.
- Theme-aware: token-level light/dark, `prefers-color-scheme` plus a
  `data-theme` toggle that overrides both ways. **SVG paint via CSS classes or
  `style`, never `fill="var(--x)"` presentation attributes — `var()` does not
  resolve there** and the diagram renders black.
- Type carries it: pair a display and a body/utility face; keep prose near 65ch;
  a subject-true monospace for any code/technical material.
- Ground the palette and vocabulary in the subject's own world.
- Respect `prefers-reduced-motion`; give focus a visible state; no horizontal
  body scroll (wide diagrams/tables get their own `overflow-x: auto`).

## Publish

Write the page to the scratchpad dir, then call the Artifact tool with its path,
a one-line `description`, a stable subject `favicon`, and a version `label`.
Redeploy the SAME file path to keep the URL stable across revisions; only mint a
new URL for a genuinely different proposal. Remind the user it's private until
they share it from the page's share menu.

## Iterating

Proposals get revised as decisions settle. When the user changes an option's
framing, flattens a decision, or adds facts, edit the same file and republish to
the same URL with a bumped `label`. Keep the neutral stance unless the user asks
for a recommendation.
