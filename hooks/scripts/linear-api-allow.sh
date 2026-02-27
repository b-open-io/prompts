#!/usr/bin/env bash
# linear-api-allow.sh — PreToolUse hook to auto-approve linear-api.sh commands
# Only approves single-line bash commands calling our trusted API wrapper.
# Multi-line commands, chained commands, and anything else still prompt.
# Event: PreToolUse (matcher: Bash)
# Timeout: 5s
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Reject multiline commands — no hidden secondary commands
if [[ "$COMMAND" == *$'\n'* ]]; then
  exit 0
fi

# Auto-approve: single-line bash call to our trusted Linear API wrapper
# Pattern: starts with "bash", path contains "linear-api.sh", followed by args
if echo "$COMMAND" | grep -qE '^\s*bash\s+\S*linear-api\.sh\s'; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
fi

exit 0
