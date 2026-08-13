# Native Workflows

Two hosts ship a first-class workflow engine. Codex does not.

| Host | Tool | Script | Native models | Fan-out primitive |
|---|---|---|---|---|
| Claude Code | `Workflow` | JavaScript | Claude aliases / ids | `pipeline()` (no barrier) and `parallel()` (barrier) |
| Grok Build | `workflow` | Rhai | `grok-4.5`, `grok-4.6` | `parallel()` only — it is a barrier. There is no `pipeline()` |
| Codex | none | — | — | Subagent spawn and `codex exec` sequenced by the caller |

The check is the session tool set, not memory: the host either exposes `Workflow` / `workflow` or it does not. When it does not, use the coordinator's manual dispatch protocol.

Read the live tool description in-session for parameter names. This file is the routing contract; the tool text is the API.

## Opt-in

Workflows can spawn dozens of agents.

- **Claude Code**: the runtime requires explicit opt-in (ultracode, the user asking for a workflow/fan-out, a named saved workflow, or a skill whose instructions call for Workflow). Coordinator / wave-coordinator invoked for multi-agent work counts. When the task would merely benefit, describe the shape and cost and ask.
- **Grok Build**: background workflows are on by default (`GROK_WORKFLOWS`, `[workflows] enabled`). Still ask before a large fan-out the user did not request. Authoring and the Rhai dialect live in `Skill(create-workflow)` and `~/.grok/docs/user-guide/`.

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

**No host runs another vendor's model as a native step.**

- Claude workflow `model` accepts Claude aliases/ids only.
- Grok `spawn_subagent` / workflow `model` accepts `grok-4.6` (inherit/default) and `grok-4.5` (cheaper native worker). `gpt-5.6-sol` is rejected as a native model.
- Codex subagents stay on OpenAI-family models.

## GPT-5.6 Sol as a worker

Sol is a Codex-lane model. From any host, including Grok Build, dispatch it as a shell-out:

```bash
codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-sol \
  -c model_reasoning_effort="high" \
  "<one-line imperative; details in SPEC-*.md>" \
  > /tmp/dispatch-<id>.log 2>&1 &
```

Preflight: `command -v codex` and confirm `model = "gpt-5.6-sol"` in `~/.codex/config.toml` (or pass `-m` after the id is known). Verified 2026-08-13: `codex exec -m gpt-5.6-sol` from a Grok session returned the worker line.

`claudex` is a Claude Code session that bills Sol through a proxy. It replaces the main seat. It is not a Grok worker spawn.

Inside a native workflow, wrap the `codex exec` in a cheap supervisor agent (Claude `haiku` / Grok `grok-4.5`) that writes the SPEC, launches the command, polls the log, and relays the FINAL REPORT. The wrapper never commits.

## Grok script shape

Grok workflows are Rhai, saved at `.grok/workflows/<name>.rhai` or `~/.grok/workflows/<name>.rhai`. Host API that matters for coordinator:

- `agent(prompt, #{ label, phase, capability_mode, output_schema, agent_type, model, isolation_worktree })`
- `parallel([#{ prompt, label, ... }, ...])` — barrier; failed slots are `()`
- `phase(title)`, `log(msg)`, `complete(value)`
- Default `agent_budget` 128 (1–1,024); live children cap 32 by default

`output_schema` is supported on Grok. Per-node `model` is supported and should be offered (`grok-4.5` / `grok-4.6`). Worktree isolation does not merge back — the main seat applies the diff.

Author with `Skill(create-workflow)`. Smoke-check with `{ validate_only: true }` before a real run. Progress lives in `/workflows`.

## Claude script shape

JavaScript, top-level `await`. `agent(prompt, { label, phase, agentType, model, effort, schema, isolation })`, `pipeline(items, ...stages)`, `parallel(thunks)`, `phase(title)`, `log(msg)`, globals `args` and `budget`. Concurrency caps at 16. Resume is same-session and follows start-order replay: every agent that started after the first unfinished one reruns. Read `<transcriptDir>/journal.jsonl` before diagnosing an empty result.

## What the main seat keeps

Unchanged on every host: specs and pinned contracts in the prompts, adversarial diff review, acceptance re-run outside the worker, git from here. Filter dead slots (`null` on Claude, `()` on Grok) before synthesis. Missing evidence is not a confirming vote.
