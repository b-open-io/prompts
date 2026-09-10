#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
FAILURES=0

cat > "$TMP_DIR/bun" <<'EOF'
#!/usr/bin/env bash
printf 'bun-argv:%s\n' "$*" >> "$MOCK_BUN_LOG"
if [ -t 0 ]; then
  printf 'stdin:tty\n' >> "$MOCK_BUN_LOG"
else
  data=$(cat || true)
  printf 'stdin:%s\n' "$data" >> "$MOCK_BUN_LOG"
fi
if [ "${MOCK_PUBLISH_EXIT:-1}" = 0 ]; then
  printf '%s\n' "${MOCK_PUBLISH_OUTPUT:-ok}"
  exit 0
fi
printf '%s\n' "$MOCK_PUBLISH_OUTPUT"
exit 1
EOF
chmod +x "$TMP_DIR/bun"

cat > "$TMP_DIR/npm" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "whoami" ]; then
  if [ "${MOCK_WHOAMI_OK:-1}" = 1 ]; then
    echo testuser
    exit 0
  fi
  echo "npm error 401 Unauthorized" >&2
  exit 1
fi
exit 0
EOF
chmod +x "$TMP_DIR/npm"

assert_status() {
  local NAME="$1"
  local EXPECTED="$2"
  local OUTPUT="$3"
  local ACTUAL

  ACTUAL=$(
    PATH="$TMP_DIR:$PATH" \
    MOCK_BUN_LOG="$TMP_DIR/bun.log" \
    MOCK_WHOAMI_OK="${MOCK_WHOAMI_OK:-1}" \
    MOCK_PUBLISH_OUTPUT="$OUTPUT" \
    bash "$SCRIPT_DIR/publish.sh" --remote 2>&1 | tail -1 || true
  )
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    echo "FAIL: $NAME (expected $EXPECTED, got $ACTUAL)" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: $NAME"
  fi
}

assert_status \
  "duplicate version 403 is not authentication" \
  "VERSION_ALREADY_PUBLISHED" \
  "npm error code E403
npm error 403 403 Forbidden - PUT https://registry.npmjs.org/@scope%2fpkg - You cannot publish over the previously published versions: 0.0.15."

assert_status \
  "ENEEDAUTH is authentication" \
  "AUTH_FAILED" \
  "npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in."

assert_status \
  "401 unauthorized is authentication" \
  "AUTH_FAILED" \
  "npm error code E401
npm error 401 Unauthorized - PUT https://registry.npmjs.org/@scope%2fpkg"

assert_status \
  "unauthenticated 404 name@version is authentication" \
  "AUTH_FAILED" \
  "error: 404 Not Found: bitcoin-backup@0.2.0"

assert_status \
  "OTP prompt is authentication, not a request for a code" \
  "AUTH_FAILED" \
  "This operation requires a one-time password.
Enter OTP:"

assert_status \
  "generic 403 remains a publish error" \
  "PUBLISH_ERROR" \
  "npm error code E403
npm error 403 Forbidden - You do not have permission to publish @scope/pkg."

MISSING_EXIT=0
MISSING_OUT=$(bash "$SCRIPT_DIR/publish.sh" --access public 2>&1) || MISSING_EXIT=$?
if [ "$MISSING_EXIT" != 2 ] || ! printf '%s\n' "$MISSING_OUT" | grep -q 'Usage: publish.sh --local|--remote'; then
  echo "FAIL: missing --local/--remote (exit $MISSING_EXIT)" >&2
  echo "$MISSING_OUT" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: missing --local/--remote exits 2"
fi

: > "$TMP_DIR/bun.log"
MOCK_WHOAMI_OK=0
assert_status \
  "unauthenticated login failure does not run bun publish" \
  "LOGIN_FAILED" \
  "should not run bun"
if grep -q 'bun-argv:' "$TMP_DIR/bun.log"; then
  echo "FAIL: bun publish ran when login failed" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: bun publish skipped when login failed"
fi
unset MOCK_WHOAMI_OK
MOCK_WHOAMI_OK=1

: > "$TMP_DIR/bun.log"
PATH="$TMP_DIR:$PATH" MOCK_BUN_LOG="$TMP_DIR/bun.log" MOCK_WHOAMI_OK=1 \
  MOCK_PUBLISH_OUTPUT="ok" MOCK_PUBLISH_EXIT=0 \
  bash "$SCRIPT_DIR/publish.sh" --remote --access public >/dev/null
if grep -q -- '--otp' "$TMP_DIR/bun.log"; then
  echo "FAIL: publish.sh passed --otp to bun" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: publish.sh does not pass --otp"
fi
if grep -q '^stdin:.' "$TMP_DIR/bun.log" && ! grep -q '^stdin:tty$' "$TMP_DIR/bun.log" && ! grep -q '^stdin:$' "$TMP_DIR/bun.log"; then
  echo "FAIL: publish.sh piped data into bun publish" >&2
  cat "$TMP_DIR/bun.log" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: publish.sh does not pipe a newline into bun publish"
fi
if ! grep -q -- '--access public' "$TMP_DIR/bun.log"; then
  echo "FAIL: publish.sh did not pass --access public" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: publish.sh forwards --access public"
fi

if [ "$FAILURES" -ne 0 ]; then
  exit 1
fi

echo "All publish output classification tests passed."
