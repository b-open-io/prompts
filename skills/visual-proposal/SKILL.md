---
name: visual-proposal
version: 0.0.9
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
- **Only include an _author's_ recommendation if the user explicitly asked for
  one.** If they did, put it in a clearly separated "author's lean" block that
  names it as a lean and an open call — never as a badge on one option that
  visually pre-empts the choice. Default: no author recommendation at all. (This
  governs the *author's own* verdict. A **judging bench** — a panel of named,
  attributed, usually-split verdicts with flip-conditions — is a different thing
  and is part of the default flow for a real decision; see the judging bench
  section below.)

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

## Multi-agent advocacy — opposing representatives (the DEFAULT for real decisions)

When a proposal's core is a **key decision between competing options** (or a
series of them), a panel of advocates is the **default treatment, not an
add-on** — do it automatically, without being asked. The strongest neutrality
comes not from one author trying to be even-handed, but from **giving each
option a genuine advocate from the real bОpen roster**, each shown with their
avatar, name, and role. Skip the panel only for a page with **no real decision**
(a pure explainer, status update, or single-approach pitch), or when the user
explicitly asks for a plain writeup. Otherwise: dispatch one real roster agent
per option (see "Casting the panel" below), each assigned to **steelman a
different option**:

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
- This does NOT override Rule 1: add no *author* verdict. The panel is the
  advocates arguing; the author stays the neutral host. The judging bench
  (below) then rules by default — a panel of attributed, usually-split judges,
  which is not the author deciding.

Run the advocates concurrently because they are independent. Ground every
advocate's claims in the same evidence used by the host; an advocate that
invents facts is worse than no advocate.

### Casting the panel — real agents and their avatars

The advocates and judges are **real named agents from the bОpen roster**, not
invented personas — that credibility is the whole point. Two steps:

1. **Pick the agents.** `Agent(bopen-tools:front-desk)` returns the team and who
   fits what, or read the `agents/*.md` files (each has a `display_name` and a
   `role`). Match each option to an agent whose real expertise leans that way (a
   code-auditor for correctness, an optimizer for efficiency, a standards/interop
   agent, a domain specialist). Advocates and judges must be distinct agents.
2. **Embed their avatars with the bundled script.** The Artifact CSP blocks
   external `<img src>`, so avatars must be inlined as data URIs — this skill's
   `scripts/embed-avatars.sh` automates it (fetch → downscale → emit a
   `window.AV` map). Slug = `display_name` lowercased with non-alphanumerics → `-`
   ("Uno Satoj" → `uno-satoj`):

   ```bash
   bash scripts/embed-avatars.sh uno-satoj torque maxim
   ```

   Paste the printed `<script>` block into the page and give each panelist an
   `<img data-a="uno-satoj">`; the block wires every `src` on load. Show the
   **avatar + name + one-line role** on each card. If the script warns a slug has
   no avatar, use that agent's initials in a colored circle — never ship a
   faceless panel.

### A premise-challenging voice

