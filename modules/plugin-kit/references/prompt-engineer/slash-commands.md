# Slash command reference

Read this reference when a command needs dynamic content, Bash permissions,
settings access, or a structured output contract.

Use `$ARGUMENTS` as the command's input string. Keep inline `!` commands short,
single-line, and safe to run in the target project. Use `@path` references for
files. Put complex analysis in the command's instructions and request a
concise conclusion, assumptions, and validation evidence.

Declare the tools the command actually needs. `Bash(command)` matches an exact
command; `Bash(command:*)` permits arguments. Test referenced commands in the
target host and document access to external directories without silently
changing global settings.

Use XML or Markdown structure when it clarifies inputs, constraints, and
outputs. Add examples only when a zero-shot prompt leaves an observed
ambiguity; begin with one measured example and expand only when evidence
shows it helps. Never request private chain-of-thought or hidden reasoning.

For current command syntax, consult the maintained
[Claude Code documentation](https://code.claude.com/docs/en/commands).
