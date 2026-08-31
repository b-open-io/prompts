---
name: visual-proposal
version: 0.0.14
description: >-
  Produce one self-contained, theme-aware HTML page led by grounded diagrams for work that has
  not been built. Use for "make a visual proposal", "present these options visually", "diagram
  the trade-offs", "turn this plan into something reviewable", or a shareable design pitch, RFC,
  or options comparison. Use visual-review for completed code changes.
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

## The three rules that make or break a proposal

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

Choose the smallest visual that carries the relationship: a flow for sequence,
a tree for hierarchy, a matrix for repeated comparisons, and paired panels for
before/after state. Every node, edge, and label must trace to evidence. Use
diagrams only for information they clarify.

### Rule 3 — Write so a stranger understands it on one read.

The reviewer reads this page once, fast, without your context. A sentence that
needs a second pass costs you the decision. Write every word on the page —
headings, theses, captions, advocate cases, judge verdicts, the CEO's call — in
plain technical English:

- **One idea per sentence**, 25 words maximum. Split; do not join with a
  semicolon.
- **Name the actor, use the active voice.** "The indexer rejects the output",
  not "the output is rejected."
- **One word for one meaning.** Pick one term per thing and repeat it. Never
  swap in a synonym for variety — "output", "UTXO", and "coin" on one page read
  as three different things.
- **Gloss every term and acronym on first use**, in the same sentence.
- **Name a specification before its identifier on first use.** Write
  “BRC-100 Wallet Interface,” not just “BRC-100.” Use the source's real title;
  if it has none, add a short description of its purpose. Link the title when a
  browsable source exists.
- **Outcome first**, reason second.
- **Numbers, not adjectives.** "Adds one 34-byte output", not "adds minimal
  overhead". An adjective is an opinion; a number is a fact the reviewer can
  check. Never argue by adjective — "elegant", "clean", and "robust" carry no
  information.
- **No idioms, no metaphors, no filler.** Cut "just", "simply", "it's worth
  noting", "at the end of the day", "leverage", "seamless". A metaphor makes the
  reader guess at a mechanism; give the mechanism.

> Before: "While this approach is arguably more elegant, it's worth noting that
> adoption remains something of an open question."
> After: "No indexer parses this format today. Two indexers need a change before
> the format works in production."

`Skill(core:humanize)` strips AI writing tics; this rule sets the target the
prose must hit. Do both. The full specification, the rewrite gallery, the
per-role word budgets, and the drop-in agent brief live in
[references/plain-language.md](references/plain-language.md) — read it before
you dispatch any agent or write any page copy.

### Every decision becomes a complete questionnaire

Inventory every unresolved choice that changes scope, architecture, behavior,
rollout, risk, or follow-up work. Give each one a selectable question in **Your
call**. Do not leave a blocking choice only in prose or under Open questions.

Each option explains, in 2–4 short sentences:

1. what changes if the reviewer chooses it;
2. what it enables;
3. its cost or risk; and
4. whether it is reversible and what follow-up it creates.

Give enough detail for the reviewer to predict the consequence without a
follow-up. Stop before restating the implementation. If a question is
informational and requires no choice, label it that way. The questionnaire must
include every real decision and emit every answer through the copy-response
control in
[references/interactive-choices.md](references/interactive-choices.md).

### The opening states the problem, not the process

The hero and the first section make the reviewer understand what is broken and
what their decision changes. They do not describe the document or how it was
made. Cut these from the opening:

