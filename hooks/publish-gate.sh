#!/bin/bash
# publish-gate.sh
# PreToolUse hook: requires a Linear ticket in "Approved" state with label "publish"
# before allowing publish commands to execute.
#
# Runtime-aware deny output (Claude + Codex):
#   permissionDecision: "deny" on stderr + exit 2
#
# Commands intercepted (shell-chain-aware):
#   - git push origin master/main when HEAD starts with "Release v"
#   - bun publish / npm publish (anywhere in a shell chain)
#   - clawnet publish --on-chain

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

hook_enabled "publish-gate" || exit 0

# Top-level error handling: never crash open on unexpected failures for gated cmds.
# Non-gated commands always exit 0. Unexpected errors on gated paths fail closed
# for on-chain and fail with deny for other publishes.
_PUBLISH_GATE_ON_CHAIN=false
_PUBLISH_GATE_ACTIVE=false

on_unexpected_error() {
  local exit_code=$?
  if [[ "$_PUBLISH_GATE_ACTIVE" == "true" ]]; then
    echo "publish-gate: unexpected error (exit ${exit_code}). Denying publish for safety." >&2
    # Best-effort deny without relying on helpers that may have failed
    printf '%s\n' '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"PUBLISH GATE: internal error while evaluating publish approval. Retry after checking LINEAR_API_KEY and network access."}' >&2
    exit 2
  fi
  exit 0
}
trap on_unexpected_error ERR

input=$(cat)
tool_name=$(extract_tool_name "$input")

# Only intercept shell tool calls (empty tool_name allowed if command present)
if [[ -n "$tool_name" ]] && ! is_shell_tool "$tool_name"; then
  exit 0
fi

command_str=$(extract_command "$input")
if [[ -z "$command_str" ]]; then
  exit 0
fi
command_lower=$(printf '%s' "$command_str" | tr '[:upper:]' '[:lower:]')

cwd=$(resolve_cwd "$input")

# ---------------------------------------------------------------------------
# Detect whether this command is a publish-gated command (shell-chain-aware)
# ---------------------------------------------------------------------------

IS_ON_CHAIN=false
IS_GATED=false
PACKAGE_HINT=""

detect_package_hint() {
  local root="$1"
  local name=""
  local f
  for f in \
    "${root}/.claude-plugin/plugin.json" \
    "${root}/.codex-plugin/plugin.json" \
    "${root}/package.json"
  do
    if [[ -f "$f" ]]; then
      name=$(jq -r '.name // empty' "$f" 2>/dev/null || true)
      if [[ -n "$name" && "$name" != "null" ]]; then
        printf '%s' "$name"
        return 0
      fi
    fi
  done
  basename "$root"
}

# git push origin master/main — only if HEAD commit starts with "Release v"
# Match anywhere in a chain: `... && git push origin main`
if printf '%s' "$command_str" | grep -qE '(^|[[:space:];|&])git[[:space:]]+push[[:space:]]+(origin[[:space:]]+)?(master|main)\b'; then
  RECENT_MSG=$(git -C "$cwd" log -1 --format="%s" 2>/dev/null || echo "")
  if printf '%s' "$RECENT_MSG" | grep -qiE '^Release v[0-9]'; then
    IS_GATED=true
    PACKAGE_HINT=$(detect_package_hint "$cwd")
  fi
fi

# bun publish / npm publish — shell-chain-aware (not only at start of string)
if printf '%s' "$command_lower" | grep -qE '(^|[[:space:];|&])(bun|npm)[[:space:]]+publish([[:space:]]|$)'; then
  IS_GATED=true
  PACKAGE_HINT=$(detect_package_hint "$cwd")
fi

# clawnet publish --on-chain — shell-chain-aware
if printf '%s' "$command_lower" | grep -qE '(^|[[:space:];|&])clawnet[[:space:]]+publish\b' \
  && printf '%s' "$command_lower" | grep -qE -- '--on-chain'; then
  IS_GATED=true
  IS_ON_CHAIN=true
  _PUBLISH_GATE_ON_CHAIN=true
  PACKAGE_HINT=$(detect_package_hint "$cwd")
fi

if [[ "$IS_GATED" != "true" ]]; then
  exit 0
fi

_PUBLISH_GATE_ACTIVE=true

# ---------------------------------------------------------------------------
# Manual bypass (must be set in the human's terminal, not by the agent)
# ---------------------------------------------------------------------------

if [[ -n "${PUBLISH_BYPASS_TOKEN:-}" ]]; then
  echo "publish-gate: BYPASS USED for '${PACKAGE_HINT}' — PUBLISH_BYPASS_TOKEN was set manually." >&2
  exit 0
fi

# ---------------------------------------------------------------------------
# Missing LINEAR_API_KEY
# ---------------------------------------------------------------------------

if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  if [[ "$IS_ON_CHAIN" == "true" ]]; then
    deny_permission "PUBLISH GATE (on-chain): LINEAR_API_KEY is not set. clawnet publish --on-chain broadcasts an irreversible BSV transaction to mainnet. Set LINEAR_API_KEY and obtain an Approved Linear ticket before proceeding."
  else
    echo "publish-gate: WARNING — LINEAR_API_KEY not set. Skipping approval check for reversible publish of '${PACKAGE_HINT}'." >&2
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
# Query Linear with proper JSON encoding + GraphQL variables
# ---------------------------------------------------------------------------

# Build filter object with jq (never string-interpolate into JSON).
if [[ -n "$PACKAGE_HINT" ]]; then
  FILTER_JSON=$(jq -n --arg pkg "$PACKAGE_HINT" '{
    state: { name: { eq: "Approved" } },
    labels: { name: { containsIgnoreCase: "publish" } },
    title: { containsIgnoreCase: $pkg }
  }')
