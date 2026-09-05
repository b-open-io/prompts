#!/usr/bin/env bash
# bopen.ai social scheduler helper for agents (auth.md service-auth + social:draft API).
# Prints raw JSON responses so the calling agent can read ids and errors.
set -euo pipefail

SITE="${BOPEN_SITE:-https://bopen.ai}"
STATE_DIR="${BOPEN_STATE_DIR:-$HOME/.core/bopen}"
TOKEN_FILE="${BOPEN_TOKEN_FILE:-$STATE_DIR/access-token}"
ASSERTION_FILE="${BOPEN_ASSERTION_FILE:-$STATE_DIR/identity-assertion}"
CLAIM_GRANT="urn:workos:agent-auth:grant-type:claim"
JWT_BEARER_GRANT="urn:ietf:params:oauth:grant-type:jwt-bearer"

usage() {
  cat <<USAGE
Usage: $(basename "$0") <command> [args]

  login <email> [scopes]     Run the auth.md service-auth ceremony (default scope: social:draft).
                             Prints the verification URL and user code for the user, then polls.
  refresh                    Mint a new access token from the stored identity assertion.
  whoami                     GET /api/me (needs profile:read).
  accounts                   GET /api/social/accounts
  next-slot <accountId>      GET /api/social/next-slot
  upload <file>              POST /api/social/media (multipart)
  create <json-file|->       POST /api/social/posts (adds an Idempotency-Key)
  get <postId>               GET /api/social/posts/{id}
  update <postId> <json|->   PATCH /api/social/posts/{id}
  delete <postId>            DELETE /api/social/posts/{id}
  review-url <postId>        Print the private review page URL
  open <postId>              Open the review page in the local browser

Env: BOPEN_SITE (default https://bopen.ai), BOPEN_ACCESS_TOKEN (overrides the token file),
     BOPEN_TOKEN_FILE, BOPEN_ASSERTION_FILE, BOPEN_STATE_DIR (default ~/.core/bopen)
USAGE
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: $1 is required" >&2; exit 1; }; }
need curl
need python3

json_get() { # json_get <key.path> ; reads JSON on stdin, prints value or empty
  python3 -c '
import json, sys
path = sys.argv[1].split(".")
try:
    value = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for key in path:
    if isinstance(value, list):
        value = value[int(key)] if value else None
    elif isinstance(value, dict):
        value = value.get(key)
    else:
        value = None
    if value is None:
        break
if value is None:
    sys.exit(0)
print(value if isinstance(value, str) else json.dumps(value))
' "$1"
}

save_secret() { # save_secret <file> <value>
  mkdir -p "$(dirname "$1")"
  chmod 700 "$(dirname "$1")" 2>/dev/null || true
  umask 077
  printf '%s' "$2" >"$1"
  chmod 600 "$1"
}

token() {
  if [ -n "${BOPEN_ACCESS_TOKEN:-}" ]; then printf '%s' "$BOPEN_ACCESS_TOKEN"; return; fi
  if [ -s "$TOKEN_FILE" ]; then cat "$TOKEN_FILE"; return; fi
  echo "error: no access token. Run: $(basename "$0") login <email>" >&2
  exit 1
}

api() { # api <method> <path> [curl args...]
  local method="$1" path="$2"; shift 2
  curl -sS -X "$method" "$SITE$path" \
    -H "Authorization: Bearer $(token)" \
    -H "Accept: application/json" "$@"
  echo
}

discover() {
  local resource issuer meta
  resource="$(curl -sS "$SITE/.well-known/oauth-protected-resource")"
  issuer="$(printf '%s' "$resource" | json_get authorization_servers.0)"
  [ -n "$issuer" ] || { echo "error: no authorization server advertised at $SITE" >&2; exit 1; }
  meta="$(curl -sS "${issuer%/}/.well-known/oauth-authorization-server")"
  TOKEN_ENDPOINT="$(printf '%s' "$meta" | json_get token_endpoint)"
  IDENTITY_ENDPOINT="$(printf '%s' "$meta" | json_get agent_auth.identity_endpoint)"
  CLAIM_ENDPOINT="$(printf '%s' "$meta" | json_get agent_auth.claim_endpoint)"
  [ -n "$TOKEN_ENDPOINT" ] && [ -n "$IDENTITY_ENDPOINT" ] || {
    echo "error: authorization server metadata lacks token_endpoint or agent_auth.identity_endpoint" >&2; exit 1; }
}

cmd_login() {
  local email="${1:-}" scopes="${2:-social:draft}"
  [ -n "$email" ] || { usage; exit 1; }
  discover
  cat >&2 <<NOTE
Consent required before continuing (per $SITE/auth.md):
  service host : $SITE
  scopes       : $scopes
  effect       : a new agent registration is linked to the bOpen account for $email
  revoke at    : $SITE/agent/access
The agent never asks for a password and never enters the user code itself.
NOTE
  local reg claim_token uri code interval
  reg="$(curl -sS -X POST "$IDENTITY_ENDPOINT" -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"type":"service_auth","login_hint":sys.argv[1],"scope":sys.argv[2]}))' "$email" "$scopes")")"
  claim_token="$(printf '%s' "$reg" | json_get claim_token)"
  [ -n "$claim_token" ] || { echo "error: registration failed: $reg" >&2; exit 1; }
  uri="$(printf '%s' "$reg" | json_get claim.verification_uri)"
  code="$(printf '%s' "$reg" | json_get claim.user_code)"
  interval="$(printf '%s' "$reg" | json_get claim.interval)"; interval="${interval:-5}"
  cat <<STEP

Ask the user to open this URL, sign in to bOpen, and enter the code there:
  URL : $uri
  Code: $code
Waiting for approval (polling every ${interval}s, code valid ten minutes)...
STEP
  local deadline=$(( $(date +%s) + 900 ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    sleep "$interval"
    local res err
    res="$(curl -sS -X POST "$TOKEN_ENDPOINT" -H "Content-Type: application/x-www-form-urlencoded" \
      --data-urlencode "grant_type=$CLAIM_GRANT" --data-urlencode "claim_token=$claim_token")"
    err="$(printf '%s' "$res" | json_get error)"
    case "$err" in
      "")
        local access assertion
        access="$(printf '%s' "$res" | json_get access_token)"
        assertion="$(printf '%s' "$res" | json_get identity_assertion)"
        [ -n "$access" ] || { echo "error: unexpected token response: $res" >&2; exit 1; }
        save_secret "$TOKEN_FILE" "$access"
        [ -n "$assertion" ] && save_secret "$ASSERTION_FILE" "$assertion"
        echo "Logged in. Access token stored at $TOKEN_FILE (expires in $(printf '%s' "$res" | json_get expires_in)s)."
        return 0 ;;
      authorization_pending) ;;
      slow_down) interval=$(( interval + 5 )) ;;
      expired_token)
        if [ -n "$CLAIM_ENDPOINT" ]; then
          local fresh
          fresh="$(curl -sS -X POST "$CLAIM_ENDPOINT" -H "Content-Type: application/json" \
            -d "$(python3 -c 'import json,sys; print(json.dumps({"claim_token":sys.argv[1]}))' "$claim_token")")"
          code="$(printf '%s' "$fresh" | json_get user_code)"
          uri="$(printf '%s' "$fresh" | json_get verification_uri)"
          if [ -n "$code" ]; then echo "Code expired. New code: $code at $uri"; continue; fi
        fi
        echo "error: registration expired; run login again" >&2; exit 1 ;;
      *) echo "error: $res" >&2; exit 1 ;;
    esac
  done
  echo "error: timed out waiting for approval" >&2; exit 1
}

