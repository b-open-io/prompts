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

# Get CWD project (session root)
CWD_PROJECT=""
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
if [[ "$CWD" =~ ^${CODE_DIR}/([^/]+) ]]; then
  CWD_PROJECT="${BASH_REMATCH[1]}"
fi

# Function to get lint info for a project
get_lint_info() {
  local proj="$1"
  local state_file="$HOME/.claude/lint-state/$proj.json"

  if [[ ! -f "$state_file" ]]; then
    echo ""
    return
  fi

  local errors=$(jq -r '.errors // 0' "$state_file" 2>/dev/null || echo "0")
  local warnings=$(jq -r '.warnings // 0' "$state_file" 2>/dev/null || echo "0")

  # Ensure numeric values
  [[ -z "$errors" || ! "$errors" =~ ^[0-9]+$ ]] && errors=0
  [[ -z "$warnings" || ! "$warnings" =~ ^[0-9]+$ ]] && warnings=0

  if [[ "$errors" -gt 0 && "$warnings" -gt 0 ]]; then
    echo " ✗ $errors △ $warnings"
  elif [[ "$errors" -gt 0 ]]; then
    echo " ✗ $errors"
  elif [[ "$warnings" -gt 0 ]]; then
    echo " △ $warnings"
  else
    echo " ✓"
  fi
}

# Format output: lastProject lint (cwd lint)
# Show both last edited and current working directory with their respective lint statuses
if [[ -n "$PROJECT" && -n "$CWD_PROJECT" && "$PROJECT" != "$CWD_PROJECT" ]]; then
  # Last edit was in different project than cwd
  PROJECT_LINT=$(get_lint_info "$PROJECT")
  CWD_LINT=$(get_lint_info "$CWD_PROJECT")
  echo "▸ $PROJECT$PROJECT_LINT ($CWD_PROJECT$CWD_LINT)"
elif [[ -n "$PROJECT" ]]; then
  # Last edit in same project as cwd (or no cwd project)
  PROJECT_LINT=$(get_lint_info "$PROJECT")
  echo "▸ $PROJECT$PROJECT_LINT"
elif [[ -n "$CWD_PROJECT" ]]; then
  # No recent edits, show cwd
  CWD_LINT=$(get_lint_info "$CWD_PROJECT")
  echo "▸ $CWD_PROJECT$CWD_LINT"
else
  echo "▸ ~/code"
fi