- how the page was produced ("four advocates argued each option, and a bench
  then ruled") — the panel sections show that themselves;
- what the page contains ("this proposal presents three options and compares
  them") — the reviewer can see the sections;
- scope caveats, method notes, and reading instructions.

Open in this order: the root problem in one sentence, naming who it hurts; what
it costs today, with a number or a concrete failure; the decision the reviewer
must make; what goes wrong if they choose wrong. Then the hero diagram.
Provenance — who argued, who judged, when — goes in a small line under the title
or a method note at the foot of the page.

The test: delete every opening sentence that would still be true if the subject
were a completely different proposal. What survives is the real problem
statement.

## Multi-agent advocacy — opposing representatives (the DEFAULT for real decisions)

When a proposal's core is a **key decision between competing options** (or a
series of them), a panel of advocates is the **default treatment, not an
add-on** — do it automatically, without being asked. The strongest neutrality
comes not from one author trying to be even-handed, but from **giving each
option a genuine advocate from the real bOpen roster**, each shown with their
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

The advocates and judges are **real named agents from the bOpen roster**, not
invented personas — that credibility is the whole point. Two steps:

1. **Pick the agents.** `Agent(core:front-desk)` returns the team and who
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

### The standard flow: advocates → cross-examination → judging bench → the CEO's final call

For a real decision, run **all four stages by default** — advocacy,
cross-examination, a judging bench, AND the CEO's final call. This is the shape
that makes a proposal decision-useful rather than a bare list, and it is what
this skill is *for*. Do NOT treat the bench or the CEO as an opt-in the user must
request; running advocates but no judges is the most common way this skill
under-delivers.

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

### The CEO's final call (runs LAST, after everything else)

After every advocate and every judge has weighed in, **Chief — the CEO
(`Agent(paperclip:ceo)`) — comes in and makes the final call.** He is the last
stage, never run until the rest is complete. He is like one more judge, but a
decisive one: he weighs the whole thing holistically for the **business and the
user**, not the tech alone — the true cost of technical debt (priced as
interest), scope creep, reversibility, and whether the change actually serves the
user. Give him the FULL record: the problem, the options, the confirmed facts,
every advocate's case and rebuttal, and every judge's verdict and flip-condition.

Unlike the neutral judges, the CEO **does decide** — that is his role, and it
does not break Rule 1 because it is an attributed agent's recommendation from the
business's vantage, not the author editorializing, and the human still overrides.
Present his call as a distinct **final section** with his avatar, name, and role:
his decision stated plainly, one or two sentences of business/user reasoning, and
**the single thing that would change his mind.** The reviewer's Agree /
Agree-with-caveats / Disagree control on this call is the required CEO selector in
the interactive choices (below).

**Show the agents — avatar, name, role.** When advocates or judges appear, give
each a real identity: their avatar, name, and one-line role on the card that
carries their argument or verdict. It makes the page feel authored by the panel
rather than narrated about them, and it lets the reviewer track a voice across
the page. For a fact that several agents independently verified (e.g. all
advocates confirmed it against the code), attribute it visually — cluster those
agents' avatars on that fact's card (straddling its top edge reads as a group
sign-off) instead of writing "everyone agreed." An avatar cluster conveys
consensus and who-verified at a glance.

### Brief every voice on the register

Advocates, judges, and the CEO write the words that land on the page, so set the
register at dispatch instead of repairing it afterwards. **Paste the dispatch
brief from [references/plain-language.md](references/plain-language.md) into
every advocate, judge, and CEO prompt**, and hold each one to the return shape
and word budget in that file: an advocate returns a 25-word thesis, three
mechanism-bearing claims, honest challenges, and a one-sentence rebuttal per
rival; a judge returns a lens, a winner, a testable deciding factor, and a
flip-condition naming a fact somebody can go check; the CEO returns a
one-sentence decision, three sentences of business reasoning, and the one thing
that reverses the call. Budgets keep the cards readable side by side, and a
fixed shape makes the viewpoints comparable.

Ask each agent to run `Skill(core:humanize)` on its prose before returning it.
Then run `Skill(core:humanize)` over the assembled page yourself, so the theses,
verdicts, captions, and the CEO's decision read in one voice.

## The grounding rule

Every claim, number, code shape, and diagram must trace to real research,
real code, or a real spec — never invented. If a fact is unverified, label it
(e.g. "unverified — needs a live check") rather than presenting it as settled.
A proposal that fudges its facts wastes the reviewer's trust and their time.
Pull the substance from the session's actual findings (files read, code cited,
specs quoted); if the substance isn't there yet, gather it before authoring.
When citing a specification, use its title with its identifier and link the
source. A bare number assumes context the reviewer may not have.

