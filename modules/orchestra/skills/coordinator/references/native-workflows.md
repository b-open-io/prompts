# Native Workflows

Three hosts ship a first-class workflow engine. Codex and OpenCode do not.

| Host | Tool | Script | Native models | Fan-out primitive |
|---|---|---|---|---|
| Claude Code | `Workflow` | JavaScript | Claude aliases / ids | `pipeline()` (no barrier) and `parallel()` (barrier) |
| Grok Build | `workflow` | Rhai | `workflow` / `spawn_subagent` slugs: `grok-4.6` only (host also lists `grok-4.5`; do not use it). Custom ids work on `grok --single -m`, not on `agent().model` | `parallel()` only — it is a barrier. There is no `pipeline()` |
| Codex | none | — | — | Subagent spawn and `codex exec` sequenced by the caller |
| OpenCode | none | — | `provider/model` refs per agent | Subagent dispatch (`--agent <name>`) and `opencode run` sequenced by the caller |

The check is the session tool set, not memory: the host either exposes `Workflow` / `workflow` or it does not. When it does not, use the coordinator's manual dispatch protocol.

Read the live tool description in-session for parameter names. This file is the routing contract; the tool text is the API.

Do not dispatch `grok-4.5`. Inherit `grok-4.6` for Grok-family work.

## Opt-in

Workflows can spawn dozens of agents.

- **Claude Code**: the runtime requires explicit opt-in (ultracode, the user asking for a workflow/fan-out, a named saved workflow, or a skill whose instructions call for Workflow). Coordinator / wave-coordinator invoked for multi-agent work counts. When the task would merely benefit, describe the shape and cost and ask.
- **Grok Build**: background workflows are on by default (`GROK_WORKFLOWS`, `[workflows] enabled`). Still ask before a large fan-out the user did not request. Authoring lives in the Grok-bundled skill, not this plugin — see `/create-workflow` below.

## When a workflow beats hand-rolled waves

Reach for the native engine when the orchestration has SHAPE — deterministic control flow the model should not hand-execute across many turns:

- Staged fan-outs: find → adversarially verify → synthesize
- Loop-until-dry discovery
- Adversarial verification panels
- Budget-scaled sweeps
- Anything above about five agents where wave bookkeeping would otherwise be manual

On Claude, `pipeline()` lets item A verify while item B is still being found. On Grok, `parallel()` waits for the whole panel; later stages are later `phase()` calls. Do not emit a Claude `pipeline()` into a Grok script.

## Native agents, roster, and models

A workflow is a dispatch lane, not an ownership transfer. Coordinator rules apply: specs go into `agent()` prompts, the main seat reviews, re-runs acceptance, and owns git.

Pass the installed roster id so the stage runs as that specialist:

- Claude: `agentType` (e.g. `review:code-auditor`)
- Grok: `agent_type` (e.g. `research:researcher`). `bopen-tools:<name>` aliases also resolve when that plugin is installed. Verified 2026-08-13 on Grok Build 1.0.3: both `research:researcher` and `bopen-tools:researcher` spawn.

Use `general-purpose` / the default workflow agent only when no roster agent fits, and say so.

### What is native on each host

- **Claude Code** workflow `model` accepts Claude aliases/ids only. People who mix vendors from a Claude main do it as a CLI shell-out (`grok --single`, `codex exec`) or by pointing the whole session at an [LLM gateway](https://code.claude.com/docs/en/llm-gateway). `ANTHROPIC_BASE_URL` changes where the session talks, not which model a single `agent()` step can pick. X posts that show "Fable orchestrating Grok" are the Grok CLI behind a Claude supervisor, not a Claude `agent({ model: "grok-4.6" })` call.
- **Grok Build** splits two lists. `grok models` can include custom `[model."<id>"]` blocks (quote the key when the id contains dots). `workflow` `agent().model` and `spawn_subagent` do **not** — Grok 1.0.3 rejects anything except `grok-4.5` and `grok-4.6` (`Unknown Task.model slug`). Verified 2026-08-13: quoted `[model."gpt-5.6-sol"]` made `grok --single -m gpt-5.6-sol` return `native-sol-ok`, and a live `workflow` `agent({ model: "gpt-5.6-sol" })` failed with that slug error. Inherit `grok-4.6`. Do not pick `grok-4.5`. To run Sol *inside* a native workflow, wrap `grok --single -m gpt-5.6-sol` in a `grok-4.6` supervisor. That is a Grok-harness Sol session, not a Codex CLI, and it shows up as a workflow node.
- **Codex** subagents stay on OpenAI-family models.

An unquoted `[model.gpt-5.6-sol]` is nested TOML (`model.gpt-5`). Grok then shows a bogus `gpt-5` id and xAI 404s it. Quote the key.

## `/create-workflow` is Grok-bundled

`/create-workflow` is not an orchestra command. Grok Build ships it at
`~/.grok/bundled/skills/create-workflow/SKILL.md` and maps that skill name
to the slash command. Claude Code and Codex do not have it. Do not copy the
file into this plugin — the host owns the Rhai dialect, and it updates with
Grok.

On a Grok session, load that bundled skill to author and smoke-check. Then
apply this file's routing rules (native `grok-4.6` only, Sol/Fable as
shell-outs, coordinator ownership). On Claude, author a JavaScript workflow
directly. On Codex and OpenCode, do not author a workflow — sequence
`codex exec` / `opencode run` dispatches from the caller instead.

Verified 2026-08-13 while authoring `fable-sol-review`:

- `validate_only` canned agents return `success: true` and a small empty
  object. Required `output_schema` fields leave later phases with no units.
  Keep schemas optional. Seed `args.units`. Skip `await_user` with
  `args.auto == true` so the smoke-check path reaches Implement and Review.
