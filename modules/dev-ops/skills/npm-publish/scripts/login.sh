#!/usr/bin/env bash
# npm-publish: whoami, then web login if needed, then wait.
#
# Usage:
#   login.sh --local    # open a browser on this machine
#   login.sh --remote   # print LOGIN_URL; do not open a browser
#
# The agent must pass one flag. Do not run npm whoami or npm login yourself.
set -euo pipefail

npm_publish_login_dir() {
  printf '%s\n' "${NPM_PUBLISH_LOGIN_DIR:-${TMPDIR:-/tmp}/npm-publish-login}"
}

npm_publish_extract_login_url() {
  local text="$1"
  local url
  url=$(printf '%s\n' "$text" | grep -Eo 'https://www\.npmjs\.com/login[^[:space:]"]+|https://[^[:space:]"]+/login/cli/[^[:space:]"]+' | head -1 || true)
  url="${url%%[.,;)]}"
  printf '%s\n' "$url"
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

npm_publish_whoami_ok() {
  npm whoami >/dev/null 2>&1
}

npm_publish_redact() {
  sed -E 's/npm_[A-Za-z0-9]+/npm_REDACTED/g'
}

npm_publish_start_web_login() {
  local dir log pidfile
  dir=$(npm_publish_login_dir)
  mkdir -p "$dir"
  log="$dir/npm-login.log"
  pidfile="$dir/npm-login.pid"
  : >"$log"

  if [ -f "$pidfile" ]; then
    local old existing
    old=$(cat "$pidfile" 2>/dev/null || true)
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
      existing=$(npm_publish_extract_login_url "$(cat "$log")")
      if [ -n "$existing" ]; then
        printf '%s\n' "$existing"
        return 0
      fi
    else
      rm -f "$pidfile"
    fi
  fi

  npm_config_browser=false npm login --auth-type=web --browser false \
    --registry=https://registry.npmjs.org/ >"$log" 2>&1 &
  echo $! >"$pidfile"

  local i url pid
  pid=$(cat "$pidfile")
  for i in $(seq 1 150); do
    if [ -f "$log" ]; then
      url=$(npm_publish_extract_login_url "$(cat "$log")")
      if [ -n "$url" ]; then
        printf '%s\n' "$url"
        return 0
      fi
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "LOGIN_FAILED" >&2
      npm_publish_redact <"$log" >&2 || true
      return 1
    fi
    if grep -q '^Username:' "$log" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      echo "LOGIN_FAILED" >&2
      echo "web login fell back to a username prompt" >&2
      return 1
    fi
    sleep 0.2
  done

  echo "LOGIN_FAILED" >&2
  echo "npm login did not print a URL" >&2
  return 1
}

npm_publish_wait() {
  local dir log pidfile timeout pid
  dir=$(npm_publish_login_dir)
  log="$dir/npm-login.log"
  pidfile="$dir/npm-login.pid"
  timeout="${NPM_PUBLISH_LOGIN_TIMEOUT:-600}"
  pid=""
  [ -f "$pidfile" ] && pid=$(cat "$pidfile")

  local elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    if npm_publish_whoami_ok; then
      echo LOGIN_OK
      return 0
    fi
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null || true
      rm -f "$pidfile"
      if npm_publish_whoami_ok; then
        echo LOGIN_OK
        return 0
      fi
      echo LOGIN_FAILED
      if [ -f "$log" ]; then
        npm_publish_redact <"$log" >&2 || true
      fi
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -f "$pidfile"
  echo LOGIN_TIMEOUT
  return 1
}

npm_publish_login() {
  local mode="$1"
  if npm_publish_whoami_ok; then
    echo AUTH_OK
    return 0
  fi

  echo NOT_AUTHENTICATED

  local url
  url=$(npm_publish_start_web_login) || {
    echo LOGIN_FAILED
    return 1
  }

  echo "LOGIN_URL:$url"

  if [ "$mode" = local ]; then
    if npm_publish_open_browser "$url"; then
      echo BROWSER_OPENED
    else
      echo BROWSER_OPEN_FAILED
    fi
  else
    echo BROWSER_LINK_ONLY
  fi

  echo WAITING_FOR_LOGIN
  echo "Finish signing in at the LOGIN_URL. This script waits until login completes; it will not publish until then."

  npm_publish_wait
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  MODE=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --local) MODE=local; shift ;;
      --remote) MODE=remote; shift ;;
      *)
        echo "Usage: login.sh --local|--remote" >&2
        exit 2
        ;;
    esac
  done
  if [ -z "$MODE" ]; then
    echo "Usage: login.sh --local|--remote" >&2
    exit 2
  fi
  npm_publish_login "$MODE"
fi
