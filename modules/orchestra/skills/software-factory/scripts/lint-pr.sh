#!/usr/bin/env bash
# Fail a GitHub PR title/body that a human cannot scan.
# Copied into target repos by /factory-init. Contract: human-artifacts.md
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/lint-pr.sh --title TITLE --body-file PATH
  scripts/lint-pr.sh --title TITLE --body TEXT
  scripts/lint-pr.sh --self-test
EOF
}

TITLE=""
BODY=""
BODY_FILE=""
SELF_TEST=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="${2:-}"; shift 2 ;;
    --body) BODY="${2:-}"; shift 2 ;;
    --body-file) BODY_FILE="${2:-}"; shift 2 ;;
    --self-test) SELF_TEST=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "lint-pr: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

lint_pr() {
  local title="$1"
  local body="$2"
  local errors=()

  title="${title//$'\r'/}"
  body="${body//$'\r'/}"

  if [[ -z "$title" ]]; then
    errors+=("title is empty")
  fi
  if [[ ${#title} -gt 72 ]]; then
    errors+=("title is ${#title} chars (max 72)")
  fi
  if [[ "$title" =~ ^[A-Z]{2,5}-[0-9]+: ]]; then
    errors+=("title starts with KEY-123: — put [KEY-123] at the end instead")
  fi
  if [[ "$title" =~ ^#[0-9]+: ]]; then
    errors+=("title starts with #123: — put (#123) or [KEY-123] at the end instead")
  fi
  if ! [[ "$title" =~ [A-Z]{2,5}-[0-9]+ ]] && ! [[ "$title" =~ \#[0-9]+ ]]; then
    errors+=("title must contain a ticket id (KEY-123 or #123)")
  fi

  local line_count
  if [[ -z "$body" ]]; then
    line_count=0
  else
    line_count=$(printf '%s\n' "$body" | wc -l | tr -d ' ')
  fi
  if [[ "$line_count" -gt 40 ]]; then
    errors+=("body is $line_count lines (max 40)")
  fi

  if ! printf '%s\n' "$body" | grep -qE '^## Problem[[:space:]]*$'; then
    errors+=("body needs a ## Problem heading")
  fi
  if ! printf '%s\n' "$body" | grep -qE '^## Change[[:space:]]*$'; then
    errors+=("body needs a ## Change heading")
  fi

  local phrase
  for phrase in \
    'NEXT CYCLE STARTS HERE' \
    'LOOP_RESULT' \
    'verdict.approved' \
    'maker/checker' \
    'corrective round' \
    'STE-100' \
    'ASD-STE' \
    'Simplified Technical English'
  do
    if printf '%s\n' "$body" | grep -qiF -- "$phrase"; then
      errors+=("body contains loop/process jargon: ${phrase}")
    fi
  done

  if printf '%s\n' "$body" | grep -qE '\bWI-[0-9]+'; then
    errors+=("body contains loop work-item ids (WI-N) — those belong in a PR comment")
  fi

  if [[ ${#errors[@]} -gt 0 ]]; then
    echo "lint-pr: PR text failed:" >&2
    local e
    for e in "${errors[@]}"; do
      echo "  - $e" >&2
    done
    return 1
  fi
  return 0
}

if [[ "$SELF_TEST" -eq 1 ]]; then
  fail=0
  expect_fail() {
    local name="$1"
    if lint_pr "$2" "$3" 2>/dev/null; then
      echo "self-test FAIL: expected reject: $name" >&2
      fail=1
    fi
  }
  expect_pass() {
    local name="$1"
    if ! lint_pr "$2" "$3" 2>/dev/null; then
      echo "self-test FAIL: expected accept: $name" >&2
      fail=1
    fi
  }

  good_body=$(printf '%s\n' '## Problem' 'Invoice PDF returns 404.' '## Change' 'Use the plural /api/invoices route.')

  expect_pass "linear suffix" "Fix invoice PDF 404 [ENG-1234]" "$good_body"
  expect_pass "github issue suffix" "Fix invoice PDF 404 (#88)" "$good_body"
  expect_fail "KEY prefix" "ENG-1234: Fix invoice PDF 404" "$good_body"
  expect_fail "missing ticket" "Fix invoice PDF 404" "$good_body"
  expect_fail "missing Problem" "Fix invoice PDF 404 [ENG-1234]" "$(printf '%s\n' '## Change' 'Use the plural route.')"
  expect_fail "loop dump" "Fix invoice PDF 404 [ENG-1234]" "$(printf '%s\n' '## Problem' 'x' '## Change' 'y' 'NEXT CYCLE STARTS HERE')"
  expect_fail "ste-100" "Fix invoice PDF 404 [ENG-1234]" "$(printf '%s\n' '## Problem' 'x' '## Change' 'y' 'Written in STE-100.')"
  expect_fail "empty title" "" "$good_body"
  long_title="Fix the invoice PDF download 404 that happens when the client uses the old path [ENG-1234]"
  expect_fail "title too long" "$long_title" "$good_body"

  if [[ "$fail" -ne 0 ]]; then
    echo "lint-pr --self-test: FAILED" >&2
    exit 1
  fi
  echo "lint-pr --self-test: ok"
  exit 0
fi

if [[ -n "$BODY_FILE" ]]; then
  if [[ ! -f "$BODY_FILE" ]]; then
    echo "lint-pr: body file not found: $BODY_FILE" >&2
    exit 2
  fi
  BODY=$(cat "$BODY_FILE")
fi

if [[ -z "$TITLE" ]]; then
  echo "lint-pr: --title is required" >&2
  usage >&2
  exit 2
fi

lint_pr "$TITLE" "$BODY"
