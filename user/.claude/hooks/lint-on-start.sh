#!/bin/bash
# Hook: Run lint check on session start to populate initial lint state
# Supports Node.js (package.json) and Go (go.mod) projects
# Updated: 2025-01-17 - supports Node.js and Go projects

set -e

# Read hook input from stdin
INPUT=$(cat)

# Get cwd from session start
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

if [[ -z "$PROJECT_DIR" ]]; then
  exit 0
fi

# Determine project type
PROJECT_TYPE=""
LINT_SCRIPT=""

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  PROJECT_TYPE="node"
  # Check if lint script exists (prefer lint, fallback to lint:fix)
  if jq -e '.scripts["lint"]' "$PROJECT_DIR/package.json" > /dev/null 2>&1; then
    LINT_SCRIPT="lint"
  elif jq -e '.scripts["lint:fix"]' "$PROJECT_DIR/package.json" > /dev/null 2>&1; then
    LINT_SCRIPT="lint:fix"
  else
    exit 0  # No lint script
  fi
elif [[ -f "$PROJECT_DIR/go.mod" ]]; then
  PROJECT_TYPE="go"
  if ! command -v golangci-lint &> /dev/null; then
    exit 0  # golangci-lint not installed
  fi
  LINT_SCRIPT="golangci-lint"
else
  exit 0  # Not a supported project type
fi

# Create state directory
STATE_DIR="$HOME/.claude/lint-state"
mkdir -p "$STATE_DIR"

# Get project name for state file
PROJECT_NAME=$(basename "$PROJECT_DIR")
STATE_FILE="$STATE_DIR/$PROJECT_NAME.json"

# Run lint silently and capture output
cd "$PROJECT_DIR"

if [[ "$PROJECT_TYPE" == "node" ]]; then
  LINT_OUTPUT=$(bun $LINT_SCRIPT 2>&1 || true)
elif [[ "$PROJECT_TYPE" == "go" ]]; then
  LINT_OUTPUT=$(golangci-lint run 2>&1 || true)
fi

# Parse lint output for errors and warnings
ERRORS=0
WARNINGS=0

# Try Biome format: "Found X errors." / "Found X warnings."
if echo "$LINT_OUTPUT" | grep -q "Found.*errors"; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -oE 'Found [0-9]+ errors' | grep -oE '[0-9]+' | head -1 || echo "0")
fi
if echo "$LINT_OUTPUT" | grep -q "Found.*warnings"; then
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE 'Found [0-9]+ warnings' | grep -oE '[0-9]+' | head -1 || echo "0")
fi

# Try ESLint summary format: "X problems (Y errors, Z warnings)"
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  if echo "$LINT_OUTPUT" | grep -q "problems"; then
    ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ errors?' | head -1 | grep -oE '[0-9]+' || echo "0")
    WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warnings?' | head -1 | grep -oE '[0-9]+' || echo "0")
  fi
fi

# ESLint line-by-line format: "123:45  Error:" or "123:45  Warning:"
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" ]]; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*[0-9]+:[0-9]+\s+Error:' || echo "0")
  WARNINGS=$(echo "$LINT_OUTPUT" | grep -cE '^\s*[0-9]+:[0-9]+\s+Warning:' || echo "0")
fi

# golangci-lint format: "file.go:line:col: message (linter)"
if [[ "$ERRORS" == "0" && "$WARNINGS" == "0" && "$PROJECT_TYPE" == "go" ]]; then
  ERRORS=$(echo "$LINT_OUTPUT" | grep -cE '^[^:]+\.go:[0-9]+:[0-9]+:' || echo "0")
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
