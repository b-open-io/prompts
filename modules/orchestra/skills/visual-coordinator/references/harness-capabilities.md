# What each harness can actually do

Researched July 2026 against installed CLIs, then re-verified 2026-08-13 on
Grok Build 1.0.13, grok 1.0.13, claude 2.1.228, and
codex-cli 0.145.0. Every row is marked with how it was established. Do not let
the canvas offer a control this file does not support — an unbuildable option
in a dropdown is worse than an absent one, because the user configures around
it and the emitted spec fails.

## The single most important constraint

**No host `agent().model` slug is a foreign vendor.** Claude stays Claude.
Codex stays OpenAI-family. Grok 1.0.13 task slugs are `grok-4.6` and
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
| Isolation | `opts.isolation: 'worktree'` per agent; controller owns predictable worktree/branch lifecycle |
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

Verified 2026-09-04 with Grok Build 1.0.13 (`grok --version`). The
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
| Isolation | `opts.isolation_worktree` — private worktree, no automatic merge; preserve the caller's worktree cwd and clean up only after approved merge |
| Saved workflows | `.grok/workflows/<name>.rhai` (project) or `~/.grok/workflows/<name>.rhai` (user) |
| UI | `/workflow` launches; `/workflows` is the run dashboard |

The main passes its known host as `BOPEN_HOST_HARNESS=grok`. The detector
validates that marker; it never infers the host from system-wide processes or
inherited `GROK_HOME`/`GROK_SANDBOX` configuration. Without an explicit valid
marker, report the host as unknown and refuse executable native assumptions.

CLI still confirmed: `-p/--single` (same flag; requires a prompt value),
`--prompt-file` (long briefs), `--verbatim`, `-w/--worktree`,
`--permission-mode` (`default|acceptEdits|auto|dontAsk|bypassPermissions|plan`),
`--sandbox`, `--reasoning-effort`, `grok models`. Implementers use
`acceptEdits`. Reviewers use `plan`. `--best-of-n` is not in 1.0.13 help.
Do not expose it.

xAI's "hundreds of parallel agents" is marketing. The real default budget is
128 logical calls. Do not put "hundreds" on the canvas.

## Codex — subagents, no workflows

`codex --help` has no workflow, pipeline, or DAG verb. `codex exec` is
single-shot: one prompt, one run, no phases.

| Capability | Detail |
|---|---|
| Orchestration | Subagent spawn only, on explicit request or an AGENTS.md/skill directive; caller creates worktrees when selected |
| Concurrency | Host-configured. Inspect the current runtime/config schema; do not assume a fixed default |
| Custom agents | `~/.codex/agents/*.toml`, requiring `name`, `description`, `developer_instructions` |
| Per-subagent model | Supported per OpenAI docs, though every verified example stays OpenAI-family |
| Sandbox | `-s {read-only\|workspace-write\|danger-full-access}` |
| Approval | `-a {untrusted\|on-request\|never}` |

**Render Codex as a flat subagent roster, not a pipeline.** A DAG canvas for
Codex would imply sequencing machinery that does not exist.

## OpenCode — subagents + `opencode run`, no workflows

Verified 2026-09-03 against `opencode` 1.18.20 (`opencode run --help`,
live docs at `opencode.ai/docs`). OpenCode has no workflow, pipeline, or DAG
verb and no hooks file. `opencode run` is single-shot: one prompt, one run,
no phases. There is no `opencode exec`.

| Capability | Detail |
|---|---|
| Orchestration | Primary-agent `--agent <name>` plus `@mention` child invocation, caller-sequenced `opencode run` (no native multi-stage workflow engine); caller creates worktrees when selected |
| Headless | `opencode run --model "<provider>/<model>" --dir <repo> "@general <bounded task>"` (positional message, stdin prepended, `-f/--file` attachments, `--dir` cwd, `--format json` for scripting, `--attach <server>` to reuse `opencode serve`, `--auto` to auto-approve non-denied permissions) |
| Custom agents | `.opencode/agent(s)/<name>.md` (project) or `~/.config/opencode/agent(s)/` (global); filename is the agent name, body is the prompt; `mode: subagent`, `permission:` per agent. Inline `agent:{}` in `opencode.json` also works |
| Per-agent model | `provider/model` refs (`-m/--model`, per-agent `model:`, per-command `model:`). Subagents without explicit `model` inherit the invoker's model |
| Custom providers | `provider:{}` blocks in `opencode.json` (`npm: @ai-sdk/openai-compatible`, `baseURL` ending at `/v1`, key via `{env:VAR}`); verify with `opencode models <provider>` |
| Skills | Drop-in `SKILL.md` — OpenCode also reads `.claude/skills/` and `.agents/skills/`; `name` must equal the directory name |
| Hooks | No hooks file — plugin event handlers (`.opencode/plugin(s)/*.ts`, `tool.execute.before/after`, `permission.asked`, `session.*`) |
| Commands | `.opencode/command(s)/<name>.md`; headless via `opencode run --command <name>` |

**Render OpenCode as a flat subagent roster plus `opencode run` shell-out
nodes, not a pipeline.** Same rule as Codex. Parallelism is caller-managed
waves and barriers: the caller sequences `opencode run` dispatches and waits
for the whole panel. OpenCode has no native `parallel()`, `pipeline()`, DAG,
or multi-stage workflow engine; a reject-back edge is a second caller
dispatch, not a native loop.

The main passes its known host as `BOPEN_HOST_HARNESS=opencode`. Inherited
`OPENCODE` variables alone are not sufficient.

## Model identifiers

Discover rather than assume; invoke `scripts/detect-harness.sh` with the
main-known `BOPEN_HOST_HARNESS` value.

- **Claude**: `opus`, `sonnet`, `haiku`, `fable`, `inherit`, or full ids like
  `claude-opus-5`. Effort `low|medium|high|xhigh|max`.
- **Codex**: whatever `model =` says in `~/.codex/config.toml`, plus
  `model_reasoning_effort`. There is no enumeration command; the config is the
  truth. The in-app picker has lagged behind what `-m` accepts.
- **Grok**: whatever `grok models` prints for the authenticated account, plus
  any custom `[model.<alias>]` the user registered.
- **OpenCode**: whatever `opencode models <provider>` prints for the configured
  providers, referenced as `provider/model`. Custom Muse Spark / Luna lanes are
  `provider:{}` blocks in `opencode.json` — never assume the id without listing it.

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

# opencode worker — no `opencode exec` exists; `opencode run` is the entrypoint.
# `--agent <name>` selects a primary/all-mode agent, not a `mode: subagent`
# agent (1.18.20 warns and falls back to the default primary agent).
# A real child invocation is a primary session invoking the named child.
opencode run --model "<provider>/<model>" --dir <repo> "@general <bounded task>" \
  > /tmp/dispatch-<id>.log 2>&1 &
# Verify models with `opencode models <provider>`; live-catalog-confirmed
# authenticated OpenCode Go lane (training-eligible, not
# universal/permanent): `opencode-go/muse-spark-1.3-contributor`.
# Require dispatch evidence: a child marker such as `General Agent` — a
# primary `build` line alone does not prove delegation. A subagent without
# its own `model` inherits the parent model.
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
4. That OpenCode has a workflow or an `exec` subcommand. It has subagents and `opencode run`.
5. That "hundreds of parallel agents" is a Grok specification. Default budget is 128.
6. That a resumed Claude workflow preserves all completed agents. See the replay rule.
7. That Grok has `pipeline()`. It has barrier `parallel()` only.
8. That `/create-workflow` exists on Claude, Codex, or OpenCode. It is a Grok-bundled skill only.
