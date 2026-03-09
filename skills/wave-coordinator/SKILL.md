---
name: wave-coordinator
version: 1.0.0
description: "This skill should be used when dispatching more than 5 parallel agents, when context budget management is needed, or when generating multiple variations of the same output. Complements superpowers dispatching-parallel-agents with wave sizing, context budget tracking, and directive diversity. Use when the user says 'fan out', 'generate variations', 'batch agents', 'wave dispatch', or when spawning large numbers of subagents."
---

# Wave Coordinator

Manage large-scale subagent dispatch through structured waves. Prevents context exhaustion, ensures output diversity, and avoids duplication across batches. Works alongside `Skill(superpowers:dispatching-parallel-agents)` — wave-coordinator handles batching and diversity, dispatching-parallel-agents handles the actual subagent spawning mechanics.

## The Core Problem

Dispatching 10+ agents at once causes three failures:
1. **Context exhaustion** — spawning agents is expensive; running out mid-batch leaves work incomplete
2. **Homogeneous output** — identical prompts produce near-identical results, wasting compute
3. **Duplication** — later waves repeat what earlier waves already produced

Wave coordination solves all three.

## Wave Sizing Rule

**Maximum 5 concurrent subagents per wave.** If N > 5, divide into sequential waves:

```
N=12 → Wave 1 (5) → Wave 2 (5) → Wave 3 (2)
N=7  → Wave 1 (5) → Wave 2 (2)
N=5  → Wave 1 (5) — single wave, no split needed
```

Each wave completes fully before the next launches. Do not launch wave 2 until all wave 1 agents have returned results.

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

## Integration with superpowers

Wave-coordinator handles **what** to dispatch and **when**. `Skill(superpowers:dispatching-parallel-agents)` handles **how** to spawn subagents. Use them together:

1. Use this skill to plan wave sizes, generate diverse directives, and track progress
2. Use `Skill(superpowers:dispatching-parallel-agents)` for the actual subagent spawning call syntax

If the superpowers plugin is not installed, use Claude Code's native `Task` tool for subagent spawning instead. Do not silently degrade — state which tool you are using.

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

- 5 agents max per wave — no exceptions
- Check context budget before each wave
- Unique directive per agent — never duplicate prompts within a wave
- Read prior output before launching the next wave
- Stop and synthesize if budget runs low — do not push through to completion at the cost of a crash
- Wave 2+ directives must explicitly exclude angles already covered in prior waves
