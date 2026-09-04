---
name: coordinator
version: 0.0.17
description: Route bounded implementation from a capable main session to cheaper workers while keeping planning, review, verification, and git in the main seat. Use for worker dispatch, model arbitrage, parallel implementation, Sol, Luna, Muse, Grok, OpenCode, or native workflows.
---

# Coordinator

Keep the current session in the main seat. The main owns the plan, interfaces,
review, verification, and final decision. Workers implement bounded units; they
do not own git or silently change the plan.

For independent advice, use `advisor`. For a workflow that combines workers and
an advisor, use `orchestrator`. For a fan-out larger than the available host
slots, also load `wave-coordinator`.

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
   [Codex / Sol / Luna](references/workers/codex.md),
   [Grok CLI](references/workers/grok.md),
   [Muse Code](references/workers/muse.md), or
   [OpenCode CLI](references/workers/opencode.md).

Example: a Claude main dispatching an OpenCode worker reads this file, the
dispatch contract, the Claude host guide, and the OpenCode worker guide. It does
not load Grok, Codex, or Muse instructions.

## Ownership boundary

| Work | Owner |
|---|---|
| Plan, architecture, interfaces, and acceptance criteria | Main |
| External-worker launch, monitoring, and complete report | Native worker-controller when supported |
| Bounded implementation | Selected cheaper worker |
| Hard debugging analysis and visual judgment | Main, then dispatch the fix |
| Diff review, final verification, commits, pushes, and PRs | Main |
| One-line edits found during review | Main when dispatch overhead is larger |

Use a worker only when it is materially cheaper or better for the bounded unit.
Every dispatch has a context, specification, and review cost. Split at coherent
API or file-ownership boundaries, not into tiny tasks merely to create a graph.

## Select a lane

Choose implementation lanes by economics first. Preserve a user-selected cheap
lane; otherwise use the cheapest authorized, preflighted worker that can meet
the acceptance criteria. If provider authorization or preference is unresolved,
ask once. Do not silently implement on the premium main or native lane.

Prefer native specialists for evidence, investigation, review, testing, and
tool- or domain-bound judgment. Match that work against
`../deploy-agent-team/references/agent-roster.md`; use a generic specialist only
when no roster specialist fits. This native-first rule does not apply to routine
implementation volume.

External quality lanes are Grok and GPT-5.6 Sol. GPT-5.6 Luna at extra-high
reasoning and Muse Spark 1.3 are cheap-volume choices. OpenCode is a portable
lane whose provider and model must be pinned. Prefer an already authorized,
configured cheap lane over a quality lane when both can satisfy the spec.
Never infer or replace the user's current main model.

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
its lifecycle. The wrapper is control plane; the cheaper model remains the
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
7. At the barrier, inspect the actual diff and worker report. Treat missing
   evidence as unverified.
8. Re-run acceptance in the main environment, then commit and ship from here.

## Failure behavior

- Infrastructure failure is not a quality failure. Preserve the spec and retry
  or explicitly reroute it.
- Correct one quality miss with concrete feedback. After a second corrected
  miss, the main may use the escape hatch and finish the unit directly.
- Reject environment-driven workarounds such as replacing dependencies,
  changing bundlers, removing remote assets, or weakening tests.
- Do not let a worker commit, push, or merge.

## Final report

Tell the user which lanes actually ran, which provider received content, what
each worker returned, what changed, which verification passed, and what remains
unresolved. Never imply that a worker or specialist ran when it did not.
