#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
FAILURES=0

cat > "$TMP_DIR/bun" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$MOCK_PUBLISH_OUTPUT"
exit 1
EOF
chmod +x "$TMP_DIR/bun"

assert_status() {
  local NAME="$1"
  local EXPECTED="$2"
  local OUTPUT="$3"
  local ACTUAL

  ACTUAL=$(PATH="$TMP_DIR:$PATH" MOCK_PUBLISH_OUTPUT="$OUTPUT" bash "$SCRIPT_DIR/publish.sh" 2>&1 | tail -1 || true)
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
  "generic 403 remains a publish error" \
  "PUBLISH_ERROR" \
  "npm error code E403
npm error 403 Forbidden - You do not have permission to publish @scope/pkg."

if [ "$FAILURES" -ne 0 ]; then
  exit 1
fi

echo "All publish output classification tests passed."
