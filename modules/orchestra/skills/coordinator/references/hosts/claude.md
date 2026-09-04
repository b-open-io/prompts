# Claude Code Host

Read this only when Claude Code is the current main session.

## Native lanes

Prefer plugin-qualified Claude agents for specialist work that needs the
session's tools, browser, MCP servers, or plugin context. Pass the specific
subagent type from the installed roster. Use a generic agent only when no
specialist fits.

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

Load only the selected worker guide:

- [Grok CLI](../workers/grok.md)
- [Codex, Sol, or Luna](../workers/codex.md)
- [Muse Code](../workers/muse.md)
- [OpenCode CLI](../workers/opencode.md)

Do not assume an external CLI has the same tools, plugin context, filesystem
permissions, or model as the Claude main. Apply the shared dispatch contract and
the selected provider boundary.
