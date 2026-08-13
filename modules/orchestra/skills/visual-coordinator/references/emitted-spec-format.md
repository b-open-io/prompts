# The emitted spec

The copy button produces one block of text the user pastes back into the agent.
Its job is to be executable without re-deriving intent — every choice already
made in the canvas, stated once, unambiguously.

Emit **both** a human-readable plan and a machine block. The plan is what the
user re-reads before pasting; the machine block is what the agent parses. They
must not disagree, so generate both from the same canvas state.

## Shape

````
# Workflow: <name>
Host harness: <claude-code|codex|grok>   (fixed — set by how this session started)
Isolation: <shared-tree|worktree-per-agent>
Concurrency: <n>            (Claude caps at 16; Grok live children 32 / budget 128; Codex default 6)

## Phases

### 1. <phase title>
- **<node label>** — <agent display name> (`<subagent_type>`)
  model: <model> · effort: <effort>
  <one line: what this node does>
- **<node label>** — SHELL-OUT to <codex|grok|claude>
  model: <model id>
  command: <exact invocation>
  <one line: what this node does>

### 2. <phase title>
...

## Verification gate
<the exact command that must pass before this is considered done>

```json
{
  "version": 1,
  "harness": "claude-code",
  "name": "<name>",
  "isolation": "shared-tree",
  "concurrency": 16,
  "phases": [
    {
      "title": "<phase title>",
      "mode": "pipeline",
      "nodes": [
        {
          "id": "n1",
          "label": "<node label>",
          "kind": "agent",
          "agentType": "review:code-auditor",
          "model": "sonnet",
          "effort": "medium",
          "task": "<full prompt for this node>",
          "schema": null
        },
        {
          "id": "n2",
          "label": "<node label>",
          "kind": "shell-out",
          "lane": "codex",
          "model": "gpt-5.6-sol",
          "command": "codex exec --sandbox workspace-write --cd <repo> \"…\"",
          "task": "<what to do with its output>"
        }
      ]
    }
  ],
  "gate": "bun test && bunx tsc --noEmit"
}
```
````

## Field rules

`kind` is `agent` or `shell-out`. Nothing else. A shell-out is a subprocess of
another vendor's CLI, never an orchestrated peer, and the distinction must
survive into the emitted spec.

`mode` is `pipeline` or `parallel`. `pipeline` means no barrier between stages —
an item can advance while others lag. `parallel` means a barrier: everything in
the phase completes before the next phase starts. Default to `pipeline` and only
emit `parallel` when a later phase genuinely needs all prior results at once.

`agentType` must be an id from the installed roster, not an invented name.
`scripts/detect-harness.sh` supplies the real list.

`model` and `effort` must come from the detected lists for that lane. Never emit
a Claude model on a Grok node or the reverse.

`schema` carries a JSON Schema when the node must return structured data, or
`null`. Claude workflow nodes (`schema`) and Grok workflow nodes
(`output_schema`) support it. Codex nodes do not.

`gate` is the literal command that proves the work. Emit one even when the user
did not set it — a workflow with no verification is a workflow whose result
nobody can check — and say plainly that it was defaulted.

## Translating the spec per harness

**Claude Code**: the JSON maps directly onto a workflow script. `phases[]`
become `meta.phases` plus `phase()` calls; `mode: pipeline` becomes
`pipeline(items, ...stages)`; `mode: parallel` becomes `parallel(thunks)`;
each `agent` node becomes an `agent(prompt, {label, phase, agentType, model,
effort, schema})` call; each `shell-out` node becomes an `agent()` whose prompt
instructs it to run the command, poll the log, and relay the result — wrapped by
the cheapest model that can supervise.

**Codex**: there is no workflow to generate. Translate phases into an ordered
list of `codex exec` dispatches the host performs turn by turn, respecting
`agents.max_concurrent_threads_per_session`. Say in the emitted plan that
sequencing is enforced by the caller, not by a runtime.

**Grok**: emit a Rhai workflow the `workflow` tool can run. Follow
`Skill(create-workflow)`: `let meta` header, `phase()` titles matching
`meta.phases`, native nodes as `agent(prompt, #{ label, phase, agent_type,
model, output_schema, isolation_worktree, capability_mode })`, shell-out nodes
as a `grok-4.6` supervisor whose prompt runs the composed CLI command
and relays the FINAL REPORT. `mode: parallel` becomes `parallel(jobs)`.
`mode: pipeline` is not available — emit sequential `agent()` calls or a
barrier `parallel()`, and say so under the plan. Native `agent().model`
is `grok-4.6` only. Do not offer `grok-4.5`. A registered `gpt-5.6-sol`
emits as `grok --single -m gpt-5.6-sol` (Grok CLI shell-out), not as
`agent().model`. Smoke-check with `{ validate_only: true }` before a
real run.

## Refusals

If the user configures something the host cannot do, do not emit it quietly.
Emit the spec without that setting and add a line under the plan:

```
Not emitted: <what> — <why the host cannot do it>
```

The most common case is a foreign model on a native node. Convert it to a
shell-out node and say so, or drop it. Never leave it looking configured.