cmd_refresh() {
  [ -s "$ASSERTION_FILE" ] || { echo "error: no identity assertion stored; run login" >&2; exit 1; }
  discover
  local res access
  res="$(curl -sS -X POST "$TOKEN_ENDPOINT" -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=$JWT_BEARER_GRANT" \
    --data-urlencode "assertion=$(cat "$ASSERTION_FILE")" \
    --data-urlencode "resource=$SITE")"
  access="$(printf '%s' "$res" | json_get access_token)"
  [ -n "$access" ] || { echo "error: refresh failed: $res" >&2; exit 1; }
  save_secret "$TOKEN_FILE" "$access"
  echo "Access token refreshed (expires in $(printf '%s' "$res" | json_get expires_in)s)."
}

body_arg() { # body_arg <json-file|->
  if [ "${1:-}" = "-" ]; then cat; elif [ -f "${1:-}" ]; then cat "$1"; else printf '%s' "${1:-}"; fi
}

review_url() {
  local tok
  tok="$(api GET "/api/social/posts/$1" | json_get post.reviewToken)"
  [ -n "$tok" ] || { echo "error: post $1 not found or has no review token" >&2; exit 1; }
  printf '%s/social/review/%s\n' "$SITE" "$tok"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  login) cmd_login "$@" ;;
  refresh) cmd_refresh ;;
  whoami) api GET /api/me ;;
  accounts) api GET /api/social/accounts ;;
  next-slot) [ -n "${1:-}" ] || { usage; exit 1; }; api GET "/api/social/next-slot?account=$1" ;;
  upload) [ -f "${1:-}" ] || { echo "error: file not found: ${1:-}" >&2; exit 1; }
    api POST /api/social/media -F "file=@$1" ;;
  create) [ -n "${1:-}" ] || { usage; exit 1; }
    key="$(python3 -c 'import secrets; print(secrets.token_hex(16))')"
    body_arg "$1" | api POST /api/social/posts -H "Content-Type: application/json" -H "Idempotency-Key: $key" --data-binary @- ;;
  get) [ -n "${1:-}" ] || { usage; exit 1; }; api GET "/api/social/posts/$1" ;;
  update) [ -n "${2:-}" ] || { usage; exit 1; }
    body_arg "$2" | api PATCH "/api/social/posts/$1" -H "Content-Type: application/json" --data-binary @- ;;
  delete) [ -n "${1:-}" ] || { usage; exit 1; }; api DELETE "/api/social/posts/$1" ;;
  review-url) [ -n "${1:-}" ] || { usage; exit 1; }; review_url "$1" ;;
  open) [ -n "${1:-}" ] || { usage; exit 1; }
    url="$(review_url "$1")"; echo "$url"
    if command -v open >/dev/null 2>&1; then open "$url"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1 || true
    else echo "(no local browser opener; share the URL with the user)"; fi ;;
  ""|-h|--help|help) usage ;;
  *) echo "error: unknown command: $cmd" >&2; usage; exit 1 ;;
esac
