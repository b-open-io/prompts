#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
source "$SCRIPT_DIR/login.sh"

FAILURES=0

assert_eq() {
  local NAME="$1"
  local EXPECTED="$2"
  local ACTUAL="$3"
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    echo "FAIL: $NAME (expected $EXPECTED, got $ACTUAL)" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: $NAME"
  fi
}

assert_contains() {
  local NAME="$1"
  local NEEDLE="$2"
  local HAYSTACK="$3"
  if ! printf '%s\n' "$HAYSTACK" | grep -Fq "$NEEDLE"; then
    echo "FAIL: $NAME (missing $NEEDLE)" >&2
    echo "$HAYSTACK" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS: $NAME"
  fi
}

URL=$(npm_publish_extract_login_url "Login at:
https://www.npmjs.com/login?next=/login/cli/test-uuid
Press ENTER to open in the browser...")
assert_eq "extracts npm web login URL" \
  "https://www.npmjs.com/login?next=/login/cli/test-uuid" \
  "$URL"

URL=$(npm_publish_extract_login_url 'npm notice Log in on https://registry.npmjs.org/')
assert_eq "ignores registry URL without login/cli" "" "$URL"

USAGE_EXIT=0
USAGE_OUT=$(bash "$SCRIPT_DIR/login.sh" 2>&1) || USAGE_EXIT=$?
assert_eq "missing flag exits 2" "2" "$USAGE_EXIT"
assert_contains "missing flag prints usage" "Usage: login.sh --local|--remote" "$USAGE_OUT"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
export NPM_PUBLISH_LOGIN_DIR="$TMP_DIR/state"
export NPM_PUBLISH_LOGIN_TIMEOUT=5
export PATH="$TMP_DIR:$PATH"
export MOCK_AUTH_OK="$TMP_DIR/auth-ok"
export MOCK_LOGIN_DONE="$TMP_DIR/login-done"
export MOCK_OPEN_LOG="$TMP_DIR/open.log"
: > "$MOCK_OPEN_LOG"
rm -f "$MOCK_AUTH_OK" "$MOCK_LOGIN_DONE"

cat > "$TMP_DIR/npm" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "whoami" ]; then
  if [ -f "$MOCK_AUTH_OK" ]; then
    echo testuser
    exit 0
  fi
  echo "npm error 401 Unauthorized" >&2
  exit 1
fi
if [ "$1" = "login" ]; then
  echo "Login at:"
  echo "https://www.npmjs.com/login?next=/login/cli/test-uuid"
  while [ ! -f "$MOCK_LOGIN_DONE" ]; do
    sleep 0.05
  done
  echo "Logged in on https://registry.npmjs.org/."
  echo testuser > "$MOCK_AUTH_OK"
  exit 0
fi
exit 1
EOF
chmod +x "$TMP_DIR/npm"

cat > "$TMP_DIR/open" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$MOCK_OPEN_LOG"
exit 0
EOF
chmod +x "$TMP_DIR/open"
cp "$TMP_DIR/open" "$TMP_DIR/xdg-open"

touch "$MOCK_AUTH_OK"
AUTH_OUT=$(bash "$SCRIPT_DIR/login.sh" --remote 2>&1)
assert_eq "already authenticated skips login" "AUTH_OK" "$(printf '%s\n' "$AUTH_OUT" | tail -1)"
rm -f "$MOCK_AUTH_OK" "$MOCK_LOGIN_DONE"
: > "$MOCK_OPEN_LOG"

( sleep 0.2; touch "$MOCK_LOGIN_DONE" ) &
REMOTE_OUT=$(bash "$SCRIPT_DIR/login.sh" --remote 2>&1)
assert_contains "remote emits LOGIN_URL" \
  "LOGIN_URL:https://www.npmjs.com/login?next=/login/cli/test-uuid" \
  "$REMOTE_OUT"
assert_contains "remote is link-only" "BROWSER_LINK_ONLY" "$REMOTE_OUT"
assert_contains "remote waits for login" "WAITING_FOR_LOGIN" "$REMOTE_OUT"
assert_eq "remote ends LOGIN_OK" "LOGIN_OK" "$(printf '%s\n' "$REMOTE_OUT" | tail -1)"
if [ -s "$MOCK_OPEN_LOG" ]; then
  echo "FAIL: remote opened a browser" >&2
  cat "$MOCK_OPEN_LOG" >&2
  FAILURES=$((FAILURES + 1))
else
  echo "PASS: remote does not open a browser"
fi

rm -rf "$NPM_PUBLISH_LOGIN_DIR"
rm -f "$MOCK_AUTH_OK" "$MOCK_LOGIN_DONE"
: > "$MOCK_OPEN_LOG"
( sleep 0.2; touch "$MOCK_LOGIN_DONE" ) &
LOCAL_OUT=$(bash "$SCRIPT_DIR/login.sh" --local 2>&1)
assert_contains "local emits LOGIN_URL" \
  "LOGIN_URL:https://www.npmjs.com/login?next=/login/cli/test-uuid" \
  "$LOCAL_OUT"
assert_contains "local opens browser" "BROWSER_OPENED" "$LOCAL_OUT"
assert_contains "local waits for login" "WAITING_FOR_LOGIN" "$LOCAL_OUT"
assert_eq "local ends LOGIN_OK" "LOGIN_OK" "$(printf '%s\n' "$LOCAL_OUT" | tail -1)"
assert_contains "local passed URL to open" \
  "https://www.npmjs.com/login?next=/login/cli/test-uuid" \
  "$(cat "$MOCK_OPEN_LOG")"

if [ "$FAILURES" -ne 0 ]; then
  exit 1
fi
echo "All login tests passed."
