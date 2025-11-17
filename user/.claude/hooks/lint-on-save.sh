#!/bin/bash
# Hook: Run lint:fix after file edits, store results for statusline
# Silently runs lint and stores error/warning counts
# Only activates for projects with package.json containing lint:fix script

set -e

# Read hook input from stdin
INPUT=$(cat)

# Extract project path from file_path in tool_input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$FILE_PATH" ]]; then
  exit 0  # No file path, skip
fi

# Find project root (look for package.json or go.mod going up)
PROJECT_DIR=""
PROJECT_TYPE=""  # "node" or "go"
SEARCH_DIR=$(dirname "$FILE_PATH")

while [[ "$SEARCH_DIR" != "/" && "$SEARCH_DIR" != "$HOME" ]]; do
  if [[ -f "$SEARCH_DIR/package.json" ]]; then
    PROJECT_DIR="$SEARCH_DIR"
    PROJECT_TYPE="node"
    break
  elif [[ -f "$SEARCH_DIR/go.mod" ]]; then
    PROJECT_DIR="$SEARCH_DIR"
    PROJECT_TYPE="go"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [[ -z "$PROJECT_DIR" ]]; then
  exit 0  # No project marker found
fi

# Check if lint tool exists for project type
LINT_SCRIPT=""
if [[ "$PROJECT_TYPE" == "node" ]]; then
  if jq -e '.scripts["lint"]' "$PROJECT_DIR/package.json" > /dev/null 2>&1; then
    LINT_SCRIPT="lint"
  elif jq -e '.scripts["lint:fix"]' "$PROJECT_DIR/package.json" > /dev/null 2>&1; then
    LINT_SCRIPT="lint:fix"
  else
    exit 0  # No lint script
  fi
elif [[ "$PROJECT_TYPE" == "go" ]]; then
  if ! command -v golangci-lint &> /dev/null; then
    exit 0  # golangci-lint not installed
  fi
  LINT_SCRIPT="golangci-lint"
fi

# Create state directory
STATE_DIR="$HOME/.claude/lint-state"
mkdir -p "$STATE_DIR"

# Get project name for state file
PROJECT_NAME=$(basename "$PROJECT_DIR")
STATE_FILE="$STATE_DIR/$PROJECT_NAME.json"

# Check cooldown - skip if lint ran within last 60 seconds
if [[ -f "$STATE_FILE" ]]; then
  LAST_RUN=$(jq -r '.timestamp // 0' "$STATE_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_RUN))
  if [[ "$ELAPSED" -lt 60 ]]; then
    exit 0  # Skip, ran recently
  fi
fi

# Run lint silently with timeout (30 seconds max)
# macOS doesn't have timeout, use perl one-liner as fallback
cd "$PROJECT_DIR"

if [[ "$PROJECT_TYPE" == "node" ]]; then
  if command -v timeout &> /dev/null; then
    LINT_OUTPUT=$(timeout 30 bun $LINT_SCRIPT 2>&1 || true)
  else
    # macOS fallback using perl alarm
    LINT_OUTPUT=$(perl -e 'alarm 30; exec @ARGV' bun $LINT_SCRIPT 2>&1 || true)
  fi
elif [[ "$PROJECT_TYPE" == "go" ]]; then
  if command -v timeout &> /dev/null; then
    LINT_OUTPUT=$(timeout 30 golangci-lint run 2>&1 || true)
  else
    LINT_OUTPUT=$(perl -e 'alarm 30; exec @ARGV' golangci-lint run 2>&1 || true)
  fi
fi

# Parse lint output for errors and warnings
# Common patterns: "Found X errors.", "Found X warnings.", "✖ X problems (Y errors, Z warnings)"
ERRORS=0
WARNINGS=0

# Try Biome format: "Found X errors." / "Found X warnings."
if echo "$LINT_OUTPUT" | grep -q "Found.*errors"; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -oE 'Found [0-9]+ errors' | grep -oE '[0-9]+' | head -1 || echo "0")
fi
if echo "$LINT_OUTPUT" | grep -q "Found.*warnings"; then
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE 'Found [0-9]+ warnings' | grep -oE '[0-9]+' | head -1 || echo "0")
fi

# Try ESLint format: "X problems (Y errors, Z warnings)" or "X error(s)"
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  if echo "$LINT_OUTPUT" | grep -q "problems"; then
    ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ errors?' | head -1 | grep -oE '[0-9]+' || echo "0")
    WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warnings?' | head -1 | grep -oE '[0-9]+' || echo "0")
  fi
fi

# Alternative: count individual error/warning lines (Biome style)
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*\d+:\d+\s+error' 2>/dev/null) || ERRORS=0
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*\d+:\d+\s+(warning|warn)' 2>/dev/null) || WARNINGS=0
fi

# ESLint line-by-line format: "123:45  Error:" or "123:45  Warning:"
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*[0-9]+:[0-9]+\s+Error:' || echo "0")
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*[0-9]+:[0-9]+\s+Warning:' || echo "0")
fi

# golangci-lint format: "file.go:line:col: message (linter)"
# Each line with this pattern is an issue (all treated as errors by default)
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" && "$PROJECT_TYPE" == "go" ]]; then
  # Count lines matching go lint pattern
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^[^:]+\.go:[0-9]+:[0-9]+:' || echo "0")
  # golangci-lint doesn't distinguish warnings, all are errors
  WARNINGS=0
fi

# Ensure we have valid numbers
[[ -z "$ERRORS" || ! "$ERRORS" =~ ^[0-9]+$ ]] && ERRORS=0
[[ -z "$WARNINGS" || ! "$WARNINGS" =~ ^[0-9]+$ ]] && WARNINGS=0

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