The advocates above argue *among* the presented options. Often the most valuable
viewpoint disputes the framing itself — the whole option space rests on an
assumption worth questioning ("this doesn't need to be a collection at all — mint
a fungible token"; "don't build this, buy it"; "the real fork is upstream of these
three"). Give such a voice a card too, on equal footing. But then make one call,
and make it honestly:

- **If the voice only questions the framing** (no concrete, buildable
  alternative), keep it as a marked premise-challenge: it argues a different
  axis, so it is not scored against the option advocates and the bench does not
  rule on it. Fold what it surfaces into the open questions as an **upstream
  decision** the reviewer settles first.
- **If the voice proposes a concrete, buildable alternative** (a real fourth
  option — "mint a BSV-21 token instead"), it is NOT a sidebar. Promote it to a
  **first-class option**: full cross-examination (the other advocates attack it
  by name, it attacks each of them), and the judging bench **re-runs to include
  it**. Sidelining a real competing option as "just a premise-challenge" is the
  most common way this skill under-serves a live decision — if it can be built
  and compared, it gets argued and judged like everything else.

The tell is buildability: a different *axis* can still be a real option. When it
is, verify its feasibility with the same grounding rigor as every other option
(read the actual code/spec — see the grounding rule) before letting an advocate
champion it, so the fourth card is as evidence-backed as the first three.

### The standard flow: advocates → cross-examination → judging bench

For a real decision, run **all three by default** — advocacy, cross-examination,
AND a judging bench. This is the shape that makes a proposal decision-useful
rather than a bare list, and it is what this skill is *for*. Do NOT treat the
bench as an opt-in the user must request; running advocates but no judges is the
most common way this skill under-delivers.

- **Cross-examination (default).** Each advocate argues for their option AND
  against each opponent by name — the sharpest, most specific weakness of each
  rival relative to their own. The page then shows, per option, both the case for
  it and how its rivals attack it, so the reviewer sees the collisions, not three
  monologues.
- **The judging bench (default).** After the advocates, dispatch a separate set
  of agents — **distinct from every advocate** — as judges. **This runs by
  default and does not violate Rule 1**, because a bench is a panel of
  *attributed, usually-split* verdicts with flip-conditions, not the author
  handing down one foregone conclusion. Give each judge the full record: the
  problem, options, confirmed facts, and all advocates' cases and rebuttals.
  Assign a distinct evaluative lens (e.g. correctness/robustness,
  efficiency/simplicity, ecosystem adoption/interop). Each judge names their
  lens, picks a winner and runner-up, states the deciding factor, and — the most
  decision-useful part — the single condition that would FLIP their verdict
  ("would flip if …"). Those flip-conditions are the real tiebreakers, so keep
  them: they tell the reviewer exactly which fact to go check. Present the
  verdicts in a clearly separated judgment section — a tally, each judge's
  one-line rationale, and their flip-condition. Keep verdict badges OFF the
  neutral option cards.

Skip the bench only when there is genuinely no decision to resolve (a pure
explainer or status page), or the user explicitly asks for options-only with no
assessment. Fix the judging lenses and evaluation rubric before showing judges
the advocacy record. Present every judge's verdict, including dissent; never
collapse a tally into objective truth. This stays within Rule 1 because the
*author* adds no verdict of their own — the split, attributed bench does, and
the human reviewer still makes the final call.

**Show the agents — avatar, name, role.** When advocates or judges appear, give
each a real identity: their avatar, name, and one-line role on the card that
carries their argument or verdict. It makes the page feel authored by the panel
rather than narrated about them, and it lets the reviewer track a voice across
the page. For a fact that several agents independently verified (e.g. all
advocates confirmed it against the code), attribute it visually — cluster those
agents' avatars on that fact's card (straddling its top edge reads as a group
sign-off) instead of writing "everyone agreed." An avatar cluster conveys
consensus and who-verified at a glance.

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
3. **Landscape / what already exists** — an inventory of the relevant specs,
   code, and tools that exist today, where each lives (repo/file/URL), and a
   status chip on each (shipped, draft, branch, live, legacy, frontend-only).
   Frame it explicitly as orientation, NOT a judging input — options are judged
   on their merits, not on what happens to be built already. Include it whenever
   a proposal touches an existing system; it grounds a reviewer (and an external
   maintainer) fast and prevents "wait, does this already exist?" confusion.
   **Make every reference in this section a clickable link** — to the repo, file,
   PR, or doc page — so the reviewer clicks straight through to the real thing.
4. **The approach / principle** — the core idea, and the constraint it respects
   (e.g. "changes X, leaves Y untouched"). Before/after helps here.
5. **The decision(s)** — where options exist, the neutral comparison (Rule 1),
   diagram-led (Rule 2): a matrix, per-option structure diagrams, commonalities,
   differences, challenges.
6. **Architecture** — how it's put together if adopted.
7. **Evidence** — what's confirmed vs open (cite the sources).
8. **Roadmap / plan** — sequenced steps, dependencies. Number only if it's a
   real sequence.
9. **Open questions** — what still needs deciding, each with the trade-off.

## Craft (via artifact-design)

- Self-contained: inline all CSS/JS, embed assets as data URIs, no external
  requests (the Artifact CSP blocks them). Diagrams are SVG/Canvas, not `<img>`.
- Link out to browsable sources: whenever the page names something with a URL —
  a repo, file, PR, issue, doc page, deployed app — make it a clickable
  `<a target="_blank" rel="noreferrer">` so the reviewer clicks straight through
  to the real thing. The CSP blocks *embedding* external resources, not `<a>`
  *navigation*, so outbound links open fine. Don't leave a repo/file path as
  dead text when it could be a link.
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

When the user **reframes the decision itself** — not just picks a winner, but
changes which options are in play or the principle that separates them — re-run
the advocacy, don't just rewrite prose. Re-brief the advocates on the new
decision points and let them re-propose (with fresh cross-examination), then
**re-fire the judging bench** on the new points of contention. A reframe can
turn a split verdict into a unanimous one (or the reverse); a proposal that only
edits its conclusion text after a reframe is stale under the hood. Ground the
re-run with the same rigor as the first: verify the new facts against real code
or spec before an advocate argues them. Mark the prior round as superseded
rather than deleting it — the progression (round 1 → reframe → round 2) is itself
useful to the reviewer.
