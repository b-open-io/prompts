#!/usr/bin/env bash
# Scan for debug artifacts left in source code.
# Outputs JSON to stdout. Always exits 0.
set -euo pipefail

DIR="${1:-.}"
INCLUDE_TESTS=false
[ "${2:-}" = "--include-tests" ] && INCLUDE_TESTS=true

cd "$DIR"

EXCLUDE_DIRS=".git|node_modules|vendor|dist|build|.next|coverage|__pycache__|.venv|bun.lock"
TEST_EXCLUDE=""
if [ "$INCLUDE_TESTS" = false ]; then
  TEST_EXCLUDE='\.test\.|\.spec\.|__tests__|_test\.go|test_'
fi

# Debug patterns per language
JS_PATTERNS='console\.(log|debug|warn|info|trace|dir|table)\s*\(|debugger\b'
PY_PATTERNS='print\s*\(|breakpoint\s*\(|pdb\.set_trace'
GO_PATTERNS='fmt\.Print(ln|f)?\s*\('

findings=""
count=0

add_finding() {
  local file="$1" line="$2" snippet="$3" lang="$4"
  snippet=$(echo "$snippet" | head -c 120 | sed 's/"/\\"/g' | tr '\n' ' ')
  [ $count -gt 0 ] && findings="$findings,"
  findings="$findings
    {\"file\": \"$file\", \"line\": $line, \"snippet\": \"$snippet\", \"language\": \"$lang\"}"
  count=$((count + 1))
}

# Scan JS/TS
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  add_finding "$file" "$line" "$snippet" "javascript"
done < <(grep -rnE "$JS_PATTERNS" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' . 2>/dev/null | grep -vE "($EXCLUDE_DIRS)" | { [ -n "$TEST_EXCLUDE" ] && grep -vE "$TEST_EXCLUDE" || cat; } | head -50 || true)

# Scan Python
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  add_finding "$file" "$line" "$snippet" "python"
done < <(grep -rnE "$PY_PATTERNS" --include='*.py' . 2>/dev/null | grep -vE "($EXCLUDE_DIRS)" | { [ -n "$TEST_EXCLUDE" ] && grep -vE "$TEST_EXCLUDE" || cat; } | head -50 || true)

# Scan Go
while IFS= read -r match; do
  [ -z "$match" ] && continue
  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3-)
  add_finding "$file" "$line" "$snippet" "go"
done < <(grep -rnE "$GO_PATTERNS" --include='*.go' . 2>/dev/null | grep -vE "($EXCLUDE_DIRS)" | { [ -n "$TEST_EXCLUDE" ] && grep -vE "$TEST_EXCLUDE" || cat; } | head -50 || true)

cat <<EOF
{
  "scan": "debug",
  "directory": "$DIR",
  "include_tests": $INCLUDE_TESTS,
  "findings": [$findings
  ],
  "count": $count
}
EOF
