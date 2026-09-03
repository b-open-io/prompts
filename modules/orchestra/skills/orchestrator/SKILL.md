---
name: orchestrator
version: 0.0.7
description: >-
  Coordinate native specialist agents, external implementation workers such as Grok, Sol,
  Luna extra-high, Muse Spark 1.3, or `opencode run` workers, and an independent advisor such as Fable from a capable
  main session. Use for "orchestrate this", "use Grok workers", "use Luna workers",
  "use Fable as advisor", "Codex main with workers", "delegate implementation but keep
  control here", or cross-model workflows. Never replaces the user's current main model.
  Luna is the unlimited-feeling volume lane, not the default worker.
---

# Orchestrator

Keep one main seat in control while using other agents for the work they do
best. This skill supports Claude Code, Codex, Grok Build, and OpenCode mains. The current main model is
whatever the user selected; never infer, rename, or pin it.

## Default topology

```text
Current Claude, Codex, Grok, or OpenCode main
├── native specialist agents: exploration, review, testing, domain expertise
├── worker lane: bounded implementation volume (menu, not one model)
└── Fable advisor lane: read-only second opinions at commitment boundaries
```

Worker model is Coordinator's menu, never inferred:

- **Quality default:** Grok (`BOPEN_WORKER_MODEL`) or GPT-5.6 Sol
- **Unlimited-feeling volume, not the default:** GPT-5.6 Luna at extra-high reasoning
- **Cheap Meta volume, not the default:** Muse Spark 1.3 via Muse Code (`muse exec`)
  or via OpenCode (`opencode run -m muse-spark/muse-spark-1.3` with a custom provider block)
- **Portable worker lane:** `opencode run --model <provider/model>` from any main —
  OpenCode skills are drop-in `SKILL.md`, agents are `.opencode/agent(s)/` or `--agent <name>`

Do not pin Fable as the main. The main is whatever the user already selected.
Do not pick Luna because it is cheap; pick it when the user wants leftover /
unlimited-feeling Codex volume.

On a Claude Code main, a fourth lane exists: the native `Workflow` tool for
deterministic staged fan-outs (opt-in-gated, Claude-only). Treat it as a
dispatch lane under the same ownership rules — see
`../coordinator/references/native-workflows.md`.

The main owns:

- task interpretation and the controlling plan
- decomposition, file ownership, and shared interfaces
- acceptance criteria and verification commands
- review of every worker diff
- reconciliation of specialist and advisor findings
- final tests, user-facing synthesis, commits, pushes, and pull requests

Workers and advisors do not inherit that ownership. The main can accept,
reject, or reconcile their results using direct evidence.

## Compose the detailed protocols

Use the existing skills instead of duplicating their full manuals:

- Load [Coordinator](../coordinator/SKILL.md) before dispatching implementation.
  It owns specs, disjoint file ownership, worker preflight, structured final
  reports, adversarial diff review, and main-seat verification.
- Load [Advisor](../advisor/SKILL.md) before consulting an independent model.
  It owns consult packaging, read-only boundaries, commitment timing, the
  verdict contract, and reconciliation.
- Load [Wave Coordinator](../wave-coordinator/SKILL.md) when the requested fan-
  out exceeds currently free host slots or needs staged diversity.
- Before dispatching to a generic specialist, match the unit against the
  roster in `../deploy-agent-team/references/agent-roster.md` (or ask Front
  Desk) and pass the specific `subagent_type`. Use a generic agent only when
  no roster agent fits, and say so explicitly in the dispatch note.

Apply Coordinator and Advisor together when the workflow has both workers and
an advisor. Coordinator governs execution; Advisor governs judgment consults.

## Host adapter

### Codex main

- Prefer installed `bopen_*` custom agents for named specialists. Use built-in
  `explorer` or `worker` agents as an explicit fallback.
- If a named adapter is absent, say so and offer the explicit
  `core:codex-agent-setup` skill. Do not claim the persona was spawned.
- Keep wave control in the main thread. With Codex's default `max_depth = 1`,
  direct children cannot recursively fan out; that is usually desirable.
- Use Grok for bounded implementation when authorized. Luna extra-high is
  an explicit cheap Codex volume lane, not a silent substitute for native
  Codex agents. Do not launch a second Codex CLI merely to reproduce what a
  native Codex subagent can do.
- Use the Advisor skill's Fable CLI channel for an independent Claude opinion.

### Claude Code main

- Prefer plugin-qualified Claude agents for specialists.
- Use Grok or Codex as implementation lanes when authorized and economical.
  Luna extra-high and Muse Spark 1.3 are cheap-volume options from
  Coordinator, not defaults.
- Prefer Claude's native advisor or a read-only premium Claude subagent when
  available. Use an external advisor only when it adds independence.

### OpenCode main

