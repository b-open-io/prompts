---
name: visual-coordinator
description: This skill should be used when the user asks to "design the workflow visually", "show me the workflow before running it", "let me configure the agents first", "visual workflow builder", "which models for which steps", "let me pick the models", "plan this fan-out", "diagram the orchestration", or wants to review and adjust a multi-agent job — models, agents, phases, isolation — before it runs. Renders an editable flow-chart artifact and emits a paste-back spec that launches the exact configuration chosen. Builds on the coordinator skill; use coordinator alone when no visual review is wanted.
version: 0.1.2
---

# Visual Coordinator

Turn a large multi-agent job into an editable diagram **before** it runs, then
emit a spec that launches exactly what the user approved.

The artifact is a design surface, not a monitor. It is opened while planning,
adjusted by the user, and produces text they paste back. Progress monitoring
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

This is the judgement the artifact exists to expose, and it is where a canvas
goes wrong first. Read
[references/decomposition.md](references/decomposition.md) before drawing:
finding the repeating unit, telling a phase from a node, when a barrier is
genuinely required, sizing, where isolation is actually needed, and what makes a
verification gate worth having.

Where a decomposition is genuinely uncertain, draw the most defensible one and
let the user edit it. That is what the canvas is for.

### 3. Build the artifact

Load `Skill(artifact-design)` for craft, then compose the page. Required
elements:

- **Fixed harness banner** naming the host and stating it cannot be changed here.
- **Flow chart** of phases and nodes, drawn as SVG. Show barriers explicitly:
  a `pipeline` phase lets items advance independently; a `parallel` phase does
  not. Grok has no `pipeline()` — do not offer that mode on a Grok host.
  The distinction changes wall-clock and must be visible, not implied.
- **Per-node controls** — provider, model, effort, and assigned agent. Populate
  every list from the detector output. The runtime's `fieldEnabled()` reports
  which controls a node can carry, and `syncNode()` re-scopes the dependent
  lists when a lane changes; call it rather than redrawing the canvas, which
  drops keyboard focus mid-edit and does not scale past a handful of nodes.
- **Shell-out nodes styled distinctly** from native ones. They are subprocesses,
  and the visual language should say so.
- **Roster palette** with agent avatars, names, and one-line roles, assignable to
  nodes. Embed avatars as data URIs; the artifact CSP blocks external images.
- **Concurrency and isolation dials**, bounded by the host's real caps.
- **Verification gate field** — the command that proves the work.
- **Copy button** emitting the paste-back spec.

### 4. Emit the spec

Follow [references/emitted-spec-format.md](references/emitted-spec-format.md).
Emit a human-readable plan and a machine-readable JSON block generated from the
same canvas state, so they cannot disagree.

When the user configured something the host cannot do, omit it and say so under
the plan. Never leave an impossible setting looking configured.

### 5. Execute what came back

On receiving a pasted spec, translate it for the host — Claude Code maps onto a
JavaScript workflow script; Grok maps onto a Rhai workflow (`Skill(create-workflow)`,
native `agent_type` + `model`, Sol/Claude nodes as Codex/Claude shell-outs);
Codex becomes an ordered series of `codex exec` dispatches the caller sequences.
Then run it under the ordinary `coordinator` rules: specs before dispatch,
review diffs adversarially, re-run acceptance outside the worker's sandbox, and
keep every git operation in the main session. Smoke-check a Grok script with
`validate_only: true` before a real run.

## Avatars

Agent avatars come from `bopen-ai/public/images/agents/<slug>.png`, where the
slug is `display_name` lowercased with non-alphanumerics replaced by `-`.
Downscale to about 96px and inline as data URIs. Where an avatar is missing, use
the agent's initials in a coloured circle rather than shipping a faceless card.

## Additional Resources

### Reference Files

- **`references/harness-capabilities.md`** — what Claude Code, Codex, and Grok
  each genuinely support: primitives, caps, isolation, resume semantics, model
  identifiers, and the claims the canvas must never make.
- **`references/emitted-spec-format.md`** — the exact shape of the paste-back
  spec, field rules, per-harness translation, and how to refuse an impossible
  configuration.
- **`references/decomposition.md`** — how to choose phases, nodes, barriers,
  sizing, isolation and the gate. Read before drawing, not after.

### Assets

- **`assets/canvas-runtime.js`** — state, per-node control scoping, refusal
  reporting, and spec emission. Design-neutral: inline it and author the visual
  layer freely.

### Scripts

- **`scripts/detect-harness.sh`** — reports host harness (`GROK_AGENT` for
  Grok Build), `native_workflow`, live-child / budget caps, available lanes,
  real model lists per lane, and the deduplicated installed agent roster
  (Claude plugin cache plus `~/.grok/installed-plugins`).

### Related Skills

- `Skill(orchestra:coordinator)` — the dispatch discipline this builds on
- `Skill(orchestra:wave-coordinator)` — sizing large fan-outs into waves
- `Skill(create-workflow)` — Grok Rhai authoring and the host API
- `Skill(artifact-design)` — craft for the artifact itself
