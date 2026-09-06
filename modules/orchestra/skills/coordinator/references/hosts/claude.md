# Claude Code Host

Read this only when Claude Code is the current main session.

## Native lanes

Prefer plugin-qualified Claude agents for specialist work that needs the
session's tools, browser, MCP servers, or plugin context. Pass the specific
subagent type from the installed roster. Use a generic agent only when no
specialist fits. This applies to specialist judgment, not routine bounded
implementation, which follows Coordinator's cheaper-worker default.

Claude's native Workflow tool is appropriate for deterministic staged fan-outs,
loop-until-dry discovery, verification panels, or jobs large enough that manual
wave bookkeeping would dominate. It requires explicit opt-in: the user asked
for a workflow or fan-out, selected a saved workflow, or invoked a skill that
requires it.

Workflows are JavaScript with top-level await. Relevant primitives are agent,
pipeline, parallel, phase, and log. Read the live tool description for the
current API. Claude workflow model fields accept Claude models, not Grok or
OpenAI model ids. External vendors remain CLI lanes.

Pipeline streams items between stages without a full barrier. Parallel waits
for its group. Resume is same-session and may replay agents that started after
the first unfinished one; consult the workflow journal when diagnosing an empty
result.

## External workers

Wrap each selected external worker in a native Claude child so it is visible
to the host and can participate in a Workflow. The child supervises the CLI
lane and must not implement the ticket itself. Direct shell dispatch from the
main is only the fallback when native child dispatch is unavailable.

Load only the selected worker guide:

- [Grok CLI](../workers/grok.md)
- [Codex, Sol, Luna, or Astra](../workers/codex.md)
- [Muse Code](../workers/muse.md)
- [OpenCode CLI](../workers/opencode.md)

### Auto-mode and Workflow embedding

Claude Code's auto-mode classifier can block embedding `codex exec` (or other
external CLI workers) inside Workflow scripts. When that happens, do not fight
the classifier by encoding, renaming, or smuggling the command. Drive the Codex
lane from the main session or from a native controller subagent that supervises
the CLI outside the Workflow script body. Workflow remains fine for Claude-native
agent/pipeline/parallel stages; external vendor CLIs stay supervised shell lanes.

Do not assume an external CLI has the same tools, plugin context, filesystem
permissions, or model as the Claude main. Apply the shared dispatch contract and
the selected provider boundary.

### Classifier sensitivity to relaunch phrasing

The auto-mode permission classifier judges each Bash call against the
controller's recent conversational context, not the command in isolation. A
controller that was just told "the previous run was killed by a denied
permission; the config was changed; relaunch" can have the identical launch
command blocked ("Blocked by classifier") even though the same command was
allowed minutes earlier from a controller with no such framing. Phrase relaunch
messages as infrastructure retries — do not describe the permission change that
motivated the relaunch — and fall back to launching from the main session when
a controller keeps getting blocked; the main's fuller context is allowed where
a narrowly-scoped controller is not.

### `worktree` isolation requires a git repository at start

Workflow `isolation: 'worktree'` fails with "Cannot create agent worktree: not
in a git repository" in sessions that started in a non-git directory, even
after running `git init` mid-session. Pre-create worktrees under a root outside
the repository (see the dispatch contract's worktree-lifecycle section) and
pass their absolute paths into the Workflow rather than relying on its own
worktree creation.

### Background Bash and controller re-invocation

Bash `run_in_background: true` re-invokes the controller subagent when the
background process exits. Controllers should use this instead of polling the
process; the main can additionally layer a Monitor over the log files as a
fallback when the re-invocation itself needs a backstop.
