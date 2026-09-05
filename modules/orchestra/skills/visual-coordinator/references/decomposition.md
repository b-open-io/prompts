# Choosing the decomposition

Use the shared [coordinator dispatch contract](../../coordinator/references/dispatch-contract.md)
for every dispatch. Concurrent writable workers use controller-created
worktrees. A single simple, low-risk writable worker may use a shared tree only
when the main selects that strategy explicitly.

Drawing the canvas is mechanical. Deciding what becomes a phase, what becomes a
node, and where a barrier belongs is the judgement the artifact exists to expose.
A confident diagram of the wrong shape is worse than no diagram, because the user
approves it and the run executes the wrong plan faithfully.

## Find the unit before drawing anything

Most large jobs fan out over one repeating unit: a file, a module, a route, a
finding, a dependency, a tool. Name it out loud. If no unit repeats, the job is
probably sequential work wearing a fan-out costume, and the honest canvas is a
short chain of phases with one node each.

Two questions settle it:

- What is the list? If a list cannot be written down, there is nothing to fan out over.
- Does each item's work depend on another item's result? If yes, it is a pipeline
  over stages, not a fan-out over items.

## Phase versus node

A **phase** is a change in the *kind* of work — recon, then implement, then
verify. A **node** is one unit of the same kind of work within a phase.

Signals that two things belong in different phases: the second cannot be
specified until the first has produced something; the second reviews or
verifies what the first produced; a human decision sits between them.

Signals that two things are nodes in the same phase: they touch disjoint files;
their specs could both be written now; running them in either order gives the
same result.

## Barrier or no barrier

Default to `pipeline`, which has no barrier: each item flows through the stages
independently, so a fast item finishes while a slow one is still moving. Wall
clock is the slowest single item, not the sum of the slowest per stage.
This default is Claude-only: `pipeline()` exists on Claude Code and on no
other host.

Use `parallel`, which is a barrier, only when the next phase genuinely needs
every prior result at once. Three real cases:

- Deduplicating or merging across the whole result set before expensive work.
- Deciding whether to proceed at all — "zero findings, skip verification".
- A prompt that references the other results for comparison.

These are **not** reasons for a barrier: needing to flatten or filter a list
(do it inside a stage), the phases feeling conceptually separate, or it reading
more tidily. A barrier that is not required is wall-clock spent for nothing, and
on a canvas it misleads the user into thinking a dependency exists.

## Host-specific sequencing

The canonical ship shape is always the same — the controller creates predictable
worktrees and planning pins interfaces, bounded makers run in parallel, a hard
barrier waits for every maker, an independent read-only review approves or sends
back at most one correction to the responsible maker, then main runs
deterministic tests. Test failure uses that same single correction allowance and
returns exhausted control to main. A distinct human gate approves irreversible
merge/ship; only then does main commit/push/open the PR and cleanup the exact
merged local/remote branch. Workers never commit or ship.

How that shape is executed depends on the host:

- **Claude Code** may use `pipeline()` (no barrier, items flow independently)
  or `parallel()` (barrier) between stages.
- **Grok Build** has barrier `parallel()` plus later phases, but no
  `pipeline()` — a later item cannot advance while an earlier one is still
  running.
- **Codex and OpenCode** have no workflow runtime at all. They use
  caller-managed waves and barriers: the caller creates each worktree cwd,
  sequences `codex exec` or `opencode run` dispatches, waits for the whole
  panel, then dispatches the next wave. Never draw a native pipeline or DAG
  node for these hosts; a non-host lane is a shell-out card.

## Sizing

Dispatch has a floor cost — spec writing, context re-establishment, review. Ten
nodes of two minutes each cost more in total than three nodes of seven. Split at
a boundary that already exists in the work (a module, a route, a finding), never
mid-feature to hit a node count.

If the unit list runs to dozens, size waves rather than drawing dozens of nodes;
`Skill(orchestra:wave-coordinator)` covers that.

## Where isolation is actually needed

Use worktree-per-agent for concurrent or non-trivial writable work. For one
obvious, low-risk writable worker, an explicitly selected shared tree can be
cheaper. Name each node's owned paths on the canvas; that list is the lock. A
second writer, overlap, or uncertainty returns the workflow to
controller-created worktrees.

## Which model where

Cheap tiers for mechanical work with a clear acceptance test. Expensive tiers for
judgement: architecture, adversarial review, anything where being subtly wrong
survives the gate.

A shell-out node's wrapper should be the cheapest tier that can supervise — the
spend is in the wrapped process, not the wrapper that polls it.

Racing the same node across two lanes buys a genuine second perspective and costs
double. Reserve it for a decision that is expensive to get wrong, never for
routine volume.

## The verification gate

A gate is a **node**, not a footer command. It has at least two outbound
edges: `pass` (forward) and `reject` (back to a named earlier node). That
reject-back is the loop. A workflow whose checker can only stop, not send
work back, is not a factory.

The gate node still carries the command that proves the work (`bun test`,
or the adversarial review prompt). A canvas with no gate node is missing
the load-bearing part — seed one and say it was defaulted.

Prefer a command that fails loudly on the specific thing the job changed.
"Tests pass" is weaker than "tests pass and the new tag appears in the
rendered HTML", because the first would also pass if the work had not
been done.

## Seed the graph, not a phase list

The canvas consumes `nodes[]` and `edges[]`. Each edge is
`{ from, to, label, kind }` with `kind` one of `forward`, `reject`,
`memory`. `memory` is an across-run loop (journal, last ledgers).

Do not flatten this into `phases[].nodes[]` as the thing the user edits.
Phases can be derived later for the host script. The user edits the graph.

## Reading the shape back

Before publishing, check the drawing against these:

- Every phase boundary corresponds to a real dependency, not a tidy grouping.
- Every barrier has one of the three justifications above.
- No two nodes in one phase write the same path without worktree isolation.
- Node count is set by the work's own boundaries, not a target.
- The gate would fail if the work had not been done.
