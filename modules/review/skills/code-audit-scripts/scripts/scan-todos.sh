#!/usr/bin/env bash
# Scan for TODO, FIXME, HACK, XXX comments in source code.
# Categorizes by severity. Outputs JSON to stdout. Always exits 0.
set -euo pipefail

DIR="${1:-.}"
cd "$DIR"

EXCLUDE_DIRS=".git|node_modules|vendor|dist|build|.next|coverage|__pycache__|.venv|bun.lock"
PATTERNS='\b(TODO|FIXME|HACK|XXX|WARN|BUG|DEPRECATED)\b'

findings=""
count=0
fixme_count=0
hack_count=0
todo_count=0
other_count=0

while IFS= read -r match; do
  [ -z "$match" ] && continue

  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3- | head -c 150 | sed 's/"/\\"/g' | tr '\n' ' ')

  # Categorize
  category="todo"
  severity="low"
  tag=$(echo "$snippet" | grep -oiE 'TODO|FIXME|HACK|XXX|WARN|BUG|DEPRECATED' | head -1 | tr '[:lower:]' '[:upper:]' || echo "TODO")

  case "$tag" in
    FIXME|BUG)
      category="fixme"
      severity="high"
      fixme_count=$((fixme_count + 1))
      ;;
    HACK|XXX)
      category="hack"
      severity="high"
      hack_count=$((hack_count + 1))
      ;;
    TODO)
      category="todo"
      severity="low"
      todo_count=$((todo_count + 1))
      ;;
    *)
      category="other"
      severity="medium"
      other_count=$((other_count + 1))
      ;;
  esac

  [ $count -gt 0 ] && findings="$findings,"
  findings="$findings
    {\"file\": \"$file\", \"line\": $line, \"tag\": \"$tag\", \"category\": \"$category\", \"severity\": \"$severity\", \"snippet\": \"$snippet\"}"
  count=$((count + 1))
done < <(grep -rnE "$PATTERNS" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rb' --include='*.rs' --include='*.sh' . 2>/dev/null | grep -vE "($EXCLUDE_DIRS)" | head -100 || true)

cat <<EOF
{
  "scan": "todos",
  "directory": "$DIR",
  "findings": [$findings
  ],
  "count": $count,
  "by_category": {
    "fixme": $fixme_count,
    "hack": $hack_count,
    "todo": $todo_count,
    "other": $other_count
  },
  "high_priority_count": $((fixme_count + hack_count))
}
EOF
