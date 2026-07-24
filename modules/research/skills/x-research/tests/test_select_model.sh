#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SELECTOR="$SCRIPT_DIR/../scripts/select-model.sh"
RESEARCH="$SCRIPT_DIR/../scripts/research.sh"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

assert_eq() {
  expected=$1
  actual=$2
  label=$3
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: $label: expected '$expected', got '$actual'" >&2
    exit 1
  fi
}

cat >"$TMP_DIR/current.json" <<'JSON'
{
  "data": [
    {"id": "grok-4.3", "aliases": ["grok-4.3-latest", "grok-latest"], "created": 1776384000},
    {"id": "grok-4.5", "aliases": ["grok-4.5-latest", "grok-build-latest"], "created": 1782691200},
    {"id": "grok-imagine-image-quality", "aliases": [], "created": 1783000000}
  ],
  "object": "list"
}
JSON

actual=$(env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.5" "$actual" "automatic selection ignores stale grok-latest alias"

actual=$(XAI_RESEARCH_MODEL=grok-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.5" "$actual" "grok-latest requests automatic selection"

actual=$(XAI_RESEARCH_MODEL=grok-4-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.5" "$actual" "grok-4-latest requests automatic selection"

actual=$(XAI_RESEARCH_MODEL=grok-4.3-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.3" "$actual" "explicit versioned alias pins canonical model"

cat >"$TMP_DIR/future.json" <<'JSON'
{
  "data": [
    {"id": "grok-4.5", "aliases": [], "created": 1782691200},
    {"id": "grok-5", "aliases": ["grok-5-latest"], "created": 1800000000},
    {"id": "grok-imagine-video-2", "aliases": [], "created": 1900000000},
    {"id": "grok-build-3", "aliases": [], "created": 1900000001}
  ],
  "object": "list"
}
JSON

actual=$(XAI_RESEARCH_MODEL=auto "$SELECTOR" --models-file "$TMP_DIR/future.json")
assert_eq "grok-5" "$actual" "automatic selection advances to a newer canonical model"

if XAI_RESEARCH_MODEL=grok-9 "$SELECTOR" --models-file "$TMP_DIR/current.json" >"$TMP_DIR/out" 2>"$TMP_DIR/error"; then
  echo "FAIL: unavailable explicit model should fail" >&2
  exit 1
fi
grep -q "is not available" "$TMP_DIR/error"

request=$(printf '%s\n' '{"model":"grok-4.3","input":"test","tools":[{"type":"x_search"}]}' \
  | env -u XAI_RESEARCH_MODEL "$RESEARCH" --models-file "$TMP_DIR/current.json" --print-request 2>/dev/null)
actual=$(jq -r '.model' <<<"$request")
assert_eq "grok-4.5" "$actual" "request wrapper injects automatic model"
jq -e '.input == "test" and .tools[0].type == "x_search"' >/dev/null <<<"$request"

cat >"$TMP_DIR/no-general.json" <<'JSON'
{"data":[{"id":"grok-imagine-image-quality","created":999}]}
JSON
if env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/no-general.json" >"$TMP_DIR/out" 2>"$TMP_DIR/error"; then
  echo "FAIL: catalog without a general-purpose model should fail" >&2
  exit 1
fi
grep -q "no canonical general-purpose" "$TMP_DIR/error"

echo "PASS: x-research model selector"
