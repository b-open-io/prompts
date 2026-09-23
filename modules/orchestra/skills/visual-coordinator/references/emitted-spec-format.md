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
- **Work** — SHELL-OUT to codex
  controller: grok · provider/model: openai/gpt-6-sol · effort: medium
  disclosure: approved · context: brief, owned paths, test contract
  command: codex exec ...
- **Review** — SHELL-OUT to codex (read-only)
  controller: grok · provider/model: openai/gpt-6-sol · effort: xhigh
  disclosure: approved · context: diff, worker report, claims
  command: codex exec --sandbox read-only ...

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
      "lane": "codex",
      "model": "gpt-6-sol",
      "effort": "medium",
      "actor": "maker",
      "execution": "external-provider",
      "agentType": null,
      "task": "<prompt>",
      "shell": true,
      "nativeController": "grok",
      "provider": "openai",
      "disclosure": "approved",
      "context": "<exact shared context>",
      "command": "<safe stdin/prompt-file dispatch>"
    },
    {
      "id": "n3",
      "kind": "process",
      "label": "Review",
      "lane": "codex",
      "model": "gpt-6-sol",
      "effort": "xhigh",
      "actor": "reviewer",
      "execution": "read-only-review",
      "shell": true,
      "nativeController": "grok",
      "provider": "openai",
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
true`). A shell-out is a subprocess of another vendor's CLI. Every native
Grok-lane node except the observed main session — `grok-4.7` included — is
converted (`converted: true`) to a wrapper shell-out and needs an approved
disclosure. A model on no detected lane, or a shell-out whose CLI is not
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
skill. Native `agent().model` is pinned to `grok-4.7` and allowed for worker
nodes only under usage-credit pressure; Grok 4.6 is forbidden. Worker and
review nodes default to `gpt-6-sol` shell-outs.
A non-Grok lane is a
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
repeats those refusals under `Not emitted`. Every native Grok-lane node other
than the observed main session is converted to a wrapper shell-out and marked
`converted: true`.

The serializer runs the same validation that gates Copy. Every validation
issue carries a `scope`: a `node` issue omits that node with the issues as its
reason, and a `graph` issue (cycle, broken edge, live-child cap,
simulation-only host) omits every node, whatever the ids are, so an invalid
canvas never yields a runnable record. Grok-lane shell-outs call the installed
`run-grok-worker.sh` by the absolute path the detector reports as
`grok_worker`, with `--auth` set to the detected `grok_auth`. They
never emit a raw `grok -m` dispatch, and without both they are not executable.
The wrapper checks `BOPEN_USAGE_CREDIT_PRESSURE` when the command runs rather
than baking the credit decision into the export. A node's `provider` is where
its content goes, not which CLI carries it: a Grok-lane shell-out is `xai` only
for a Grok model; a custom id such as `gpt-6-sol` reports the provider behind
its `config.toml` `base_url` (the detector's `grok_model_providers`) or
`unknown`, and its disclosure must name the real destination. The main session
(`actor: "main-controller"`) is the first native coordinator on the host lane
whose model is the observed host main: the detector's `models.<lane>_default`
when reported. A Grok host has no main at all unless the detector reported
`models.grok_default`; bare `grok-4.7` is never assumed, so the Coordinate card
stays empty and fails validation. Other hosts without a reported default use
their first native host-lane coordinator. A Coordinate card edited away from
the observed default is a dispatch: on the Grok lane it becomes a disclosed
wrapper shell-out that needs credit pressure. The observed main alone keeps the
model the detector saw only when that is `grok-4.6` (or an alias resolving to
it); every other version, dispatch, edited card, and inventory choice stays
pinned to `grok-4.7`. That legacy `grok-4.6` main is also the only Grok use
exempt from credit pressure: an observed `grok-4.7` main validates and exports
only under credit pressure. Every other native Grok-lane node
converts to a shell-out whether or not its model is listed, and a Grok dispatch
is never Ready unless the detector's `grok models` listing shows its model. A
custom alias served by xAI, or pointing at a Grok model (`grok_model_targets`),
is held to the same credit gate and `grok-4.7` pin as a `grok-*` id, checked
against the model it points at; an alias for a `gpt-5.6` model is rejected,
observed main included. The detector parses `config.toml` as real TOML, and a
listed custom id is refused unless its entry names both an explicit `model`
and a `base_url` host; an entry is never assumed to serve its own id.
Provider-qualified xAI ids (`xai/…`, `openrouter/x-ai/…`) are Grok: they run
only on the Grok lane, under credit pressure, pinned to `grok-4.7`. The
detector keeps these ids whole. A Grok CLI id named `gpt-6-sol` counts as Sol
only when its entry resolves to `gpt-6-sol` behind a non-xAI host; otherwise it
is never staffed as Sol and is rejected as a Build or Review model. The observed main's pin exemption covers only a resolved
`grok-4.6`; any other off-pin Grok version is rejected like a dispatch. The canvas's
Ready/Copy gate uses the same per-node dispatch plan as the serializer, so it
never reports Ready while the export would drop a node.

Generated commands encode task text before passing it through stdin or
`--prompt-file`; never interpolate backticks, `$()`, backslashes, or newlines
into shell quotes and never use `$(cat "$PROMPT_FILE")`.
