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

assert_rejected() {
  label=$1
  expected_error=$2
  shift 2
  if "$@" >"$TMP_DIR/out" 2>"$TMP_DIR/error"; then
    echo "FAIL: $label: expected rejection, got '$(cat "$TMP_DIR/out")'" >&2
    exit 1
  fi
  if ! grep -q "$expected_error" "$TMP_DIR/error"; then
    echo "FAIL: $label: expected error '$expected_error', got '$(cat "$TMP_DIR/error")'" >&2
    exit 1
  fi
}

cat >"$TMP_DIR/current.json" <<'JSON'
{
  "data": [
    {"id": "grok-4.6", "aliases": ["grok-4.6-latest", "grok-latest"], "created": 1776384000},
    {"id": "grok-4.7", "aliases": ["grok-4.7-latest", "grok-build-latest"], "created": 1782691200},
    {"id": "grok-imagine-image-quality", "aliases": [], "created": 1783000000}
  ],
  "object": "list"
}
JSON

actual=$(env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.7" "$actual" "automatic selection ignores stale grok-latest alias"

actual=$(XAI_RESEARCH_MODEL=grok-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.7" "$actual" "grok-latest requests automatic selection"

actual=$(XAI_RESEARCH_MODEL=grok-4-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.7" "$actual" "grok-4-latest requests automatic selection"

actual=$(XAI_RESEARCH_MODEL=grok-4.7-latest "$SELECTOR" --models-file "$TMP_DIR/current.json")
assert_eq "grok-4.7" "$actual" "explicit versioned alias pins canonical model"

cat >"$TMP_DIR/future.json" <<'JSON'
{
  "data": [
    {"id": "grok-4.7", "aliases": [], "created": 1782691200},
    {"id": "grok-5", "aliases": ["grok-5-latest"], "created": 1800000000},
    {"id": "grok-imagine-video-2", "aliases": [], "created": 1900000000},
    {"id": "grok-build-3", "aliases": [], "created": 1900000001}
  ],
  "object": "list"
}
JSON

actual=$(XAI_RESEARCH_MODEL=auto "$SELECTOR" --models-file "$TMP_DIR/future.json")
assert_eq "grok-5" "$actual" "automatic selection advances to a newer canonical model"

assert_rejected "unavailable explicit model" "is not available" \
  env XAI_RESEARCH_MODEL=grok-9 "$SELECTOR" --models-file "$TMP_DIR/current.json"

# Grok 4.6 is retired: neither path may return it, even when it is the newest catalog entry.
cat >"$TMP_DIR/retired-newest.json" <<'JSON'
{"data":[
  {"id": "grok-4.7", "aliases": [], "created": 1782691200},
  {"id": "grok-4.6", "aliases": ["grok-4.6-latest"], "created": 1900000000},
  {"id": "grok-4", "aliases": [], "created": 1900000001},
  {"id": "grok-imagine-image-quality", "aliases": [], "created": 1900000002}
]}
JSON
actual=$(env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/retired-newest.json")
assert_eq "grok-4.7" "$actual" "automatic selection skips a newer-dated retired model"

for pin in grok-4.6 grok-4.6-latest grok-4 grok-imagine-image-quality; do
  assert_rejected "explicit pin $pin" "not a versioned Grok model at or above grok-4.7" \
    env XAI_RESEARCH_MODEL="$pin" "$SELECTOR" --models-file "$TMP_DIR/retired-newest.json"
done

cat >"$TMP_DIR/retired-only.json" <<'JSON'
{"data":[{"id": "grok-4.6", "aliases": ["grok-latest"], "created": 1900000000}]}
JSON
assert_rejected "automatic selection with only retired models" "at or above grok-4.7" \
  env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/retired-only.json"

request=$(printf '%s\n' '{"model":"grok-4.6","input":"test","tools":[{"type":"x_search"}]}' \
  | env -u XAI_RESEARCH_MODEL "$RESEARCH" --models-file "$TMP_DIR/current.json" --print-request 2>/dev/null)
actual=$(jq -r '.model' <<<"$request")
assert_eq "grok-4.7" "$actual" "request wrapper replaces an embedded retired model"
jq -e '.input == "test" and .tools[0].type == "x_search"' >/dev/null <<<"$request"

for pin in grok-4.6 auto; do
  catalog="$TMP_DIR/current.json"
  [ "$pin" = auto ] && catalog="$TMP_DIR/retired-only.json"
  if printf '%s\n' '{"input":"test"}' \
    | XAI_RESEARCH_MODEL="$pin" "$RESEARCH" --models-file "$catalog" --print-request >"$TMP_DIR/out" 2>"$TMP_DIR/error"; then
    echo "FAIL: request wrapper built a request with XAI_RESEARCH_MODEL=$pin: $(cat "$TMP_DIR/out")" >&2
    exit 1
  fi
  if [ -s "$TMP_DIR/out" ]; then
    echo "FAIL: request wrapper printed a request after rejecting $pin" >&2
    exit 1
  fi
done

cat >"$TMP_DIR/no-general.json" <<'JSON'
{"data":[{"id":"grok-imagine-image-quality","created":999}]}
JSON
assert_rejected "catalog without a general-purpose model" "no canonical general-purpose" \
  env -u XAI_RESEARCH_MODEL "$SELECTOR" --models-file "$TMP_DIR/no-general.json"

echo "PASS: x-research model selector"
