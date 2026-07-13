# Native Workflows (Claude Code's Workflow tool)

Claude Code ships a built-in `Workflow` tool: deterministic multi-agent
orchestration as a JavaScript script — `agent()` spawns subagents,
`pipeline()` runs items through stages with no barriers, `parallel()` fans
out with a barrier, `phase()` groups progress, `budget` scales depth to a
token target. Runs in the background with live progress in the `/workflows`
interface, structured outputs via JSON schema, per-agent worktree isolation,
and resume (`resumeFromRunId`) with cached prefixes.

## Availability — this is framework-dependent

The Workflow tool exists only in Claude Code sessions (local or cloud). Codex,
OpenCode, Grok Build, and other runtimes have no equivalent as of mid-2026.
The check is simple: the `Workflow` tool is either in the session's tool set
or it isn't. When it isn't, everything below is moot — use this skill's manual
wave/dispatch protocols instead.

## Opt-in gating — non-negotiable

Workflows can spawn dozens of agents; the runtime requires explicit user
opt-in before `Workflow` may be called: the "ultracode" keyword or session
mode, the user asking for a workflow/fan-out in their own words, a named saved
workflow, or the user invoking a skill whose instructions call for Workflow.
That last clause matters here: when the user invoked coordinator or
wave-coordinator explicitly asking for multi-agent orchestration, calling
Workflow is sanctioned. When they didn't — when the task would merely benefit
from it — describe what a workflow would do and roughly cost, and ask.

## When to prefer a workflow over hand-rolled Agent waves

On Claude Code with opt-in satisfied, reach for a native workflow when the
orchestration has SHAPE — deterministic control flow the model shouldn't be
trusted to hand-execute across many turns:

- **Staged fan-outs**: find → adversarially verify → synthesize. `pipeline()`
  lets item A verify while item B is still being found; hand-rolled waves
  serialize at every stage boundary.
- **Unknown-size discovery**: loop-until-dry (keep spawning finders until K
  consecutive rounds return nothing new) — a while-loop in the script, not
  model discipline.
- **Adversarial verification panels**: N independent skeptics per finding,
  majority verdicts. The judge-panel and perspective-diverse-verify patterns
  in the tool's own documentation are exactly the maker-checker structures
  these skills prescribe.
- **Budget-scaled work**: the `budget` global consumes the user's "+500k"
  style directives with a hard ceiling.
- **Anything above ~5 agents** where wave sizing, concurrency clamping, and
  result collection would otherwise be manual bookkeeping — workflow
  concurrency caps at min(16, cores-2) and queues the rest natively.

Read the Workflow tool's own description in-session for the current API — it
is the living contract; do not trust a memorized snapshot of parameter names.

## What the main seat keeps — unchanged

A workflow is a dispatch lane, not an ownership transfer. Coordinator rules
apply verbatim: specs and pinned contracts go INTO the `agent()` prompts
(with `schema` for structured returns), the main seat reviews results, re-runs
acceptance outside the workflow, and owns git. Pass the matched roster ID as
`agent()`'s `agentType` so each workflow stage runs under its specialist
persona instead of the generic workflow agent; fall back to the default only
when no roster agent fits. Practical notes that recur:
`.filter(Boolean)` worker results (skipped/dead agents return null),
`Date.now()`/`Math.random()` are unavailable inside scripts, use `phase()`
titles matching `meta.phases`, worktree isolation only when agents mutate
files in parallel, and read `<transcriptDir>/journal.jsonl` before diagnosing
an empty result.
