---
name: wave-coordinator
version: 1.0.9
description: Dispatch many independent units in bounded waves with honest host limits, distinct assignments, barriers, and main-seat reconciliation. Use for fan-out, batch agents, many variations, or work that exceeds the host's free subagent slots.
---

# Wave Coordinator

Batch a large fan-out without losing ownership, context, or diversity. This
skill owns wave sizing, ordering, the wave ledger, and barriers. It does not
redefine how workers are selected or launched.

## Load the shared dispatch rules

Before a wave that implements anything, read
[Coordinator](../coordinator/SKILL.md), its
[dispatch contract](../coordinator/references/dispatch-contract.md), exactly
one current-host guide, and only the worker guides selected for the wave.
Those files govern cheap-lane selection, native controllers, provider
disclosure, isolation, specs, review, verification, and git ownership.

Use roster specialists for evidence, review, testing, and domain judgment.
Use cheaper external workers for bounded implementation volume. Do not repeat
host command syntax here; the selected Coordinator references are the source of
truth.

## Size each wave from live capacity

Start with five as a conservative planning ceiling, then use the smallest of:

1. five, unless the user deliberately chose another ceiling;
2. the host's advertised concurrency cap;
3. currently free native child slots;
4. genuinely independent remaining units; and
5. the size the remaining context can still synthesize.

The configured cap includes already-running children. Reserve at least 20% of
the main context for reconciliation and the final report. If that reserve is
at risk, shrink or stop the fan-out.

```text
12 independent units, five free slots
wave 1: 5 -> barrier/review
wave 2: 5 -> barrier/review
wave 3: 2 -> barrier/final reconciliation
```

Never start the next wave until the prior wave has returned complete reports
and the main has recorded what remains.

## Make units distinct

Every unit needs exclusive ownership and a different purpose. For creative
variants, vary a real axis such as audience, risk posture, structure, or tone.
For implementation, split at file or interface boundaries and pin shared seams
verbatim in every affected spec.

Before wave two and later:

1. read all accepted output from earlier waves;
2. record approaches already covered;
3. exclude duplicates explicitly from the new assignments; and
4. drop units whose intended outcome already exists.

## Keep a wave ledger

Track the facts needed for the next decision:

```text
wave 1 - 4/4 returned; 3 accepted; 1 correction pending
providers - OpenAI via Codex (2), Muse via OpenCode (2)
controllers - four native child ids
shared context - SPEC files only; no secrets
remaining - API adapter, regression test, reconciliation
```

The ledger must distinguish the visible native controller from the external
provider/model that performed implementation. An idle or completed controller
is lifecycle evidence, not proof that the external process succeeded.

## Run barriers in the main

At every barrier, the main:

- reads complete reports and actual diffs;
- rejects edits outside assigned ownership;
- records provider, model, disclosure state, and context shared;
- runs the relevant acceptance gate unpiped; and
- updates the ledger before dispatching again.

Independent units may run concurrently. Integration, cross-unit fixes, final
verification, and all git operations wait behind the barrier.

## Host shape

Use the current-host guide for exact primitives:

- Claude Code and Grok Build may offer native workflow engines.
- Codex uses native children and main-thread barriers; account for occupied
  slots and do not raise global depth without approval.
- OpenCode has agents and `opencode run`, not a multi-stage workflow engine;
  the caller sequences waves and verifies child markers.

When the host supports native children, each external worker runs beneath a
visible native controller. When it does not, the main may dispatch directly as
specified by the host guide and must still preserve the same ledger fields.

## Finish

Synthesize accepted results rather than concatenating them. Report wave sizes,
controllers, actual providers/models, rejected or retried units, gates run, and
remaining uncertainty. Never claim a roster agent, provider, or model ran
without evidence.
