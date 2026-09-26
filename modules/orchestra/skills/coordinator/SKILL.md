---
name: coordinator
version: 0.0.22
description: Route bounded implementation from a capable main session to coding workers while keeping planning, review, verification, and git in the main seat. Use for worker dispatch, model arbitrage, parallel implementation, Opus, Sol, Astra, Muse, Grok, OpenCode, or native workflows.
---

# Coordinator

Keep the current session in the main seat. The main owns the plan, interfaces,
review, verification, and final decision. Workers implement bounded units; they
do not own git or silently change the plan.

```text
current main session
├── native specialists: evidence, review, testing, domain expertise
├── native worker-controllers: visible supervision in the host UI/workflow
│   └── coding workers: bounded code volume
└── optional advisor: read-only opinion at a commitment boundary
```

Invoking Coordinator is itself a routing decision: spend the main model on
judgment and route bounded implementation to the preferred authorized coding
worker without waiting for the user to say "workers" or "model arbitrage."

For independent advice at a real decision boundary, use `advisor`; do not
consult by default. For a fan-out larger than the available host slots, also
load `wave-coordinator`.

## Progressive loading

Do not read every harness guide. Load only the resources needed for this run:

1. Always read [the dispatch contract](references/dispatch-contract.md) before
   sending implementation work.
2. Read exactly one current-host guide:
   [Claude Code](references/hosts/claude.md),
   [Codex](references/hosts/codex.md),
   [Grok Build](references/hosts/grok.md), or
   [OpenCode](references/hosts/opencode.md).
3. For each external worker actually selected, read only its guide:
   [Codex / Sol / Astra](references/workers/codex.md),
   [Grok CLI](references/workers/grok.md),
   [Muse Code](references/workers/muse.md), or
   [OpenCode CLI](references/workers/opencode.md).
   When dispatching the Claude Opus worker or raw Codex CLI, also load
   [references/workers/cli-dispatch.md](references/workers/cli-dispatch.md).

Example: a Claude main dispatching an OpenCode worker reads this file, the
dispatch contract, the Claude host guide, and the OpenCode worker guide. It does
not load Grok, Codex, or Muse instructions.

## Ownership boundary

| Work | Owner |
|---|---|
| Plan, architecture, interfaces, and acceptance criteria | Main |
| External-worker launch, monitoring, and complete report | Native worker-controller when supported |
| Bounded implementation | Selected coding worker |
| Hard debugging analysis and visual judgment | Main, then dispatch the fix |
| Diff review, final verification, commits, pushes, and PRs | Main |
| One-line edits found during review | Main when dispatch overhead is larger |

Use a worker only when it is materially useful for the bounded unit.
Every dispatch has a context, specification, and review cost. Split at coherent
API or file-ownership boundaries, not into tiny tasks merely to create a graph.

## Select a lane

Default implementation to the authorized, preflighted `claude-opus-5-5` lane.
Preserve an explicit user-selected alternative lane. A user may attach an
expiry or another stop condition
to that preference. Record it, honor the override while it is active, then run
normal lane selection again when it expires; do not bake a session-specific
deadline into the reusable skill. If provider authorization or preference is
unresolved, ask once. Do not silently implement in the main session.

Prefer native specialists for evidence, investigation, review, testing, and
tool- or domain-bound judgment. Match that work against
`../deploy-agent-team/references/agent-roster.md`; use a generic specialist only
when no roster specialist fits. This native-first rule does not apply to routine
implementation volume.

The preferred coding worker is Claude Opus 5.5 (`claude-opus-5-5`). Independent
code review runs on GPT-6 Sol (`gpt-6-sol`) or GPT-6 Astra (`gpt-6-astra`) at
`xhigh` reasoning, never at default effort. GPT-6 Astra also remains a
special-purpose 3D / animation / gamification / creative implementation lane;
Muse Spark 1.3 remains an explicit alternative lane. Never dispatch a `gpt-5.6`
model (Sol, Luna, Terra), not as a default, a CloudAgent fallback, or an
explicit choice. OpenCode is
a portable lane whose provider and model must be pinned. Grok is not a normal
worker lane: use it only under usage-credit pressure, pin `grok-4.7`, and never
use Grok 4.6. Never infer or replace the user's current main model. If the
required default is unavailable, report that boundary instead of silently
substituting a superseded model.

CloudAgent is only one coding lane. Its catalog omitting `claude-opus-5-5` does
not make the model unavailable: use the Claude Code CLI lane
(`claude -p --model claude-opus-5-5`) on an agent computer or Luke's Claude
Code desktop harness instead. Do not fall back to `gpt-6-sol`, a `gpt-5.6`
model, or Grok solely because CloudAgent lacks the model.

If the work has deterministic stages, loops, or voting, use a native workflow
only when the current host guide says the primitive exists and the user opted
into multi-agent work. The script may own control flow; the main still owns the
plan, evidence, and ship decision.

## Keep external work visible

When the current host supports native subagents, spawn one native
worker-controller per independent implementation unit. Give it the spec and
the selected worker guide; instruct it to preflight, launch, monitor, and report
the external worker without writing the implementation itself. This keeps the
cheap worker visible in the host's subagent panel and lets native workflows own
its lifecycle. The wrapper is control plane; the selected model remains the
implementation plane.

Use direct external dispatch from the main only when the host has no usable
native child primitive. Do not claim the external model appears as a native
agent—the visible item is its controller, and its final report must identify
the actual provider/model that performed the implementation.

## External-provider boundary

Before first use of an external lane, state which provider will receive the
prompt, specification, and selected repository content. Obtain approval unless
the user already authorized that lane for the task. Never send secrets,
credentials, unrelated proprietary content, or a broader snapshot than the
assignment requires. An OpenCode model uses the provider behind its pinned
`provider/model`; verify that destination instead of treating OpenCode itself as
the provider.

## Run sequence

1. Inspect the task, repository instructions, current state, and the premise
   behind the requested change.
2. Choose the current-host adapter and the smallest useful worker lane.
3. Read the dispatch contract plus only those selected guides.
4. Preflight the lane. A missing binary, model, authentication, or write policy
   makes the lane unavailable; never silently absorb the work in the main.
5. Write a precise spec and partition concurrent file ownership.
6. Spawn a native worker-controller when supported; it dispatches in the
   background while the main keeps useful work moving.
7. At the hard barrier, run an independent read-only review: inspect the
    actual diff and worker report. Treat missing evidence as unverified.
8. Re-run acceptance unpiped in the main environment, then commit and ship
    from here. Only the main commits, pushes, or opens a pull request.

## Failure behavior

- Infrastructure failure is not a quality failure. Preserve the spec and retry
  or explicitly reroute it.
- The review and test path share one corrective allowance: re-dispatch the
  same maker once with concrete feedback. After a second failure, control
  returns to the main to fix or stop.
- Reject environment-driven workarounds such as replacing dependencies,
  changing bundlers, removing remote assets, or weakening tests.
- Do not let a worker commit, push, or merge.
- Do not install CLIs, change global configuration, or increase agent depth
  without user authorization.
- When an advisor was consulted, its disagreement with worker or review output
  must be explained and reconciled with direct evidence, not ignored.

## Final report

Tell the user which lanes actually ran, which provider received content, what
each worker returned, what changed, which verification passed, and what remains
unresolved. Never imply that a worker or specialist ran when it did not.