else
  FILTER_JSON=$(jq -n '{
    state: { name: { eq: "Approved" } },
    labels: { name: { containsIgnoreCase: "publish" } }
  }')
fi

ISSUES_QUERY='query Issues($filter: IssueFilter) { issues(filter: $filter) { nodes { id identifier title } } }'

REQUEST_BODY=$(jq -n \
  --arg query "$ISSUES_QUERY" \
  --argjson filter "$FILTER_JSON" \
  '{query: $query, variables: {filter: $filter}}')

# Export for tests that inspect outbound JSON (optional).
if [[ -n "${PUBLISH_GATE_CAPTURE_REQUEST:-}" ]]; then
  printf '%s' "$REQUEST_BODY" > "$PUBLISH_GATE_CAPTURE_REQUEST"
fi

# Allow tests to inject a mock curl via PUBLISH_GATE_CURL
CURL_BIN="${PUBLISH_GATE_CURL:-curl}"

# Disable ERR trap around curl so timeouts/network errors are handled explicitly
# (command-substitution failures can otherwise trip the trap with curl's exit code).
trap - ERR
set +e
LINEAR_RESPONSE=$("$CURL_BIN" -sS --max-time 8 \
  -X POST "https://api.linear.app/graphql" \
  -H "Authorization: ${LINEAR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" 2>/dev/null)
CURL_STATUS=$?
set -e
trap on_unexpected_error ERR

if [[ $CURL_STATUS -ne 0 || -z "$LINEAR_RESPONSE" ]]; then
  if [[ "$IS_ON_CHAIN" == "true" ]]; then
    deny_permission "PUBLISH GATE (on-chain): Linear API request failed or timed out (curl exit ${CURL_STATUS}). Cannot verify approval for irreversible publish. Retry when Linear is reachable."
  fi
  deny_permission "PUBLISH GATE: Linear API request failed or timed out (curl exit ${CURL_STATUS}). Cannot verify an Approved publish ticket. Retry when Linear is reachable, or set PUBLISH_BYPASS_TOKEN only from a human terminal."
fi

# GraphQL top-level errors
if printf '%s' "$LINEAR_RESPONSE" | jq -e '.errors and (.errors | length > 0)' >/dev/null 2>&1; then
  ERR_MSG=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '[.errors[].message] | join("; ")' 2>/dev/null || echo "unknown GraphQL error")
  deny_permission "PUBLISH GATE: Linear GraphQL error: ${ERR_MSG}"
fi

TICKET_ID=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].id // empty' 2>/dev/null || true)
TICKET_IDENTIFIER=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].identifier // empty' 2>/dev/null || true)
TICKET_TITLE=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].title // empty' 2>/dev/null || true)

# ---------------------------------------------------------------------------
# On-chain: require "irreversible acknowledged" comment
# ---------------------------------------------------------------------------

if [[ "$IS_ON_CHAIN" == "true" && -n "$TICKET_ID" ]]; then
  COMMENTS_QUERY='query IssueComments($id: String!) { issue(id: $id) { comments { nodes { body } } } }'
  COMMENTS_BODY=$(jq -n \
    --arg query "$COMMENTS_QUERY" \
    --arg id "$TICKET_ID" \
    '{query: $query, variables: {id: $id}}')

  if [[ -n "${PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST:-}" ]]; then
    printf '%s' "$COMMENTS_BODY" > "$PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST"
  fi

  trap - ERR
  set +e
  COMMENTS_RESPONSE=$("$CURL_BIN" -sS --max-time 8 \
    -X POST "https://api.linear.app/graphql" \
    -H "Authorization: ${LINEAR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$COMMENTS_BODY" 2>/dev/null)
  COMMENTS_STATUS=$?
  set -e
  trap on_unexpected_error ERR

  if [[ $COMMENTS_STATUS -ne 0 || -z "$COMMENTS_RESPONSE" ]]; then
    deny_permission "PUBLISH GATE (on-chain): failed to load comments for ticket ${TICKET_IDENTIFIER}. Cannot verify irreversible acknowledgment."
  fi

  HAS_ACK=$(printf '%s' "$COMMENTS_RESPONSE" | \
    jq -r '[.data.issue.comments.nodes[].body // empty] | map(ascii_downcase) | any(test("irreversible acknowledged"))' 2>/dev/null || echo "false")

  if [[ "$HAS_ACK" != "true" ]]; then
    deny_permission "PUBLISH GATE (on-chain): Linear ticket ${TICKET_IDENTIFIER} (${TICKET_TITLE}) is Approved, but no comment containing \"irreversible acknowledged\" was found. The approver must add a comment with that exact phrase to confirm they understand this BSV transaction cannot be undone."
  fi
fi

# ---------------------------------------------------------------------------
# Gate decision
# ---------------------------------------------------------------------------

if [[ -n "$TICKET_ID" ]]; then
  echo "publish-gate: approved — Linear ticket ${TICKET_IDENTIFIER} (${TICKET_TITLE}) is Approved." >&2
  exit 0
fi

STOP_REASON="PUBLISH GATE: No Linear ticket found in \"Approved\" state with label \"publish\""
if [[ -n "$PACKAGE_HINT" ]]; then
  STOP_REASON="${STOP_REASON} matching package \"${PACKAGE_HINT}\""
fi
STOP_REASON="${STOP_REASON}. Use the publish-request skill to prepare a release plan and post it to Linear. Then ask the user to review and move the ticket to Approved. Once confirmed, retry the publish command."

deny_permission "$STOP_REASON"
