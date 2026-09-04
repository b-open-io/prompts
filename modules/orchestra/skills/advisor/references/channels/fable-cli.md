# Fable CLI from Codex

Use this lane for a context-clean Claude opinion from a Codex main. Preflight
`command -v claude`, `claude --version`, and `claude auth status`. Prepare the
complete consult in a file and feed it over stdin:

```bash
ADVISOR_MODEL="${BOPEN_ADVISOR_MODEL:-fable}"
PROMPT_FILE="/absolute/path/to/prepared-advisor-consult.md"
COMM_FILE="${HOME}/.claude/communication.md"

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

The `fable` alias selects this lane; it is not a claim about a permanently
latest model. `--safe-mode` excludes personal plugins, hooks, memory, and
project prompt customization. The communication file is required so the clean
session keeps the expected communication style.

Removing `ANTHROPIC_API_KEY` deliberately selects the signed-in Claude Code
account. Keep the same authentication lane for preflight and dispatch. If the
user explicitly chooses API billing, omit that prefix and disclose the change.
