#!/usr/bin/env bash
# npm-publish: login if needed, then bun publish.
# Usage: publish.sh --local|--remote [--access public] [--dry-run]
#
# bun publish --auth-type web (the default) prints a second npm confirm URL
# and waits. We parse that URL, open it on --local, and never wait for ENTER.
set -uo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MODE=""
EXTRA_FLAGS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --local) MODE=local; shift ;;
    --remote) MODE=remote; shift ;;
    --access) EXTRA_FLAGS="$EXTRA_FLAGS --access $2"; shift 2 ;;
    --dry-run) EXTRA_FLAGS="$EXTRA_FLAGS --dry-run"; shift ;;
    *) shift ;;
  esac
done

if [ -z "$MODE" ]; then
  echo "Usage: publish.sh --local|--remote [--access public] [--dry-run]" >&2
  exit 2
fi

bash "$SCRIPT_DIR/login.sh" "--$MODE"
LOGIN_EXIT=$?
if [ "$LOGIN_EXIT" -ne 0 ]; then
  exit "$LOGIN_EXIT"
fi

PKG_NAME=unknown
PKG_VERSION=unknown
if [ -f package.json ]; then
  PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
  PKG_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
fi
echo "PUBLISHING:${PKG_NAME}@${PKG_VERSION}"

npm_publish_extract_publish_auth_url() {
  printf '%s\n' "$1" | grep -Eo 'https://www\.npmjs\.com/auth/cli/[^[:space:]|]+' | head -1 || true
}

npm_publish_open_browser() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || return 1
    return 0
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || return 1
    return 0
  fi
  return 1
}

LOG=$(mktemp)
SEEN="$LOG.auth-seen"
: >"$LOG"

# stdin /dev/null: do not wait for ENTER. bun still polls the auth/cli URL.
set +e
# shellcheck disable=SC2086
bun publish $EXTRA_FLAGS </dev/null 2>&1 | tee "$LOG" | while IFS= read -r line; do
  printf '%s\n' "$line"
  if [ -f "$SEEN" ]; then
    continue
  fi
  url=$(npm_publish_extract_publish_auth_url "$line")
  if [ -z "$url" ]; then
    continue
  fi
  : >"$SEEN"
  echo "PUBLISH_AUTH_URL:$url"
  if [ "$MODE" = local ]; then
    if npm_publish_open_browser "$url"; then
      echo BROWSER_OPENED
    else
      echo BROWSER_OPEN_FAILED
    fi
  else
    echo BROWSER_LINK_ONLY
  fi
  echo WAITING_FOR_PUBLISH_AUTH
  echo "Finish the npm publish confirmation at the PUBLISH_AUTH_URL. This script waits until the registry accepts the publish."
done
EXIT_CODE=${PIPESTATUS[0]}
set -e
OUTPUT=$(cat "$LOG")
rm -f "$LOG" "$SEEN"

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "PUBLISH_SUCCESS"
  exit 0
fi

if echo "$OUTPUT" | grep -Eqi \
  "cannot publish over (the )?previously published versions?|version[^[:cntrl:]]*already (exists|been published)|cannot publish the same version"; then
  echo "VERSION_ALREADY_PUBLISHED"
  exit 1
fi

if echo "$OUTPUT" | grep -Eqi \
  "ENEEDAUTH|E401|401[^[:cntrl:]]*(unauthorized|authentication)|unable to authenticate|authentication (token|is required|required)|access token[^[:cntrl:]]*(expired|revoked|invalid)|token[^[:cntrl:]]*(expired|revoked)|not logged in|404[[:space:]]+Not Found:[[:space:]]+[^[:space:]]+@[0-9]|one-time password|enter otp"; then
  echo "AUTH_FAILED"
  exit 1
fi

echo "PUBLISH_ERROR"
exit 1
