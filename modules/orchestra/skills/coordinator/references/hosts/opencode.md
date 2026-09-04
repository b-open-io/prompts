# OpenCode Host

Read this only when OpenCode is the current main session.

The main identifies this host and passes `BOPEN_HOST_HARNESS=opencode` to tools
that require an explicit host marker. Do not infer the host from inherited
`OPENCODE` variables. Prefer native OpenCode agents
from .opencode/agent/, .opencode/agents/, or opencode.json for specialist
judgment and context-bound work. For routine bounded implementation, follow
Coordinator's cheaper-worker default and pin the selected provider/model.
Skills may be discovered from native locations and .claude/skills/.

The --agent option selects a primary or all-mode agent. It does not directly
start an agent declared with mode: subagent. A headless primary session can
invoke a child with an @mention; verify a child marker in the captured output
before claiming delegation.

OpenCode has no native multi-stage workflow engine. The main sequences barriers
and applies the shared dispatch contract. When OpenCode can invoke a real child
with an `@mention`, use that child as the visible controller for an external
worker; require child-marker evidence. The controller supervises the selected
CLI lane and must not implement the ticket itself. Hooks are plugin event
handlers rather than a portable hooks file.

For an OpenCode worker, read [the OpenCode worker guide](../workers/opencode.md).
For an external shell-out, read only the chosen guide:

- [Grok CLI](../workers/grok.md)
- [Codex, Sol, or Luna](../workers/codex.md)
- [Muse Code](../workers/muse.md)

Always resolve the provider behind a pinned provider/model before disclosing
where repository content will go.
