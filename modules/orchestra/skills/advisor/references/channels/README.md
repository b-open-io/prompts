# Advisor channels

Choose one channel and load only its guide:

- [native-claude.md](native-claude.md) — Claude's native advisor or a
  read-only premium Claude subagent
- [fable-cli.md](fable-cli.md) — a clean Claude CLI consult from a Codex main
- [codex-cli.md](codex-cli.md) — a read-only `gpt-6-astra` consult via Codex CLI from any host,
  including Codex itself
- [opencode.md](opencode.md) — a read-only OpenCode subagent consult

Recommend `gpt-6-astra` via Codex CLI for strong general-purpose advice when
that lane is available; the main framework does not restrict this choice.
Honor explicit preferences for another model or a native advisor. Use a repo-aware
channel when the advisor must inspect files. If several channels are viable
and the user has not expressed a preference, recommend one and ask once.

Never silently substitute a provider, model, authentication lane, primary
agent, or write-capable process.
