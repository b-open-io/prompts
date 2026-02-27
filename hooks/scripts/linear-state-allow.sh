#!/usr/bin/env bash
# linear-state-allow.sh — PreToolUse hook to auto-approve Read/Write on linear-sync state
# Only approves operations on ~/.claude/linear-sync/ paths.
# Event: PreToolUse (matcher: Read|Write)
# Timeout: 5s
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Normalize ~ and $HOME to absolute path for matching
HOME_DIR="$HOME"
ALLOWED_DIR="$HOME_DIR/.claude/linear-sync/"

# Check if the file path is under ~/.claude/linear-sync/
if [[ "$FILE_PATH" == "$ALLOWED_DIR"* ]] || [[ "$FILE_PATH" == "~/.claude/linear-sync/"* ]]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
fi

exit 0
