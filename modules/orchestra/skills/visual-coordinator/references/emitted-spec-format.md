# The emitted spec

The copy button produces one block of text the user pastes back into the agent.
Its job is to be executable without re-deriving intent — every choice already
made in the canvas, stated once, unambiguously.

Emit **both** a human-readable plan and a machine block. The plan is what the
user re-reads before pasting; the machine block is what the agent parses. They
must not disagree, so generate both from the same canvas state.

The copy block is generated from the **live graph** (`nodes[]` + `edges[]`),
not from a hardcoded example and not from a phase list the user never saw.

## Shape

````
# Workflow: <name>
Host harness: <claude-code|codex|grok|opencode>   (fixed — set by how this session started)
Isolation: <shared-tree|worktree-per-agent>
Concurrency: <n>
cwd: <path>

## Graph
- <from> —forward · <label>→ <to>
- <from> —reject · fail · retry→ <to>
- <from> —memory · carried forward→ <to>

## Nodes
- **Work** — Display Name (`plugin:id`)
  model: grok-4.6 · effort: medium
- **Implement B** — SHELL-OUT to codex
  model: gpt-5.6-sol · effort: medium
  controller: native-worker-2
  provider: OpenAI · disclosure: approved
  context: SPEC file and owned paths only
  command: codex exec ...

## Verification gate
<node id>: <command>

```json
{
  "version": 2,
  "harness": "grok",
  "name": "<name>",
  "isolation": "shared-tree",
  "concurrency": 3,
  "nodes": [
    {
      "id": "n2",
      "kind": "process",
      "label": "Work",
      "lane": "grok",
      "model": "grok-4.6",
      "effort": "medium",
      "agentType": null,
      "controller": "native-worker-2",
      "provider": "OpenAI",
      "disclosure": "approved",
      "context": "SPEC file and owned paths only",
      "task": "<prompt>",
      "shell": false
    },
    {
      "id": "n3",
      "kind": "gate",
      "label": "Gate",
      "lane": "claude",
      "model": "fable",
      "gateCmd": "bun test",
      "shell": true
    }
  ],
  "edges": [
    { "from": "n2", "to": "n3", "label": "result", "kind": "forward" },
    { "from": "n3", "to": "n2", "label": "fail · retry", "kind": "reject" }
  ],
  "gateNode": "n3"
}
```
````

## Field rules

Node `kind` is `source` | `process` | `gate` | `artifact` | `memory`.
A process or gate with `lane` not equal to the host is a shell-out (`shell:
true`). A shell-out is a subprocess of another vendor's CLI. A Grok native
node whose model is not `grok-4.6` is converted (`converted: true`) to a
shell-out. A model on no detected lane, or a shell-out whose CLI is not
installed, is kept in the graph with `omit: true` and named under
`Not emitted`.

Edge `kind` is `forward` | `reject` | `memory`. `reject` is a return to an
earlier node. `memory` is an across-run loop. The chart without these
edges is a staffing list.

`agentType` must be an id from the installed roster. `model` and `effort`
must come from the detected lists for that lane.

`controller` identifies the native child supervising an external process;
`provider` identifies the company receiving the selected context. They are not
the same identity. `disclosure` is `approved` | `not-required` | `pending`, and
`context` states exactly what may cross the boundary. An external node with
pending disclosure is retained for review but emitted with `omit: true`.

`gateNode` points at the gate node. `gateCmd` on that node is the command
that proves the work. Seed a gate if the user did not place one, and say
it was defaulted.

## Translating the spec per harness

Walk **forward** edges for the happy path. Several forward edges from one
node become `parallel()`. A `reject` edge becomes a retry loop (`if
!success` back to the target). `memory` edges are journal / last-run
inputs, not extra agents.

**Claude Code**: native nodes become `agent(prompt, {label, agentType,
model, effort})`. Shell-out nodes become a cheap wrapper whose prompt
runs the CLI. Fan-out uses `parallel()`. `pipeline()` is Claude-only.

**Codex**: no workflow runtime. Translate the forward path into ordered
`codex exec` calls. Say that sequencing is the caller's job. A reject
edge is a second dispatch after a failed gate, not a native loop.

**OpenCode**: no workflow runtime. Translate the forward path into ordered
`opencode run --model "<provider>/<model>" --dir <repo>` calls. A named
`mode: subagent` child is invoked with `@name`, not `--agent`. Require a child
marker before claiming it ran. OpenCode never uses the Grok translation.

**Grok**: emit a Rhai workflow. Follow the bundled `/create-workflow`
skill. Native `agent().model` is `grok-4.6` only. A non-Grok lane is a
Grok-CLI or Claude-CLI shell-out. `parallel(jobs)` is the barrier.
Smoke-check with `{ validate_only: true }` before a real run.

## Refusals

If the user configures something the host cannot do, do not emit it quietly.
Emit the spec without that setting and add a line under the plan:

```
Not emitted: <what> — <why the host cannot do it>
```

The most common case is a foreign model on a native node. Convert it to a
shell-out node and say so, or drop it. Never leave it looking configured.
