---
name: visual-coordinator
description: This skill should be used when the user asks to "design the workflow visually", "show me the workflow before running it", "let me configure the agents first", "visual workflow builder", "which models for which steps", "let me pick the models", "plan this fan-out", "diagram the orchestration", or wants to review and adjust a multi-agent job — models, agents, phases, isolation — before it runs. Renders an editable graph (nodes, labeled edges, reject-back gates) the user can rewire; staffing is on the selected card. Emits a paste-back spec from the live graph. Builds on the coordinator skill; use coordinator alone when no visual review is wanted.
version: 0.1.9
---

# Visual Coordinator

Turn a large multi-agent job into an **editable graph** before it runs, then
emit a spec that launches exactly what the user approved.

The chart **is** the workflow: nodes, labeled directed edges, gates with
reject-back, optional memory loops. Staffing (lane, model, agent) lives on
the selected card. The user adds, removes, and rewires cards; the chart
redraws from that state. A poster of one example job is not this skill.

The artifact is a design surface, not a monitor. Progress monitoring
belongs to `/workflows` and the host's own UI.

## When to reach for this over plain coordinator

Use `coordinator` when the dispatch plan is obvious and the user wants it run.
Use this skill when the job is large enough that the wrong model on the wrong
step costs real money or time, when several plausible decompositions exist, or
when the user has asked to see or change the plan first.

## The rule that governs every control

**No host `agent().model` slug is a foreign vendor.** Claude workflow
models stay Claude. Codex stays OpenAI-family. Grok 1.0.3 accepts only
`grok-4.6` (use it) and `grok-4.5` (do not offer it) as `agent().model`.
A quoted `[model."gpt-5.6-sol"]` makes `grok --single -m gpt-5.6-sol`
work; that is a Grok-CLI shell-out node, not a native slug. Never render
a dropdown that implies otherwise.

Never render a dropdown implying otherwise. A control offering an impossible
combination is worse than no control, because the user configures around it and
the emitted spec fails at run time. Read
[references/harness-capabilities.md](references/harness-capabilities.md) before
adding any control, and treat it as authoritative over memory.

## Procedure

### 1. Establish the runtime facts

Run the detector rather than assuming anything:

```bash
bash scripts/detect-harness.sh
```

It reports the host harness, which other CLIs are reachable as shell-out lanes,
the models each lane actually offers, and the installed agent roster with
display names. Grok's model list is account-scoped and Codex has no enumeration
command, so both are read from the live environment.

The host harness is a **fact, not a choice** — it is decided by how the session
was invoked. Render it as a fixed banner. Everything else is configurable.

### 2. Choose the decomposition

Read [references/decomposition.md](references/decomposition.md) before
seeding. The output is a **graph**: nodes plus labeled directed edges.
A gate is a node with a pass edge forward and a reject edge back to a
named earlier node. Fan-out is several forward edges from one node.
A barrier is many edges into one node.

Seed the most defensible graph. The user will rewire it on the canvas.

### 3. Build the artifact

Copy [examples/graph-builder.html](examples/graph-builder.html). That file
is the canvas. Do not invent a phase list with dropdowns on each box.

Set `window.VC_ENV` from the detector (harness, models, roster, lanes,
caps). Set `window.VC_SEED` to the graph from step 2 — nodes and edges
for THIS job. Do not leave the untitled Start / Work / Gate template on
a real dispatch.

Required on the page:

- **Fixed harness banner** — the host cannot be changed here.
- **Live graph** — add and remove nodes, drag a mint port to connect, drag
  cards, set an edge to `forward` / `reject` / `memory`. The chart redraws
  from state. A non-host lane is a shell-out card and looks distinct.
- **Inspector** — staffing for the selected card (lane, model, effort,
  agent, owned paths, task, optional JSON schema, gate command, CLI
  override). Empty inspector shows the live spec. Structure is not
  edited here.
- **Isolation, live-children, and cwd dials** — bounded by detector caps.
  Effort lists come from `models.<lane>_effort`. Unavailable lanes stay
  selectable and warn.
