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
Isolation policy: worktree root/template, branch template, base ref, owner,
cleanup policy (after-approved-merge)

## Graph
- <from> —forward · <label>→ <to>
- <from> —reject · fail · retry→ <to>
- <from> —memory · carried forward→ <to>

## Nodes
- **Work** — Display Name (`plugin:id`)
  model: grok-4.6 · effort: medium
- **Implement B** — SHELL-OUT to codex
  controller: grok · provider/model: openai/gpt-5.6-sol
  disclosure: approved · context: brief, owned paths, test contract
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
  "isolationPolicy": {
    "worktreeRoot": "~/code/worktrees/{repo}-{workflow}-{node}",
    "branchTemplate": "agent/{workflow}-{node}",
    "baseRef": "HEAD",
    "owner": "controller",
    "cleanupPolicy": "after-approved-merge"
  },
  "correctionBudget": { "max": 1, "scope": "review+deterministic-test", "exhausted": "return-to-main" },
  "nodes": [
    {
      "id": "n2",
      "kind": "process",
      "label": "Work",
      "lane": "grok",
      "model": "grok-4.6",
      "effort": "medium",
      "actor": "maker",
      "execution": "native-agent",
      "agentType": null,
      "task": "<prompt>",
      "shell": false,
      "command": null
    },
    {
      "id": "n3",
      "kind": "process",
      "label": "Review",
      "lane": "claude",
      "model": "fable",
      "actor": "reviewer",
      "execution": "read-only-review",
      "shell": true,
      "nativeController": "grok",
      "provider": "anthropic",
      "disclosure": "approved",
      "context": "<exact shared context>",
      "command": "<safe stdin/prompt-file dispatch>"
    }
  ],
  "edges": [
    { "from": "n2", "to": "n3", "label": "result", "kind": "forward" },
    { "from": "n3", "to": "n2", "label": "fail · retry", "kind": "reject" }
  ],
  "gates": [],
  "worktreeLifecycle": ["controller-creates", "maker-edits-owned-paths", "main-integrates-and-verifies", "human-approves", "cleanup-after-merge"],
  "omissions": []
}
```
````

## Field rules

The current canvas emits executable agent steps as `kind: "process"`.
Node `lane` is `grok` | `claude` | `codex` | `opencode`.
A process or gate with `lane` not equal to the host is a shell-out (`shell:
true`). A shell-out is a subprocess of another vendor's CLI. A Grok native
node whose detected model is not `grok-4.6` is converted (`converted: true`)
to a shell-out. A model on no detected lane, or a shell-out whose CLI is not
installed, is omitted from executable `nodes[]` and named under `Not emitted`
with `kind: "node"` and `omit: true` in `omissions[]`. Every incident handoff is
also recorded there with `kind: "edge"`, so removing an unavailable reviewer,
prerequisite, or retry target cannot silently change the visible plan. The
executable `nodes[]` and `edges[]` remain internally runnable. Every shell-out also carries `nativeController`, actual
`provider`/`model`, `disclosure`, and exact `context`; pending/denied disclosure
or a missing boundary field omits that node from executable `nodes[]` and human
Nodes output.

Edge `kind` is `forward` | `reject` | `memory`. `reject` is a return to an
earlier node. `memory` is an across-run loop. The chart without these
edges is a staffing list.

`agentType` must be an id from the installed roster. `model` and `effort`
must come from the detected lists for that lane.

`actor` / `execution` are required to distinguish maker/reviewer agents from
main-controller, deterministic-gate, human-approval, and main-ship actions.
Main-only actions never shell out. `gates[]` and `gateNode` are reserved for a
future deterministic-gate editor and remain empty/null in this release. The
single workflow-level `correctionBudget` covers
review and deterministic tests. Reject edges carry structured `failureOwner`,
`failureCondition`, `correctionBudget: "workflow"`, and
`onExhausted: "return-to-main"`; labels are explanatory only.
The controller still owns deterministic verification and the distinct human
approval before irreversible merge/ship; the canvas does not pretend those are
editable agent nodes yet.

## Translating the spec per harness

Walk **forward** edges for the happy path. Several forward edges from one
node become `parallel()`. A `reject` edge becomes a retry loop (`if
!success` back to the target). `memory` edges are journal / last-run
inputs, not extra agents.

**Claude Code**: native nodes become `agent(prompt, {label, agentType,
model, effort})`. Shell-out nodes become a cheap wrapper whose prompt
runs the CLI. Fan-out uses `parallel()`. `pipeline()` is Claude-only.

**Codex**: no workflow runtime. Translate the forward path into ordered
`codex exec` calls with safe stdin/prompt handling. The caller creates the
worktree cwd and sequences the barrier. A reject edge is a second dispatch after
a failed gate, not a native loop.

**OpenCode**: no workflow runtime and no `opencode exec`. Hosted providers are
external boundaries; local providers remain native. Translate the
forward path into ordered caller-sequenced `opencode run` dispatches
(`opencode run --model "<provider>/<model>" --dir <repo> "<task>"`, real
child-agent work via a primary session invoking `@<agent> <bounded task>`).
Say that sequencing and barriers are the caller's job. A reject edge is a
second dispatch after a failed gate, not a native loop. Never emit a native
DAG, pipeline, or workflow-engine construct for OpenCode.

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

The Visual Coordinator's version-2 serializer emits this shape from the live
canvas. Nodes without an executable boundary are omitted from `nodes[]` and
listed in `omissions[]` together with every affected edge; the human plan
repeats those refusals under `Not emitted`. A native Grok node whose model is detected but not `grok-4.6` is
converted to a Grok CLI shell-out and marked `converted: true`.

Generated commands encode task text before passing it through stdin or
`--prompt-file`; never interpolate backticks, `$()`, backslashes, or newlines
into shell quotes and never use `$(cat "$PROMPT_FILE")`.
