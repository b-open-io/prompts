#!/bin/bash
# Hook: Run lint:fix after file edits, store results for statusline
# Silently runs lint and stores error/warning counts
# Only activates for projects with package.json containing lint:fix script
#
# Installation:
#   1. cp lint-on-save.sh ~/.claude/hooks/lint-on-save.sh
#   2. chmod +x ~/.claude/hooks/lint-on-save.sh
#   3. Add to ~/.claude/settings.json under "hooks":
#      {
#        "hooks": {
#          "PostToolUse": [
#            {
#              "matcher": "Edit|Write",
#              "hooks": [
#                {
#                  "type": "command",
#                  "command": "~/.claude/hooks/lint-on-save.sh"
#                }
#              ]
#            }
#          ]
#        }
#      }

set -e

# Read hook input from stdin
INPUT=$(cat)

# Extract project path from file_path in tool_input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$FILE_PATH" ]]; then
  exit 0  # No file path, skip
fi

# Find project root (look for package.json going up)
PROJECT_DIR=""
SEARCH_DIR=$(dirname "$FILE_PATH")

while [[ "$SEARCH_DIR" != "/" && "$SEARCH_DIR" != "$HOME" ]]; do
  if [[ -f "$SEARCH_DIR/package.json" ]]; then
    PROJECT_DIR="$SEARCH_DIR"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [[ -z "$PROJECT_DIR" ]]; then
  exit 0  # No package.json found
fi

# Check if lint:fix script exists
if ! jq -e '.scripts["lint:fix"]' "$PROJECT_DIR/package.json" > /dev/null 2>&1; then
  exit 0  # No lint:fix script
fi

# Create state directory
STATE_DIR="$HOME/.claude/lint-state"
mkdir -p "$STATE_DIR"

# Get project name for state file
PROJECT_NAME=$(basename "$PROJECT_DIR")
STATE_FILE="$STATE_DIR/$PROJECT_NAME.json"

# Run lint:fix silently and capture output
cd "$PROJECT_DIR"
LINT_OUTPUT=$(bun lint:fix 2>&1 || true)

# Parse lint output for errors and warnings
# Common patterns: "X error(s)", "X warning(s)", "✖ X problems (Y errors, Z warnings)"
ERRORS=0
WARNINGS=0

# Try to extract from "X problems (Y errors, Z warnings)" pattern
if echo "$LINT_OUTPUT" | grep -q "problems"; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ errors?' | head -1 | grep -oE '[0-9]+' || echo "0")
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warnings?' | head -1 | grep -oE '[0-9]+' || echo "0")
fi

# Alternative: count individual error/warning lines (eslint, biome style)
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  # Count lines with "error" severity marker
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*\d+:\d+\s+error' || echo "0")
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*\d+:\d+\s+(warning|warn)' || echo "0")
fi

# Store results
cat > "$STATE_FILE" << EOF
{
  "project": "$PROJECT_NAME",
  "errors": $ERRORS,
  "warnings": $WARNINGS,
  "timestamp": $(date +%s)
}
EOF

exit 0