- Save a cross-repo demo at `~/.grok/workflows/<name>.rhai`. The bundled
  skill defaults to the project `.grok/workflows/` inside a git repo.
- `-p` and `--single` are the same flag and require a prompt value. Long
  briefs use `--prompt-file`. Do not pass `-p` and `--single` together.
- grok 1.0.3 `--permission-mode` values:
  `default|acceptEdits|auto|dontAsk|bypassPermissions|plan`.

## GPT-5.6 Sol as a worker or reviewer

On a Grok host, register Sol so the Grok CLI can run it, then wrap that CLI in a workflow agent. Do not pass `model: "gpt-5.6-sol"` to `agent()` — the host rejects it.

Implement (writes files):

```rhai
agent("Write the brief to a temp file. Run: grok --prompt-file TEMPFILE -m gpt-5.6-sol --permission-mode acceptEdits --sandbox workspace --output-format plain --cwd <repo>. Relay the FINAL REPORT. Do not commit.",
    #{ label: "sol-implement", capability_mode: "execute" });
```

Review (read-only). A missing verdict is unverified, not accept:

```rhai
agent("Write the brief to a temp file. Run: grok --prompt-file TEMPFILE -m gpt-5.6-sol --permission-mode plan --sandbox workspace --output-format plain --verbatim --cwd <repo>. Do not add acceptEdits. Relay verdict accept or reject with evidence. Do not edit.",
    #{ label: "sol-review", capability_mode: "execute" });
```

Fable as a planner from a Grok workflow is also a shell-out, not a native
slug. Wrap `claude --print --safe-mode --append-system-prompt-file
$HOME/.claude/communication.md --model "${BOPEN_ADVISOR_MODEL:-fable}"
--effort high --permission-mode plan --tools "Read,Grep,Glob"
--no-session-persistence` in a `grok-4.6` execute supervisor. `--safe-mode`
drops the STE output style. The append flag puts the communication contract
in the system prompt. If that file is missing, fail. Do not run Fable unsteered.

Register the quoted `[model."gpt-5.6-sol"]` block first and confirm `grok models` lists it. If the id is absent, shell out through Codex instead:

```bash
codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-sol \
  -c model_reasoning_effort="high" \
  "<one-line imperative; details in SPEC-*.md>" \
  > /tmp/dispatch-<id>.log 2>&1 &
```

Preflight `command -v codex`. Verified 2026-08-13: `codex exec -m gpt-5.6-sol` from a Grok session returned the worker line.

`orchestra:claudex` is a zsh alias that runs official Claude Code through CLIProxyAPI onto Sol. It replaces a Claude main seat. It is not a Grok worker and it is not [l3tchupkt/Claudex](https://github.com/l3tchupkt/Claudex) (a leaked Claude Code fork — do not install that).

Inside a native workflow that must still shell out, wrap `codex exec` in a `grok-4.6` supervisor. The wrapper never commits.

## Grok script shape

Grok workflows are Rhai, saved at `.grok/workflows/<name>.rhai` or `~/.grok/workflows/<name>.rhai`. Host API that matters for coordinator:

- `agent(prompt, #{ label, phase, capability_mode, output_schema, agent_type, model, isolation_worktree })`
- `parallel([#{ prompt, label, ... }, ...])` — barrier; failed slots are `()`
- `phase(title)`, `log(msg)`, `complete(value)`
- Default `agent_budget` 128 (1–1,024); live children cap 32 by default

`output_schema` is supported on Grok. Per-node `agent().model` is `grok-4.6` only. Offer Sol as a Grok-CLI wrapper node, not as a `model` slug. Do not offer `grok-4.5`. Worktree isolation does not merge back — the main seat applies the diff.

Author on Grok with bundled `/create-workflow`. Smoke-check with `{ validate_only: true }` and representative `args` (`units` + `auto: true` if the script has `await_user`) before a real run. Progress lives in `/workflows`.

## Claude script shape

JavaScript, top-level `await`. `agent(prompt, { label, phase, agentType, model, effort, schema, isolation })`, `pipeline(items, ...stages)`, `parallel(thunks)`, `phase(title)`, `log(msg)`, globals `args` and `budget`. Concurrency caps at 16. Resume is same-session and follows start-order replay: every agent that started after the first unfinished one reruns. Read `<transcriptDir>/journal.jsonl` before diagnosing an empty result.

## OpenCode dispatch shape (no native workflow)

OpenCode has no workflow primitive. Fan-out is caller-sequenced `opencode run`
invocations, one per unit, with the coordinator owning barriers:

- Native subagents: `.opencode/agent(s)/<name>.md` with `mode: subagent`
  (or `agent:{}` in `opencode.json`); dispatch with `opencode run --agent <name>`.
  Subagents without an explicit `model` inherit the invoker's model.
- Headless lane: `opencode run --model <provider/model> --dir <repo> "<task>"`
  with `--format json` for scripting and `--attach <server>` to reuse a running
  `opencode serve` across dispatches. There is no `opencode exec`.
- Skills are drop-in `SKILL.md` (OpenCode also reads `.claude/skills/` and
  `.agents/skills/`). Hooks have no file equivalent — they are plugin event
  handlers, not a dispatch surface.
- Host marker for the detector: `OPENCODE=1` (`OPENCODE_PID` also set).

## What the main seat keeps

Unchanged on every host: specs and pinned contracts in the prompts, adversarial diff review, acceptance re-run outside the worker, git from here. Filter dead slots (`null` on Claude, `()` on Grok) before synthesis. Missing evidence is not a confirming vote.
