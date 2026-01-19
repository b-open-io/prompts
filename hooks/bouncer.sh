#!/bin/bash
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Dangerous git commands that can destroy uncommitted work
DANGEROUS_PATTERNS=(
  "git checkout --"
  "git checkout -f"
  "git checkout -- ."
  "git restore --"
  "git restore -s"
  "git reset --hard"
  "git reset HEAD --"
  "git clean -f"
  "git stash drop"
  "git stash clear"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if [[ "$command" == *"$pattern"* ]]; then
    cat >&2 << BLOCKED
{
  "hookSpecificOutput": {
    "permissionDecision": "deny"
  },
  "systemMessage": "BLOCKED: This command can destroy uncommitted work. Pattern matched: '$pattern'. Ask the user for explicit permission before running destructive git commands."
}
BLOCKED
    exit 2
  fi
done

# Also catch git checkout with file paths (git checkout -- file.txt)
if echo "$command" | grep -qE 'git (checkout|restore)\s+(--)?\s*[^-]'; then
  # Check if it looks like checking out files (not branches)
  if echo "$command" | grep -qE 'git (checkout|restore)\s+--\s+\S'; then
    cat >&2 << BLOCKED
{
  "hookSpecificOutput": {
    "permissionDecision": "deny"
  },
  "systemMessage": "BLOCKED: 'git checkout/restore -- <file>' discards uncommitted changes. This is NEVER allowed without explicit user permission in the current message."
}
BLOCKED
    exit 2
  fi
fi

# Allow other commands
exit 0
