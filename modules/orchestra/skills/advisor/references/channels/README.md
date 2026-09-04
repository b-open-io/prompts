# Advisor channels

Choose one channel and load only its guide:

- [native-claude.md](native-claude.md) — Claude's native advisor or a
  read-only premium Claude subagent
- [fable-cli.md](fable-cli.md) — a clean Claude CLI consult from a Codex main
- [codex-cli.md](codex-cli.md) — a read-only Codex consult from another host
- [opencode.md](opencode.md) — a read-only OpenCode subagent consult

Prefer a native advisor when it has the needed evidence. Use a repo-aware
channel when the advisor must inspect files. If several channels are viable
and the user has not expressed a preference, recommend one and ask once.

Never silently substitute a provider, model, authentication lane, primary
agent, or write-capable process.
