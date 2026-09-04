# Codex Host

Read this only when Codex is the current main session.

Prefer installed bopen specialist agents, then built-in worker or explorer
roles as an explicit fallback. Never claim a named persona ran unless that
adapter was actually spawned. Keep orchestration in the main task; the safe
default depth prevents children from recursively creating an uncontrolled
tree.

Codex has native subagent coordination but no first-class workflow script
engine. The main sequences stages and barriers. Use native Codex agents for
work that should stay inside the current runtime; do not launch a second Codex
CLI merely to reproduce a native subagent.

External implementation is optional. Read only the chosen guide:

- [Grok CLI](../workers/grok.md)
- [Muse Code](../workers/muse.md)
- [OpenCode CLI](../workers/opencode.md)

The [Codex CLI guide](../workers/codex.md) is relevant from a Codex main only
when isolation or an explicit user request justifies a separate process.

Native background agents must return the complete deliverable. If the runtime
does not automatically surface final text, instruct the worker to send its
report to the main before going idle. One content-free idle can be followed up;
a second is a failed dispatch.