- Prefer native OpenCode subagents (`.opencode/agent(s)/<name>.md`, `--agent <name>`)
  for specialists. Skills are drop-in `SKILL.md` — OpenCode also reads `.claude/skills/`.
- Use `opencode run --model <provider/model>` workers for bounded implementation
  volume, and external CLIs (`codex exec`, `grok`, `muse exec`, `claude --print`)
  as shell-out lanes when authorized. Same ownership rules: specs here, review
  here, git here.
- There is no native workflow primitive and no hooks file on OpenCode — sequence
  `opencode run` dispatches from the caller, and hooks are plugin event handlers.
- Detect the host with `OPENCODE=1` / `OPENCODE_PID` (see Coordinator and
  `detect-harness.sh`); never assume the main from memory.

## External data boundaries

External lanes are optional and must be transparent:

- A Grok dispatch can send its prompt, specification, code excerpts, and other
  repository content to xAI.
- A Muse dispatch can send the same class of content to Meta.
- A Codex / Sol / Luna dispatch can send it to OpenAI.
- A Fable consult can send its consult package and repository files inspected
  by read tools to Anthropic.
- An `opencode run` worker dispatch can send its prompt, specification, and
  repository content to whichever provider backs the pinned `provider/model`
  (configure custom providers explicitly in `opencode.json` so the destination is known).

Before the first use of each external lane, state what content will be shared
and obtain approval unless the user already explicitly authorized that lane
for the task. Never send secrets, credentials, unrelated proprietary content,
or a broader repository snapshot than the assignment needs.

## Orchestration sequence

1. **Orient in the main.** Inspect the request, applicable instructions, repo
   state, available agent roster, and relevant evidence. Do not delegate a
   premise that has not been checked.
2. **Select the topology.** Decide which work stays in the main, which native
   specialists are useful, which implementation units fit the worker menu
   (Grok/Sol quality; Luna extra-high or Muse 1.3 only when asked for cheap
   or unlimited-feeling volume), and whether a Fable consult reaches a real
   commitment boundary.
3. **Preflight lanes.** Verify native agent availability. For Grok, inspect the
   complete `grok models` output, require `BOPEN_WORKER_MODEL`, and confirm its
   exact value exists before dispatch. For Luna, confirm `codex` and
   `-m gpt-5.6-luna` with extra-high effort. For Muse, confirm `muse` and
   `--model muse-spark-1.3`. For OpenCode workers, confirm `opencode` and
   `opencode models <provider>` listing the pinned `provider/model` (no
   `opencode exec` exists — the entrypoint is `opencode run`). For Fable, verify
   Claude CLI authentication and use
   `${BOPEN_ADVISOR_MODEL:-fable}` without claiming that alias is permanently
   the latest model.
4. **Disclose external sharing.** Obtain any required approval before sending
   repository content to xAI, OpenAI, Meta, Anthropic, or the provider behind
   a pinned OpenCode `provider/model`.
5. **Gather specialist evidence.** Use native agents for independent research,
   architecture, security, testing, documentation, or domain analysis. Give
   each a bounded, self-contained assignment and require a complete report —
   for background-dispatched agents, instruct them explicitly to deliver
   that report via the host's messaging mechanism before going idle; an idle
   notification is not a deliverable (see Coordinator's Background Subagent
   Etiquette for the full pattern).
6. **Consult at a commitment boundary.** If warranted, package the goal,
   constraints, state, evidence, and one decision for the read-only advisor.
   Advice returns to the main; it never becomes an edit task.
7. **Write worker specs in the main.** Partition implementation by disjoint file
   ownership or isolate it with worktrees. Pin shared interfaces verbatim,
   include exact acceptance commands, name forbidden files, and require the
   Coordinator final-report contract.
8. **Dispatch and keep working.** Run independent workers in parallel while the
   main prepares later specs, reviews completed evidence, or plans verification.
   Stop at a barrier before cross-unit synthesis or git operations.
9. **Review adversarially.** Inspect every diff, especially tooling, dependency,
   security, and sandbox-workaround surfaces. Reconcile disagreements with
   evidence or one focused follow-up.
10. **Verify and ship from the main.** Re-run acceptance in the main environment.
    Only the main commits, pushes, opens a PR, or reports completion.

## Failure behavior

- A missing or unauthenticated lane is unavailable, not permission to silently
  absorb or reroute the work. Report it and choose another lane explicitly.
- Infrastructure failure is not a worker-quality strike. Preserve the spec and
  retry or reroute it without accepting environment-driven workarounds.
- Two corrected quality misses trigger the Coordinator escape hatch.
- Advisor disagreement is surfaced and reconciled; never silently ignore it.
- Do not increase Codex agent depth, install adapters, install CLIs, or change
  global configuration without user authorization.

## Final report

Report the topology actually used, external providers consulted, work returned
by each lane, files changed, verification results, unresolved disagreements,
and any lane that was unavailable. Never imply a worker or advisor ran when it
did not.
