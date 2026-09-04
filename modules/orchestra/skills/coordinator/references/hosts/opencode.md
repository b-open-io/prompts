# OpenCode Host

Read this only when OpenCode is the current main session.

Detect the host from OPENCODE=1 or OPENCODE_PID. Prefer native OpenCode agents
from .opencode/agent/, .opencode/agents/, or opencode.json. Skills may be
discovered from native locations and .claude/skills/.

The --agent option selects a primary or all-mode agent. It does not directly
start an agent declared with mode: subagent. A headless primary session can
invoke a child with an @mention; verify a child marker in the captured output
before claiming delegation.

OpenCode has no native multi-stage workflow engine. The main sequences
opencode run calls, owns barriers, and applies the shared dispatch contract.
Hooks are plugin event handlers rather than a portable hooks file.

For an OpenCode worker, read [the OpenCode worker guide](../workers/opencode.md).
For an external shell-out, read only the chosen guide:

- [Grok CLI](../workers/grok.md)
- [Codex, Sol, or Luna](../workers/codex.md)
- [Muse Code](../workers/muse.md)

Always resolve the provider behind a pinned provider/model before disclosing
where repository content will go.
