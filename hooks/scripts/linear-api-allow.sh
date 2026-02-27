#!/usr/bin/env bash
# linear-api-allow.sh — PreToolUse hook to auto-approve linear-api.sh commands
# Approves bash commands calling our trusted API wrapper.
# Supports single-line calls and multiline with variable assignments.
# Rejects commands with shell injection patterns.
# Event: PreToolUse (matcher: Bash)
# Timeout: 5s
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

[[ -z "$COMMAND" ]] && exit 0

# Check every line: each must be either a variable assignment or a bash linear-api.sh call.
# Anything else (chained commands, pipes, subshells) fails the check.
ALL_SAFE=true
HAS_API_CALL=false

while IFS= read -r line; do
  # Skip empty lines
  [[ -z "$line" ]] && continue
  # Variable assignment: VAR='...' or VAR="..." or VAR=value
  if echo "$line" | grep -qE '^\s*[A-Za-z_][A-Za-z_0-9]*='; then
    continue
  fi
  # bash linear-api.sh call
  if echo "$line" | grep -qE '^\s*bash\s+\S*linear-api\.sh(\s|$)'; then
    HAS_API_CALL=true
    continue
  fi
  # Unknown line — not safe
  ALL_SAFE=false
  break
done <<< "$COMMAND"

if $ALL_SAFE && $HAS_API_CALL; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
fi

exit 0
