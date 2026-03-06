#!/usr/bin/env bash
# Run all code audit scans in parallel and merge results.
# Outputs unified JSON report to stdout.
set -euo pipefail

DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create temp files for results
secrets_out=$(mktemp)
debug_out=$(mktemp)
todos_out=$(mktemp)
trap 'rm -f "$secrets_out" "$debug_out" "$todos_out"' EXIT

start_time=$(date +%s)

echo "Running parallel code audit on $DIR..." >&2

# Launch all scans in parallel
bash "$SCRIPT_DIR/scan-secrets.sh" "$DIR" > "$secrets_out" 2>/dev/null &
pid1=$!
bash "$SCRIPT_DIR/scan-debug.sh" "$DIR" > "$debug_out" 2>/dev/null &
pid2=$!
bash "$SCRIPT_DIR/scan-todos.sh" "$DIR" > "$todos_out" 2>/dev/null &
pid3=$!

# Wait for all
wait $pid1 $pid2 $pid3 2>/dev/null || true

end_time=$(date +%s)
elapsed=$((end_time - start_time))

# Extract counts (portable — no jq dependency)
secrets_count=$(grep -o '"count": [0-9]*' "$secrets_out" | head -1 | grep -o '[0-9]*' || echo "0")
debug_count=$(grep -o '"count": [0-9]*' "$debug_out" | head -1 | grep -o '[0-9]*' || echo "0")
todos_count=$(grep -o '"count": [0-9]*' "$todos_out" | head -1 | grep -o '[0-9]*' || echo "0")
high_priority=$(grep -o '"high_priority_count": [0-9]*' "$todos_out" | grep -o '[0-9]*' || echo "0")

total=$((secrets_count + debug_count + todos_count))

# Read full results
secrets_json=$(cat "$secrets_out")
debug_json=$(cat "$debug_out")
todos_json=$(cat "$todos_out")

cat <<EOF
{
  "audit": "parallel",
  "directory": "$DIR",
  "elapsed_seconds": $elapsed,
  "total_findings": $total,
  "summary": {
    "secrets": $secrets_count,
    "debug_artifacts": $debug_count,
    "todos": $todos_count,
    "high_priority": $high_priority
  },
  "results": {
    "secrets": $secrets_json,
    "debug": $debug_json,
    "todos": $todos_json
  }
}
EOF

echo "Audit complete: $total findings in ${elapsed}s" >&2
