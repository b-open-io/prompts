#!/bin/bash
# Claude Code Status Line - Shows last edited project in ~/code/
# Reads transcript to find most recent file operations
#
# Installation:
#   1. cp statusline.sh ~/.claude/statusline.sh
#   2. chmod +x ~/.claude/statusline.sh
#   3. Add to ~/.claude/settings.json:
#      {
#        "statusLine": {
#          "type": "command",
#          "command": "~/.claude/statusline.sh"
#        }
#      }

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract session-specific transcript path
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

PROJECT=""

# Configure your code directory here (default: ~/code)
CODE_DIR="${CODE_DIR:-$HOME/code}"

# Verify transcript belongs to this session (sanity check)
if [[ -n "$TRANSCRIPT" && -n "$SESSION_ID" ]]; then
  # Transcript filename should contain or relate to session
  # Only read if transcript file exists and is recent
  if [[ ! -f "$TRANSCRIPT" ]]; then
    TRANSCRIPT=""
  fi
fi

if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  # Get last 100 lines of transcript, find tool_use entries only
  # Extract paths from actual tool inputs (file_path, command), not prose
  PROJECT=$(tail -100 "$TRANSCRIPT" 2>/dev/null | \
    jq -r 'select(.message.content) | .message.content[] | select(.type == "tool_use") | .input | to_entries[] | .value' 2>/dev/null | \
    grep -oE "${CODE_DIR}/[a-zA-Z0-9_-]+/" | \
    tail -1 | \
    sed "s|${CODE_DIR}/||; s|/\$||")
fi

# Fallback: show cwd-based project if no recent file ops
if [[ -z "$PROJECT" ]]; then
  CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
  if [[ "$CWD" =~ ^${CODE_DIR}/([^/]+) ]]; then
    PROJECT="${BASH_REMATCH[1]}"
  fi
fi

# Check for lint status
LINT_INFO=""
if [[ -n "$PROJECT" ]]; then
  LINT_STATE="$HOME/.claude/lint-state/$PROJECT.json"
  if [[ -f "$LINT_STATE" ]]; then
    ERRORS=$(jq -r '.errors // 0' "$LINT_STATE" 2>/dev/null)
    WARNINGS=$(jq -r '.warnings // 0' "$LINT_STATE" 2>/dev/null)

    if [[ "$ERRORS" -gt 0 || "$WARNINGS" -gt 0 ]]; then
      if [[ "$ERRORS" -gt 0 && "$WARNINGS" -gt 0 ]]; then
        LINT_INFO=" | ❌ $ERRORS ⚠️  $WARNINGS"
      elif [[ "$ERRORS" -gt 0 ]]; then
        LINT_INFO=" | ❌ $ERRORS"
      else
        LINT_INFO=" | ⚠️  $WARNINGS"
      fi
    else
      LINT_INFO=" | ✅"
    fi
  fi
fi

# Format output
if [[ -n "$PROJECT" ]]; then
  echo "📁 $PROJECT$LINT_INFO"
else
  echo "📁 ~/code"
fi
