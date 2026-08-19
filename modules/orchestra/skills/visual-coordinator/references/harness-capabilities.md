# What each harness can actually do

Researched July 2026 against installed CLIs, then re-verified 2026-08-13 on
Grok Build 1.0.3 (GROK_AGENT=1), grok 1.0.3, claude 2.1.228, and
codex-cli 0.145.0. Every row is marked with how it was established. Do not let
the canvas offer a control this file does not support — an unbuildable option
in a dropdown is worse than an absent one, because the user configures around
it and the emitted spec fails.

## The single most important constraint

**No host `agent().model` slug is a foreign vendor.** Claude stays Claude.
Codex stays OpenAI-family. Grok 1.0.3 Task slugs are `grok-4.6` and
`grok-4.5` only. Custom ids run through `grok --single -m`, which is a
shell-out node on the canvas.

Claude Code's workflow harness runs Claude agents only. The `Agent` tool's
`model` parameter and subagent `model:` frontmatter accept Claude aliases, full
Claude ids, or `inherit` — nothing else. Codex's non-OpenAI escape hatch
(`--oss`, `--local-provider`) targets local runtimes, not hosted Claude or Grok.

Grok Build's `~/.grok/config.toml` supports `[model."<id>"]` blocks with
`model`, `base_url`, and `env_key`. Quote the table key when the id contains
dots. After `grok models` lists that id, `grok --single -m <id>` runs it.
`workflow` `agent().model` and `spawn_subagent` still reject it. Verified
2026-08-13: quoted `[model."gpt-5.6-sol"]` with `OPENAI_API_KEY` /
`api_backend = "responses"` made `grok --single -m gpt-5.6-sol` return
`native-sol-ok`. A live `workflow` `agent({ model: "gpt-5.6-sol" })` failed
with `Unknown Task.model slug 'gpt-5.6-sol'. Valid model slugs: grok-4.5, grok-4.6.`
An unquoted `[model.gpt-5.6-sol]` becomes nested TOML and Grok offers a
bogus `gpt-5`.

Do not dispatch `grok-4.5`. Inherit `grok-4.6` for Grok-family work. Render
Sol as a Grok-CLI shell-out node (`grok --single -m gpt-5.6-sol`), not as a
native slug.

Therefore a cross-provider step is always one thing: **a shell-out to another
vendor's CLI, wrapped in a step of the host harness.** Render those nodes
visually distinct. They are subprocesses, not orchestrated peers.

## Claude Code — JavaScript workflows

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

## Grok Build — Rhai workflows, native roster agents

Verified 2026-08-13 in a live Grok Build 1.0.3 session (`GROK_AGENT=1`). The
authoring format is public: Rhai scripts via the in-session `workflow` tool,
documented by the Grok-bundled skill at
`~/.grok/bundled/skills/create-workflow/SKILL.md` (`/create-workflow`)
and `~/.grok/docs/user-guide/`. That skill is not in this plugin.

| Capability | Detail |
|---|---|
| Authoring | Rhai. `let meta = #{ name, description, phases }` must be a pure literal |
| Primitives | `agent(prompt, opts)`, `parallel(jobs)` (barrier), `phase(title)`, `log(msg)`, `complete(value)`, `budget()` |
| No `pipeline()` | A later item cannot advance while an earlier one is still running. `parallel()` waits for the whole panel |
| Fan-out | Default `agent_budget` 128 (1–1,024). Live children cap 32 by default; larger panels queue |
| Per-step `agent().model` | `grok-4.6` only. Do not offer `grok-4.5`. Custom ids from `grok models` are Grok-CLI shell-outs |
| Structured output | `opts.output_schema` (JSON Schema map) — supported, same job as Claude `schema` |
| Named agents | `opts.agent_type` is a roster `subagent_type`. Verified: `research:researcher` and `bopen-tools:researcher` both spawn |
| Isolation | `opts.isolation_worktree` — private worktree, no automatic merge |
| Saved workflows | `.grok/workflows/<name>.rhai` (project) or `~/.grok/workflows/<name>.rhai` (user) |
| UI | `/workflow` launches; `/workflows` is the run dashboard |

Host marker for the detector: `GROK_AGENT=1` (this session). `GROK_HOME` /
`GROK_SANDBOX` may also be set. Do not require them.

CLI still confirmed: `-p/--single` (same flag; requires a prompt value),
`--prompt-file` (long briefs), `--verbatim`, `-w/--worktree`,
`--permission-mode` (`default|acceptEdits|auto|dontAsk|bypassPermissions|plan`),
`--sandbox`, `--reasoning-effort`, `grok models`. Implementers use
`acceptEdits`. Reviewers use `plan`. `--best-of-n` is not in 1.0.3 help.
Do not expose it.

xAI's "hundreds of parallel agents" is marketing. The real default budget is
128 logical calls. Do not put "hundreds" on the canvas.

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

# read-only review — do not add acceptEdits
grok --prompt-file <file> -m gpt-5.6-sol \
  --permission-mode plan --sandbox workspace --output-format plain --verbatim

claude --print --safe-mode --append-system-prompt-file "$HOME/.claude/communication.md" \
  --model "${BOPEN_ADVISOR_MODEL:-fable}" \
  --permission-mode plan --tools "Read,Grep,Glob" --no-session-persistence
```

Two caveats worth putting in front of the user:

An external CLI's stdout does **not** stream into the host's progress view. A
wrapper node must emit its own checkpoint summaries or the run looks stalled.

Make the wrapping agent the cheapest tier that can supervise — the real spend is
in the wrapped process, not the wrapper.

## What the canvas must never claim

1. That a Claude workflow step can run a Grok or GPT model natively. It cannot.
2. That a Grok native node can run an id `grok models` does not list. Register it first, or emit a shell-out.
3. That Codex has a workflow. It has subagents.
4. That "hundreds of parallel agents" is a Grok specification. Default budget is 128.
5. That a resumed Claude workflow preserves all completed agents. See the replay rule.
6. That Grok has `pipeline()`. It has barrier `parallel()` only.
7. That `/create-workflow` exists on Claude or Codex. It is a Grok-bundled skill only.