- **External boundary fields** — every external node distinguishes its visible
  native controller from the actual provider/model, records disclosure state,
  and names the exact context allowed to cross the boundary.
- **Refusal list** — impossible settings (foreign native model, over-cap
  concurrency, schema on a shell-out, missing CLI) show on the page and
  in Copy spec.
- **Copy button** — emits the live graph (`nodes[]` + `edges[]`), a
  **Nodes** staffing list (display name, model, command), and exact CLI
  for each shell-out node. A Grok native node whose model is not
  `grok-4.6` emits as a shell-out.

### 3b. Deliver the page

A file path in chat is not a page. Follow
[the visual delivery policy](references/visual-delivery.md). It keeps BitPlan's
external-provider and wallet rules narrow and reusable rather than mixing them
with graph construction.

### 4. Emit the spec

Follow [references/emitted-spec-format.md](references/emitted-spec-format.md).
Emit a human-readable plan and a machine-readable JSON block generated from the
same canvas state, so they cannot disagree.

When the user configured something the host cannot do, omit it and say so under
the plan. Never leave an impossible setting looking configured.

### 5. Execute what came back

On receiving a pasted spec, translate it for the host — Claude Code maps onto a
JavaScript workflow script; Grok maps onto a Rhai workflow (bundled
`/create-workflow`, native `agent_type` + `model`, Sol/Claude nodes as
Grok-CLI or Claude-CLI shell-outs);
Codex becomes an ordered series of `codex exec` dispatches the caller sequences.
OpenCode becomes caller-sequenced `opencode run` dispatches and `@agent`
children; it must never fall through to Grok translation.
Before dispatch, read [Coordinator](../coordinator/SKILL.md), its shared
[dispatch contract](../coordinator/references/dispatch-contract.md), exactly
one current-host guide, and only the selected worker guides. Then run it under
those rules: specs before dispatch,
review diffs adversarially, re-run acceptance outside the worker's sandbox, and
keep every git operation in the main session. Smoke-check a Grok script with
`validate_only: true` before a real run.

## Avatars

Agent avatars come from `bopen-ai/public/images/agents/<slug>.png`, where the
slug is `display_name` lowercased with non-alphanumerics replaced by `-`.
Downscale to about 96px and put a data URI on each roster entry as `avatar`.
The template draws that image on the card. Where an avatar is missing, it
draws initials from `display_name` in a coloured circle.

## Additional Resources

### Reference Files

- **`references/harness-capabilities.md`** — what Claude Code, Codex, Grok, and OpenCode
  each genuinely support: primitives, caps, isolation, resume semantics, model
  identifiers, and the claims the canvas must never make.
- **`references/emitted-spec-format.md`** — the exact shape of the paste-back
  spec, field rules, per-harness translation, and how to refuse an impossible
  configuration.
- **`references/decomposition.md`** — how to choose the graph: nodes, edges,
  reject-back, barriers, sizing, isolation. Read before seeding, not after.
- **`references/visual-delivery.md`** — Artifact, BitPlan, wallet, local-file,
  and explicit unencrypted-fallback policy.

### Assets

- **`examples/graph-builder.html`** — the self-contained canvas to copy.
- **`assets/canvas-runtime.js`** — seed/env contract for that canvas.

### Scripts

- **`scripts/detect-harness.sh`** — reports host harness, workflow/capacity,
  available lanes, real model lists, and deduplicated Claude, Grok, Codex, and
  OpenCode roster agents.

### Related Skills

- `Skill(orchestra:coordinator)` — the dispatch discipline this builds on
- `Skill(orchestra:wave-coordinator)` — sizing large fan-outs into waves
- Grok-bundled `create-workflow` (`~/.grok/bundled/skills/create-workflow/SKILL.md`) — not in this plugin. Authors Rhai. Claude and Codex do not have `/create-workflow`
- `Skill(artifact-design)` — craft for the artifact itself
- `Skill(bitplan:bitplan)` / `Skill(bitplan)` — host encrypted HTML through the
  external BitPlan provider on Grok, Codex, or any non-Claude harness
