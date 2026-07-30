# What each harness can actually do

Researched July 2026 against installed CLIs (claude 2.1.220, codex-cli 0.145.0,
grok 0.2.111), official docs, and a real persisted workflow run on disk. Every
row is marked with how it was established. Do not let the canvas offer a control
this file does not support — an unbuildable option in a dropdown is worse than
an absent one, because the user configures around it and the emitted spec fails.

## The single most important constraint

**No harness runs another vendor's model as a native workflow or subagent step.**

Claude Code's workflow harness runs Claude agents only. The `Agent` tool's
`model` parameter and subagent `model:` frontmatter accept Claude aliases, full
Claude ids, or `inherit` — nothing else. Codex's non-OpenAI escape hatch
(`--oss`, `--local-provider`) targets local runtimes, not hosted Claude or Grok.

The one exception, and it is partial: Grok Build's `~/.grok/config.toml`
supports `[model.<alias>]` blocks with `model`, `base_url`, and `env_key`,
letting a **session** target any OpenAI-compatible endpoint. Whether a single
subagent or workflow step can pick a different alias than the session default is
**unverified**. Treat it as session-level only.

Therefore a cross-provider step is always one thing: **a shell-out to another
vendor's CLI, wrapped in a step of the host harness.** Render those nodes
visually distinct. They are subprocesses, not orchestrated peers.

## Claude Code — the only harness with a faithful editable workflow

Verified against official docs and a real persisted run.

| Capability | Detail |
|---|---|
| Authoring | JavaScript, top-level `await`, written by Claude not the user |
| Primitives | `agent(prompt, opts)`, `pipeline(items, ...stages)`, `parallel(thunks)`, `phase(title)`, `log(msg)`, globals `args` and `budget` |
| Fan-out | 16 concurrent (runtime-enforced, not configurable), 1,000 agents total per run |
| Sequencing | `pipeline()` has **no barrier** — item A can be in stage 3 while B is in stage 1. `parallel()` **is** a barrier |
| Per-step model | Yes: `opts.model` (`opus`/`sonnet`/`haiku`/`fable`/full id/`inherit`) and `opts.effort` (`low`…`max`) |
| Structured output | `opts.schema` (JSON Schema) forces a validated object return |
| Named agents | `opts.agentType` uses a roster `subagent_type`, inheriting its tools and model |
| Isolation | `opts.isolation: 'worktree'` per agent; expensive, only when agents write the same paths |
| Resume | Same session only. See the replay rule below |
| Persistence | Script at `~/.claude/projects/<hash>/<session>/workflows/scripts/`; run state JSON alongside |
| Saved workflows | `.claude/workflows/` (project) or `~/.claude/workflows/` (personal); plugin `workflows/` dir namespaces as `/<plugin>:<name>` |

**The replay rule, which surprises people.** An agent still running when a run
stops is not cached and reruns. Replay follows *start order*: every agent that
started after the first unfinished one also reruns, even if it had completed.
A workflow of many small fanned-out agents therefore preserves far more progress
across a resume than one with a few long agents. Surface this when a design has
long-running nodes.

**Budget pools are separate.** Agents spawned by `agent()` inside a workflow do
not count against session subagent limits; workflows have their own per-run cap.

## Grok Build — real fan-out, undocumented workflow format

`grok --help` exposes no top-level `workflow` verb; `/workflow` appears to be an
in-session slash command. xAI's announcement describes orchestration scripts
fanning out across "hundreds of parallel agents" — that is marketing copy, not a
specification, and the authoring format is not public.

Confirmed from the local CLI:

- `-w/--worktree [<NAME>]`, `--worktree-ref`, plus a `grok worktree` subcommand.
  Worktree-per-subagent is a headline feature.
- `--permission-mode` accepts `default|acceptEdits|auto|dontAsk|bypassPermissions|plan`
- `--sandbox <PROFILE>` / `GROK_SANDBOX`
- `--agent`, `--agents <JSON>`, `--no-subagents`
- `--reasoning-effort` / `--effort`: `none|minimal|low|medium|high|xhigh`
- `grok models` enumerates per authenticated account. Always ask; do not hardcode.

**Do not offer a per-node model picker for Grok workflow steps.** The format
that would carry the setting is not published.

`--best-of-n` appears in some older notes but is **not** in this version's help
and could not be verified. Do not expose it.

## Codex — subagents, no workflows

`codex --help` has no workflow, pipeline, or DAG verb. `codex exec` is
single-shot: one prompt, one run, no phases.

| Capability | Detail |
|---|---|
| Orchestration | Subagent spawn only, on explicit request or an AGENTS.md/skill directive |
| Concurrency | `agents.max_concurrent_threads_per_session` (default 6) |
| Depth | `agents.max_depth` (default 1 — no recursive spawning unless raised) |
| Custom agents | `~/.codex/agents/*.toml`, requiring `name`, `description`, `developer_instructions` |
| Per-subagent model | Supported per OpenAI docs, though every verified example stays OpenAI-family |
| Sandbox | `-s {read-only\|workspace-write\|danger-full-access}` |
| Approval | `-a {untrusted\|on-request\|never}` |

**Render Codex as a flat subagent roster, not a pipeline.** A DAG canvas for
Codex would imply sequencing machinery that does not exist.

## Model identifiers

Discover rather than assume; `scripts/detect-harness.sh` does this.

- **Claude**: `opus`, `sonnet`, `haiku`, `fable`, `inherit`, or full ids like
  `claude-opus-5`. Effort `low|medium|high|xhigh|max`.
- **Codex**: whatever `model =` says in `~/.codex/config.toml`, plus
  `model_reasoning_effort`. There is no enumeration command; the config is the
  truth. The in-app picker has lagged behind what `-m` accepts.
- **Grok**: whatever `grok models` prints for the authenticated account, plus
  any custom `[model.<alias>]` the user registered.

## Shell-out invocations for cross-provider nodes

The only mechanism that works from every harness. Capture output to a file —
piping through `tail` truncates the worker's final report irrecoverably.

```bash
codex exec --sandbox workspace-write --cd <repo> "<one-line task>" \
  > /tmp/dispatch-<id>.log 2>&1 &

grok --prompt-file <file> -m "<verified model id>" \
  --permission-mode acceptEdits --sandbox workspace --cwd <repo>

claude -p "<task>"          # from Codex or Grok as host
```

Two caveats worth putting in front of the user:

An external CLI's stdout does **not** stream into the host's progress view. A
wrapper node must emit its own checkpoint summaries or the run looks stalled.

Make the wrapping agent the cheapest tier that can supervise — the real spend is
in the wrapped process, not the wrapper.

## What the canvas must never claim

1. That a Claude workflow step can run a Grok or GPT model natively. It cannot.
2. That a Grok workflow node maps to an editable primitive. The format is not public.
3. That Codex has a workflow. It has subagents.
4. That "hundreds of parallel agents" is a Grok specification. It is a claim.
5. That a resumed Claude workflow preserves all completed agents. See the replay rule.
