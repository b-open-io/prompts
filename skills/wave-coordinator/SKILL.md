---
name: wave-coordinator
version: 1.0.3
description: >-
  This skill should be used in Claude Code or Codex when dispatching more agents
  than the host can run concurrently, when context budget management is needed,
  or when generating multiple variations of the same output. Coordinates native
  Claude agents, Codex custom or built-in subagents, and mixed worker lanes with
  wave sizing, context budget tracking, and directive diversity. Use when the
  user says "fan out", "generate variations", "batch agents", "wave dispatch",
  or asks for large-scale subagent work.
---

# Wave Coordinator

Manage large-scale subagent dispatch through structured waves. Prevent context
exhaustion, preserve output diversity, and avoid duplication across batches.
On Claude, this can compose with
`Skill(superpowers:dispatching-parallel-agents)`; on Codex, use the native
subagent runtime. Wave Coordinator owns batching and diversity while the host
runtime owns thread creation.

## Prefer Native Workflows on Claude Code

Claude Code ships a native `Workflow` tool that solves this skill's core
problems structurally: `pipeline()` runs items through stages with no wave
barriers, concurrency clamps to min(16, cores-2) with automatic queueing,
results collect as structured returns, and `/workflows` shows live progress
with resume support. When the session has the Workflow tool AND the user
explicitly asked for the fan-out (which is normally why this skill fired),
write the dispatch as a workflow script instead of hand-managed waves —
diversity directives go into the per-item `agent()` prompts and dedup runs as
plain code between stages. This is framework-dependent: no other runtime has
an equivalent, so on Codex or any non-Claude host the wave protocols below
remain the way. Gating and API details:
`../coordinator/references/native-workflows.md`.

## The Core Problem

Dispatching 10+ agents at once causes three failures:
1. **Context exhaustion** — spawning agents is expensive; running out mid-batch leaves work incomplete
2. **Homogeneous output** — identical prompts produce near-identical results, wasting compute
3. **Duplication** — later waves repeat what earlier waves already produced

Wave coordination solves all three.

## Wave Sizing Rule

Use five concurrent subagents as a conservative planning default, then clamp
the wave to the host's advertised concurrency limit, currently free thread
slots, task shape, and remaining context/token budget. Codex defaults to
`agents.max_threads = 6` when unset, but that is a cap on open threads, not a
promise that all six slots are free. If N exceeds the effective limit, divide
the work into sequential waves:

```
N=12 → Wave 1 (5) → Wave 2 (5) → Wave 3 (2)
N=7  → Wave 1 (5) → Wave 2 (2)
N=5  → Wave 1 (5) — single wave, no split needed
```

Each wave completes fully before the next launches. Do not launch wave 2 until
all wave 1 agents have returned results.

Compute the effective wave size as the minimum of:

1. Five, unless the user or host deliberately chooses another wave size.
2. The host-advertised concurrency cap.
3. The number of currently free agent slots.
4. The number of genuinely independent remaining units.
5. The size the remaining context and token budget can safely synthesize.

Never assume a configured maximum means those slots are all available.

## Context Budget Check

Before launching each wave, estimate context budget:

1. Count tokens consumed so far (rough estimate: each spawned agent costs ~2-4k tokens in overhead)
2. Reserve at minimum 20% of the context window for synthesis and final output
3. If budget is tight, reduce the next wave size to 2-3 agents
4. If budget is critically low, stop dispatching and synthesize from what you have

**Hard rule:** Never launch a wave if you estimate it will hit the context limit before completion. Stop early and synthesize. Incomplete partial output is better than a context overflow crash.

## Directive Diversity

Each agent in a wave must receive **unique creative direction**. Do not send the same prompt to all agents in a wave.

### How to generate diverse directives

Before dispatching, generate N distinct emphasis angles for N agents. Vary along at least one axis:

| Axis | Example variations |
|------|--------------------|
| Tone | formal / conversational / terse / expansive |
| Focus | conciseness / error handling / edge cases / performance / examples |
| Perspective | beginner / expert / skeptic / advocate |
| Structure | prose / bullet list / table / code-first |
| Constraint | max 200 words / no jargon / no code / examples only |

**Example:** Generating 5 skill variants

