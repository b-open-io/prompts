# Advisor channels

Choose one channel and load only its guide:

- [native-claude.md](native-claude.md) — the default
  `claude-opus-5-5` native advisor or read-only Claude subagent
- [fable-cli.md](fable-cli.md) — a clean Claude CLI consult from a Codex main;
  the filename is legacy and the default model is `claude-opus-5-5`
- [codex-cli.md](codex-cli.md) — an optional read-only Codex-model consult
  from any host, including Codex itself
- [opencode.md](opencode.md) — a read-only OpenCode subagent consult

Recommend `claude-opus-5-5` for strong general-purpose advice. Honor explicit
preferences for another model or channel. Use a repo-aware channel when the
advisor must inspect files. Fable remains available only as an explicit legacy
choice. If several channels are viable and the user has not expressed a
preference, choose the Opus 5.5 path.

Never silently substitute a provider, model, authentication lane, primary
agent, or write-capable process.
