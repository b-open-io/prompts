# Advisor channels

Choose one channel and load only its guide:

- [native-claude.md](native-claude.md) — the default
  `claude-fable-5-2` native advisor or read-only Claude subagent
- [claude-cli.md](claude-cli.md) — a clean Claude CLI consult from a Codex main,
  or a Claude main whose subagent tool cannot pin the full id; the default
  model is `claude-fable-5-2`
- [codex-cli.md](codex-cli.md) — an optional read-only Codex-model consult
  from any host, including Codex itself
- [opencode.md](opencode.md) — a read-only OpenCode subagent consult

Recommend `claude-fable-5-2` for strong general-purpose advice;
`claude-opus-5-5` is the approved cheaper Claude alternative. Honor explicit
preferences for another model or channel. Use a repo-aware channel when the
advisor must inspect files. If several channels are viable and the user has not
expressed a preference, choose the Fable 5.2 path.

When the main session itself runs Fable 5.2, a Fable consult is a context-clean
second read, not a different model. If a different model's view matters, say
so and offer the Codex channel; it runs only after the user selects it
(`BOPEN_CODEX_ADVISOR_MODEL`).

Never silently substitute a provider, model, authentication lane, primary
agent, or write-capable process.