```
Agent 1: "Write the most concise version possible. No examples, pure principle."
Agent 2: "Lead with 3 concrete examples, then derive the rule."
Agent 3: "Focus entirely on error cases and what can go wrong."
Agent 4: "Write for someone encountering this concept for the first time."
Agent 5: "Assume expert audience. Skip fundamentals, go deep on edge cases."
```

Never assign the same emphasis to two agents in the same wave.

## Deduplication Check

Before launching each wave after the first:

1. Read the output produced by all prior waves
2. Identify themes, approaches, or content already covered
3. Add exclusion instructions to the new wave's directives: "Do NOT produce a version similar to [description of prior output]"
4. If a prior wave already produced a high-quality result for a particular angle, skip that angle in subsequent waves

## Wave Progress Tracking

Maintain a mental (or written) wave ledger before each dispatch:

```
Wave 1: [5 agents] — launched, awaiting results
Wave 2: [5 agents] — pending (blocked on wave 1)
Wave 3: [2 agents] — pending (blocked on wave 2)

Output so far: [list of completed items]
Remaining: [list of items not yet produced]
```

Update the ledger after each wave completes. This prevents re-dispatching work already done and helps identify what the final synthesis pass needs.

## Host Dispatch Adapters

### Claude Code

Use `Skill(superpowers:dispatching-parallel-agents)` when installed. Otherwise
use Claude Code's native Agent tool and plugin-qualified agent IDs. Preserve one
self-contained assignment per agent.

### Codex

Use Codex native subagents. Prefer installed `bopen_*` custom agents for named
specialists and built-in `worker` or `explorer` agents when no matching custom
adapter exists. Do not claim a `bopen_*` persona was used unless that adapter is
actually installed and its thread was spawned.

Codex defaults to `agents.max_threads = 6` and `agents.max_depth = 1` when the
user leaves them unset. Depth 1 lets the main thread spawn direct children but
prevents those children from recursively spawning their own agents. Keep wave
coordination in the main thread under that default. If a workflow genuinely
requires nested delegation, explain the token and runaway-fan-out risk before
the user raises `agents.max_depth`; never change global Codex configuration as
part of this skill.

Use `/agent` or the available agent activity view to inspect active and
completed threads. Account for already-open threads when calculating the next
wave.

## Integration with superpowers

Wave-coordinator handles **what** to dispatch and **when**. `Skill(superpowers:dispatching-parallel-agents)` handles **how** to spawn subagents. Use them together:

1. Use this skill to plan wave sizes, generate diverse directives, and track progress
2. Use `Skill(superpowers:dispatching-parallel-agents)` for the actual subagent spawning call syntax

If the superpowers plugin is not installed, use the current host's native
subagent runtime instead. Do not silently degrade: state whether the wave uses
Claude agents, Codex custom/built-in agents, or another explicitly authorized
worker lane.

## Worked Example

**Task:** Generate 8 variations of a landing page headline.

**Wave plan:**

Wave 1 (5 agents):
- Agent A: Urgency angle ("Limited time, immediate benefit")
- Agent B: Social proof angle ("Join 10,000+ users who...")
- Agent C: Problem-first angle ("Tired of X? Meet Y.")
- Agent D: Benefit-first angle ("Do X in half the time.")
- Agent E: Curiosity angle ("The surprising way to X")

Collect wave 1 output. Review for quality and coverage.

Wave 2 (3 agents — note: reduced from 5 because only 3 remain):
- Check wave 1 output first
- Agent F: Contrast angle not yet covered
- Agent G: Minimalist / single-word-impact angle
- Agent H: Question format not yet tried

Synthesize all 8 results. Rank by quality. Present top 3 with rationale.

## Key Rules

- Five agents per wave is the conservative planning default; clamp it to the host cap and currently free slots
- Codex's default six-thread cap includes already-open threads; it is not a six-new-agent allowance
- Keep orchestration at the main thread when Codex `max_depth` remains at its safe default of 1
- Check context budget before each wave
- Unique directive per agent — never duplicate prompts within a wave
- Read prior output before launching the next wave
- Stop and synthesize if budget runs low — do not push through to completion at the cost of a crash
- Wave 2+ directives must explicitly exclude angles already covered in prior waves
