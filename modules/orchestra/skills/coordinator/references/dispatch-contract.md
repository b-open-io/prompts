# Dispatch Contract

Read this for every implementation dispatch. It is independent of the current
host and selected worker.

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
| Disjoint files in one tree | Units have clean ownership | Each spec lists its exclusive edit set and sibling-owned files |
| Dependency waves | A later spec depends on unfinished evidence or code | Finish and verify the earlier wave before dispatching the next |
| Isolated worktrees | Units must touch the same files or overlap is uncertain | Main reviews and integrates every diff, then verifies after each integration |

Two concurrent workers may never write the same file in a shared tree. Pin every
shared seam verbatim in the affected specs. A worker may report sibling-caused
type errors but must not edit sibling-owned files to fix them.

For larger fan-outs, load wave-coordinator. Stop at a hard barrier before
cross-unit synthesis, final verification, or git operations.

## Dispatch safely

- On hosts with native subagents, the main spawns a native worker-controller
  and the controller runs the external worker command. Tell the controller not
  to implement the spec itself or silently fall back to its own model.
- Require the controller to report external provider/model, process outcome,
  log location, and the worker's complete final report. Its native UI status is
  lifecycle evidence, not proof that the external implementation succeeded.
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

The worker's final report is a claim, not proof. Inspect the actual diff and:

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

One corrected quality miss may be re-dispatched with concrete feedback. After a
second corrected miss, the main may finish the unit directly. Environment
failures do not count as quality strikes.
