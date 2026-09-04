# Dispatch Contract

Read this for every implementation dispatch. It is independent of the current
host and selected worker.

## Canonical flow

Non-trivial changes intended to ship follow this flow:

```text
main accepts plan and pins interfaces
  -> bounded makers run in parallel
  -> hard barrier: every maker reaches a terminal state
  -> independent read-only review
       approve -> main runs deterministic gates
       reject  -> same maker gets one corrective dispatch -> review again
  -> main commits, pushes, and opens the PR
```

The reviewer and test path share one corrective allowance. A second failure
returns control to the main to fix or stop. Workers never commit or ship. A
read-only task or one obvious edit remains a single-agent operation.

## Specify before dispatch

Write a SPEC-<ticket>-<slug>.md file at the target repository root and keep it
untracked. Include:

- objective and the evidence behind the premise
- files the worker may edit and files it must not touch
- exact interfaces, types, storage keys, and API shapes shared with other units
- functional and visual constraints
- acceptance criteria with exact verification commands

If the spec cannot be completed, the decision is not ready to delegate. Resolve
that ambiguity in the main session. For frontend work, specify layout, states,
interactions, spacing, motion, and reference patterns.

Every spec must include this environment clause:

> If you hit an environment blocker (read-only path, no network, blocked cache),
> stop and report it. Never work around it by changing build tooling, removing
> dependencies, reimplementing libraries, or deleting assets. Environment
> artifacts are the dispatcher's problem, not a code problem.

Every prompt must demand:

> End with a FINAL REPORT: files changed, commands run and their pass/fail
> result, status of every acceptance criterion, and anything you could not do
> and why. If you changed no files, say so explicitly and explain.

Native workers need the same self-contained spec unless the host explicitly
guarantees inherited context. A path alone is insufficient when the worker
cannot read the same workspace.

## Prevent collisions

Choose one isolation strategy before concurrent writes:

| Strategy | Use when | Rule |
|---|---|---|
| Disjoint files in one tree | One obvious, low-risk writable worker | The spec lists its exclusive edit set; never use for concurrent writers |
| Dependency waves | A later spec depends on unfinished evidence or code | Finish and verify the earlier wave before dispatching the next |
| Isolated worktrees | Units must touch the same files or overlap is uncertain | Main reviews and integrates every diff, then verifies after each integration |

Concurrent writable workers use isolated worktrees, even when their intended
files are disjoint. This makes accidental scope drift visible and keeps one
worker from observing another's unfinished changes. A worker may report
sibling-caused type errors but must not edit sibling-owned files to fix them.

For larger fan-outs, load wave-coordinator. Stop at a hard barrier before
cross-unit synthesis, final verification, or git operations. Every maker must
reach a terminal state before the barrier lifts.

## Own the worktree lifecycle

Non-trivial writable workers use isolated git worktrees. The main or native
controller—not the implementation worker—resolves the exact base ref, creates
and records the feature branch and worktree, and passes that path as the
worker's cwd. Use a predictable configurable root; when the user has not set
one, prefer `~/code/worktrees/<repo>-<task>`. Never let a worker improvise
implementation writes in the user's primary checkout or top-level project
folder.

The main reviews, integrates, and verifies from the recorded worktree. Keep
the worktree and branch intact while review is pending or failed. Only after a
human-approved merge may the main remove that exact worktree, prune its stale
metadata, delete the merged local feature branch, and delete the remote feature
branch when repository policy and user authorization allow it. Resolve and
validate every cleanup target first; never sweep unrelated worktrees or
branches.

Every writable-worker prompt must include the exact worktree path, feature
branch, base ref, and owned files or directories. It must say that the worker
is already inside the prepared worktree and must treat the supplied cwd as the
repository root. Before editing, the worker verifies cwd and current branch and
stops if either differs. The worker must not create another worktree, invoke a
harness `--worktree` option, switch/create/delete branches, commit, push, merge,
or clean up the worktree. Creation belongs to the main or native controller;
post-merge cleanup belongs to the main alone.

## Dispatch safely

- Preserve useful, approved worker capabilities by default. Inventory the
  skills, plugins, agents, tools, and MCP servers the process will inherit and
  include relevant ones in the disclosure. Disable only capabilities that are
  unrelated, risky for this task, or causing a startup conflict. Use a narrow
  tool allowlist or clean-room profile when the data boundary requires it; do
  not strip a capable harness bare as a routine ritual.
- Use the cheapest reliable native model at low or minimal reasoning for a
  worker-controller. Its job is mechanical: pass the bounded prompt, launch
  the external CLI, preserve complete output, and report the provider, model,
  process result, log path, and worker final report. It must not implement the
  spec itself. Use premium or higher-reasoning native capacity only when the
  controller must diagnose a failed process or perform substantive
  reconciliation, and state that escalation explicitly.
- On hosts with native subagents, the main spawns a native worker-controller
  and the controller runs the external worker command. Tell the controller not
  to implement the spec itself or silently fall back to its own model.
- Every external dispatch report carries the shared controller evidence
  contract: controller identity plus the model/effort the main requested;
  runtime-confirmed controller metadata when the host exposes it; actual
  external provider/model; disclosure state; exact context shared; process
  result; full log path; complete worker report. The main injects requested
  controller metadata into the prompt. A child never guesses its own runtime
  identity, and missing runtime-confirmed metadata stays `unknown`. Native UI
  status is lifecycle evidence, not proof that external implementation
  succeeded.
- Run implementation with write access but the narrowest available sandbox.
- Run independent work in the background and preserve the complete output in a
  log. Do not pipe the worker invocation through head or tail; that can discard
  its report and hide the real exit status.
- Treat network, ports, caches, and credentials as properties of the effective
  worker environment. Preflight what the task needs.
- When a worker needs external data but lacks network access, the main may
  provide an explicit offline fixture. Never introduce a silent production
  fallback.
- The repository's build system is part of the product. A worker must not swap
  bundlers, replace libraries with shims, or remove fonts, telemetry, assets, or
  tests to make its sandbox green.

Keep useful main-seat work moving while workers run. A timeout, quota error, or
dead process is infrastructure failure; retry or explicitly reroute the same
spec.

## Review adversarially

The worker's final report is a claim, not proof. Review is independent and
read-only: the reviewer inspects the diff and never edits. Inspect the actual
diff and:

- confirm every edit is inside the allowed file set
- inspect package scripts, lockfiles, build config, CI, containers, and
  TypeScript config independently
- look for aliases, shims, mocks, vendored dependencies, test weakening, and
  removed remote assets
- verify generated output was fixed at its source rather than hand-formatted
- reject unrelated cleanup and speculative abstractions

For UI work, run the app in the main environment, interact with it, and compare
screenshots with the specified design intent. Restart a long-lived preview
after a worker build if stale chunks could be served.

## Verify and ship from the main

Re-run acceptance in the main environment. Run gating commands unpiped so their
exit codes cannot be masked. A worker-green result does not replace this gate.

Only the main commits, pushes, or opens a pull request. In a shared tree, stage
an explicit path list; never sweep in unrelated or mid-flight edits with a broad
add. If the remote moved, reconcile it, inspect the combined diff, and re-run
acceptance before pushing again.

One corrected quality miss may be re-dispatched to the same maker with
concrete feedback; the review and test path share this single corrective
allowance. After a second failure, the main finishes the unit directly or
stops. Environment failures do not count as quality strikes.
