# Claude CLI from Codex

Use this lane for a context-clean Claude opinion from a Codex main. Preflight
`command -v claude`, `claude --version`, and `claude auth status`. Prepare the
complete consult in a file and feed it over stdin:

```bash
ADVISOR_MODEL="${BOPEN_ADVISOR_MODEL:-claude-opus-5-5}"
PROMPT_FILE="/absolute/path/to/prepared-advisor-consult.md"
COMM_FILE="${HOME}/.claude/communication.md"

case "$ADVISOR_MODEL" in
  *[Ff][Aa][Bb][Ll][Ee]*) echo "advisor: Fable ($ADVISOR_MODEL) is never an advisor" >&2; exit 2 ;;
  claude-opus-5-5) ;;
  *) echo "advisor: $ADVISOR_MODEL is not an approved Claude advisor model" >&2; exit 2 ;;
esac
test -f "$COMM_FILE" || exit 1
env -u ANTHROPIC_API_KEY claude \
  --print \
  --safe-mode \
  --append-system-prompt-file "$COMM_FILE" \
  --model "$ADVISOR_MODEL" \
  --effort high \
  --permission-mode plan \
  --tools "Read,Grep,Glob" \
  --no-session-persistence \
  < "$PROMPT_FILE"
```

`BOPEN_ADVISOR_MODEL` is checked against an allowlist before it reaches
`--model`: only `claude-opus-5-5` is approved, any Fable ID is rejected by
name, and any other value (an alias such as `opus`, another Claude ID, or a
typo) stops the consult with exit 2 instead of reaching the CLI. Add an ID to
the `case` only after it is approved for advisor use.

`--safe-mode` excludes personal plugins, hooks, memory, and project prompt
customization. The communication file is required so the clean session keeps
the expected communication style.

Removing `ANTHROPIC_API_KEY` deliberately selects the signed-in Claude Code
account. Keep the same authentication lane for preflight and dispatch. If the
user explicitly chooses API billing, omit that prefix and disclose the change.