## Structure of a proposal page

Adapt to the subject — not every section always applies — but the usual spine:

1. **Hero / thesis** — the root problem in one sentence, naming who it hurts,
   then the most characteristic diagram. No process narration, no description of
   the page itself (see "The opening states the problem, not the process").
2. **Problem / context** — what breaks today, concretely: the failure, its cost
   with a number, and the decision that follows from it.
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
   differences, challenges. This is where the **advocate panel**, **judging
   bench**, and **CEO's final call** live (the standard flow above).
6. **Architecture** — how it's put together if adopted.
7. **Evidence** — what's confirmed vs open (cite the sources).
8. **Roadmap / plan** — sequenced steps, dependencies. Number only if it's a
   real sequence.
9. **Open questions** — what still needs deciding, each with the trade-off.
10. **Your call** — selectable option cards for every decision + a copy-response
    button, so the reviewer answers in-page and pastes a clean, versioned reply
    back to the agent. Each option states its outcome, benefit, cost or risk,
    reversibility, and follow-up. Always includes the Agree /
    Agree-with-caveats / Disagree control on the CEO's final call. See
    [references/interactive-choices.md](references/interactive-choices.md) for the
    drop-in component (CSS + markup + copy script).
11. **Archive menu** — a left list of other proposals already on disk. Copy
    [examples/archive-nav.html](examples/archive-nav.html). Fill `window.VP_ARCHIVE`
    from `scripts/list-proposals.sh`. Local rows copy agent instructions.
    PostPlan rows (`data-vp-url` https) are real links. See
    [references/archive-nav.md](references/archive-nav.md).

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

Before you publish, read the assembled page top to bottom against the
read-through check in
[references/plain-language.md](references/plain-language.md). It catches the two
failures that make a proposal hard to review: an opening that talks about the
document instead of the problem, and sentences that carry two ideas, hide their
actor, or argue with an adjective. Fix what fails, then publish.

Save the page at `docs/proposals/<slug>.html` in the project. Keep that slug
stable across revisions of the same proposal. Then list every proposal this
session can see and inline the archive menu:

```bash
bash scripts/list-proposals.sh --current <slug> [extra-workspace-root ...]
```

Pass Claude `--add-dir` folders, extra Grok/Codex workspace roots, or
`BOPEN_PROPOSAL_ROOTS`. Paste the JSON into `window.VP_ARCHIVE`. Copy
[examples/archive-nav.html](examples/archive-nav.html) into a `.vp-shell`
wrapper. The browser cannot scan the disk. An Artifact also cannot open a
sibling file. Local rows are copy buttons: they copy instructions that
ask the agent to open that path. See
[references/archive-nav.md](references/archive-nav.md).

Choose the delivery surface deliberately:

- **Artifact** — use for a quick, default-private page inside a host that
  supports Artifacts.
- **BitPlan** — use when the user wants an encrypted, wallet-controlled,
  durable, versioned HTML plan. Explain the consequences and get explicit
  approval immediately before `npx bitplan upload
  docs/proposals/<slug>.html --json`: ciphertext is public on Bitcoin, only the
  configured wallet readers can decrypt it, and access to an older shared
  version cannot be revoked. A wallet that supports the BRC-100 Wallet
  Interface keeps the keys and approves the operation. Never request a mnemonic
  or private key. See
  [BitPlan agents and wallets](https://bitplan.dev/docs/agents).
- **PostPlan** — use when a capability link is sufficient and BitPlan's
  wallet-controlled permanence is not wanted.
- **Local file** — use when the page should not leave the machine.

For an Artifact, use the same file path, a one-line `description`, a stable
subject `favicon`, and a version `label`. For PostPlan, follow
`Skill(postplan)`. After PostPlan returns an `https://` URL, stamp it on the
saved file as
`data-vp-url="https://…"`, re-run `list-proposals.sh`, and replace
`window.VP_ARCHIVE` so the menu can link that row. Redeploy the SAME file
path to keep the URL stable across revisions; only mint a new URL for a
genuinely different proposal. Remind the user it's private until they
share it from the page's share menu.

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
