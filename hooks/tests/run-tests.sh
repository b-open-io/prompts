#!/bin/bash
# Table-driven test runner for dual-runtime hooks.
# Uses only standard tools: bash, jq, python3, mktemp, grep, diff.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export HOOKS_ROOT="$ROOT"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

PASS=0
FAIL=0
failures=()

assert_eq() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$name"
  else
    FAIL=$((FAIL + 1))
    failures+=("$name: expected=[$expected] actual=[$actual]")
    printf '  FAIL  %s\n        expected: %s\n        actual:   %s\n' "$name" "$expected" "$actual"
  fi
}

assert_contains() {
  local name="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$name"
  else
    FAIL=$((FAIL + 1))
    failures+=("$name: missing [$needle] in output")
    printf '  FAIL  %s\n        missing: %s\n        in: %s\n' "$name" "$needle" "${haystack:0:300}"
  fi
}

assert_not_contains() {
  local name="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    FAIL=$((FAIL + 1))
    failures+=("$name: unexpectedly found [$needle]")
    printf '  FAIL  %s\n        unexpectedly found: %s\n' "$name" "$needle"
  else
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$name"
  fi
}

assert_exit() {
  local name="$1" expected="$2" actual="$3"
  assert_eq "$name" "$expected" "$actual"
}

assert_json() {
  local name="$1" raw="$2"
  if printf '%s' "$raw" | jq -e . >/dev/null 2>&1; then
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$name"
  else
    FAIL=$((FAIL + 1))
    failures+=("$name: invalid JSON: ${raw:0:200}")
    printf '  FAIL  %s (invalid JSON)\n' "$name"
  fi
}

run_hook() {
  # run_hook SCRIPT RUNTIME INPUT_JSON → writes stdout/stderr/exit to vars
  local script="$1"
  local runtime="$2"
  local input="$3"
  local out_file err_file
  out_file=$(mktemp)
  err_file=$(mktemp)
  set +e
  printf '%s' "$input" | BOPEN_HOOK_RUNTIME="$runtime" bash "$ROOT/$script" >"$out_file" 2>"$err_file"
  HOOK_EXIT=$?
  set -e
  HOOK_STDOUT=$(cat "$out_file")
  HOOK_STDERR=$(cat "$err_file")
  rm -f "$out_file" "$err_file"
}

echo "=== hooks dual-runtime tests ==="
echo "ROOT=$ROOT"

# shellcheck disable=SC1091
source "$TESTS_DIR/test_bouncer.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_damage_control.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_apply_patch.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_publish_gate.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_session_context.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_hammertime.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_hook_enabled.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_agent_browser_solo.sh"
# shellcheck disable=SC1091
source "$TESTS_DIR/test_validate.sh"

echo
echo "=== results: $PASS passed, $FAIL failed ==="
if [[ $FAIL -gt 0 ]]; then
  echo "Failures:"
  for f in "${failures[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
exit 0
