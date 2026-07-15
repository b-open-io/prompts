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

# Top-level error handling: never crash open on unexpected failures for gated cmds.
# Non-gated commands always exit 0. Unexpected errors on gated paths fail closed
# for on-chain and fail with deny for other publishes.
# _PUBLISH_GATE_ACTIVE is set inside publish_gate_main(); as a `local` it is
# still visible to this trap handler via bash's dynamic scoping whenever the
# trap fires during that function's execution.
on_unexpected_error() {
  local exit_code=$?
  if [[ "${_PUBLISH_GATE_ACTIVE:-false}" == "true" ]]; then
    echo "publish-gate: unexpected error (exit ${exit_code}). Denying publish for safety." >&2
    # Best-effort deny without relying on helpers that may have failed
    printf '%s\n' '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"PUBLISH GATE: internal error while evaluating publish approval. Safe publish path: run the bopen-tools:publish-request skill, check LINEAR_API_KEY and network access, have a human move the Linear ticket to Approved, then retry through the gate."}' >&2
    exit 2
  fi
  exit 0
}

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

# Entry point. Callable standalone (this file executed directly) or sourced
# and invoked in-process by pretooluse-bash.sh — either way $1 is the raw
# hook stdin JSON; a deny exits the whole process via common.sh, an allow
# returns 0 so a caller can continue to the next check. The ERR trap is
# installed/removed here (not at source time) so it only guards this
# function's own execution window, not any check that runs before it.
publish_gate_main() {
  local input="$1"
  hook_enabled "publish-gate" || return 0

  local _PUBLISH_GATE_ON_CHAIN=false
  local _PUBLISH_GATE_ACTIVE=false
  trap on_unexpected_error ERR

  local tool_name
  tool_name=$(extract_tool_name "$input")

  # Only intercept shell tool calls (empty tool_name allowed if command present)
  if [[ -n "$tool_name" ]] && ! is_shell_tool "$tool_name"; then
    trap - ERR
    return 0
  fi

  local command_str
  command_str=$(extract_command "$input")
  if [[ -z "$command_str" ]]; then
    trap - ERR
    return 0
  fi
  local command_lower
  command_lower=$(printf '%s' "$command_str" | tr '[:upper:]' '[:lower:]')

  local cwd
  cwd=$(resolve_cwd "$input")

  # ---------------------------------------------------------------------------
  # Detect whether this command is a publish-gated command (shell-chain-aware)
  # ---------------------------------------------------------------------------

  local IS_ON_CHAIN=false
  local IS_GATED=false
  local PACKAGE_HINT=""

  # git push origin master/main — only if HEAD commit starts with "Release v"
  # Match anywhere in a chain: `... && git push origin main`
  if printf '%s' "$command_str" | grep -qE '(^|[[:space:];|&])git[[:space:]]+push[[:space:]]+(origin[[:space:]]+)?(master|main)\b'; then
    local RECENT_MSG
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
    trap - ERR
    return 0
  fi

  _PUBLISH_GATE_ACTIVE=true

  # ---------------------------------------------------------------------------
  # Manual bypass (must be set in the human's terminal, not by the agent)
  # ---------------------------------------------------------------------------

  if [[ -n "${PUBLISH_BYPASS_TOKEN:-}" ]]; then
    echo "publish-gate: BYPASS USED for '${PACKAGE_HINT}' — PUBLISH_BYPASS_TOKEN was set manually." >&2
    trap - ERR
    return 0
  fi

  # ---------------------------------------------------------------------------
  # Missing LINEAR_API_KEY
  # ---------------------------------------------------------------------------

  if [[ -z "${LINEAR_API_KEY:-}" ]]; then
    if [[ "$IS_ON_CHAIN" == "true" ]]; then
      deny_permission "PUBLISH GATE (on-chain): LINEAR_API_KEY is not set. clawnet publish --on-chain broadcasts an irreversible BSV transaction to mainnet. Safe publish path: run the bopen-tools:publish-request skill, obtain an Approved Linear ticket, have its approver comment exactly 'irreversible acknowledged', set LINEAR_API_KEY from a human terminal, then retry through the gate."
    else
      echo "publish-gate: WARNING — LINEAR_API_KEY not set. Skipping approval check for reversible publish of '${PACKAGE_HINT}'." >&2
      trap - ERR
      return 0
    fi
  fi

  # ---------------------------------------------------------------------------
  # Query Linear with proper JSON encoding + GraphQL variables
  # ---------------------------------------------------------------------------

  # Build filter object with jq (never string-interpolate into JSON).
  local FILTER_JSON
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

  local ISSUES_QUERY='query Issues($filter: IssueFilter) { issues(filter: $filter) { nodes { id identifier title } } }'

  local REQUEST_BODY
  REQUEST_BODY=$(jq -n \
    --arg query "$ISSUES_QUERY" \
    --argjson filter "$FILTER_JSON" \
    '{query: $query, variables: {filter: $filter}}')

  # Export for tests that inspect outbound JSON (optional).
  if [[ -n "${PUBLISH_GATE_CAPTURE_REQUEST:-}" ]]; then
    printf '%s' "$REQUEST_BODY" > "$PUBLISH_GATE_CAPTURE_REQUEST"
  fi

  # Allow tests to inject a mock curl via PUBLISH_GATE_CURL
  local CURL_BIN="${PUBLISH_GATE_CURL:-curl}"

  # Disable ERR trap around curl so timeouts/network errors are handled explicitly
  # (command-substitution failures can otherwise trip the trap with curl's exit code).
  trap - ERR
  set +e
  local LINEAR_RESPONSE
  LINEAR_RESPONSE=$("$CURL_BIN" -sS --max-time 8 \
    -X POST "https://api.linear.app/graphql" \
    -H "Authorization: ${LINEAR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_BODY" 2>/dev/null)
  local CURL_STATUS=$?
  set -e
  trap on_unexpected_error ERR

  if [[ $CURL_STATUS -ne 0 || -z "$LINEAR_RESPONSE" ]]; then
    if [[ "$IS_ON_CHAIN" == "true" ]]; then
      deny_permission "PUBLISH GATE (on-chain): Linear API request failed or timed out (curl exit ${CURL_STATUS}). Cannot verify approval for irreversible publish. Safe publish path: keep the release request in bopen-tools:publish-request, restore Linear access, verify the Approved ticket and exact 'irreversible acknowledged' comment, then retry through the gate."
    fi
    deny_permission "PUBLISH GATE: Linear API request failed or timed out (curl exit ${CURL_STATUS}). Cannot verify an Approved publish ticket. Safe publish path: run the bopen-tools:publish-request skill, restore Linear access, have a human approve the ticket, then retry through the gate; only a human terminal may set PUBLISH_BYPASS_TOKEN."
  fi

  # GraphQL top-level errors
  if printf '%s' "$LINEAR_RESPONSE" | jq -e '.errors and (.errors | length > 0)' >/dev/null 2>&1; then
    local ERR_MSG
    ERR_MSG=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '[.errors[].message] | join("; ")' 2>/dev/null || echo "unknown GraphQL error")
    deny_permission "PUBLISH GATE: Linear GraphQL error: ${ERR_MSG}. Safe publish path: run the bopen-tools:publish-request skill, fix the Linear request or credentials, have a human confirm the ticket is Approved, then retry through the gate."
  fi

  local TICKET_ID TICKET_IDENTIFIER TICKET_TITLE
  TICKET_ID=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].id // empty' 2>/dev/null || true)
  TICKET_IDENTIFIER=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].identifier // empty' 2>/dev/null || true)
  TICKET_TITLE=$(printf '%s' "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].title // empty' 2>/dev/null || true)

  # ---------------------------------------------------------------------------
  # On-chain: require "irreversible acknowledged" comment
  # ---------------------------------------------------------------------------

  if [[ "$IS_ON_CHAIN" == "true" && -n "$TICKET_ID" ]]; then
    local COMMENTS_QUERY='query IssueComments($id: String!) { issue(id: $id) { comments { nodes { body } } } }'
    local COMMENTS_BODY
    COMMENTS_BODY=$(jq -n \
      --arg query "$COMMENTS_QUERY" \
      --arg id "$TICKET_ID" \
      '{query: $query, variables: {id: $id}}')

    if [[ -n "${PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST:-}" ]]; then
      printf '%s' "$COMMENTS_BODY" > "$PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST"
    fi

    trap - ERR
    set +e
    local COMMENTS_RESPONSE
    COMMENTS_RESPONSE=$("$CURL_BIN" -sS --max-time 8 \
      -X POST "https://api.linear.app/graphql" \
      -H "Authorization: ${LINEAR_API_KEY}" \
      -H "Content-Type: application/json" \
      -d "$COMMENTS_BODY" 2>/dev/null)
    local COMMENTS_STATUS=$?
    set -e
    trap on_unexpected_error ERR

    if [[ $COMMENTS_STATUS -ne 0 || -z "$COMMENTS_RESPONSE" ]]; then
      deny_permission "PUBLISH GATE (on-chain): failed to load comments for ticket ${TICKET_IDENTIFIER}. Cannot verify irreversible acknowledgment. Safe publish path: keep the release in bopen-tools:publish-request, restore Linear access, verify the approver's exact 'irreversible acknowledged' comment, then retry through the gate."
    fi

    local HAS_ACK
    HAS_ACK=$(printf '%s' "$COMMENTS_RESPONSE" | \
      jq -r '[.data.issue.comments.nodes[].body // empty] | map(ascii_downcase) | any(test("irreversible acknowledged"))' 2>/dev/null || echo "false")

    if [[ "$HAS_ACK" != "true" ]]; then
      deny_permission "PUBLISH GATE (on-chain): Linear ticket ${TICKET_IDENTIFIER} (${TICKET_TITLE}) is Approved, but no comment containing \"irreversible acknowledged\" was found. Safe publish path: have the approver add that exact phrase to the bopen-tools:publish-request ticket, then retry through the gate."
    fi
  fi

  # ---------------------------------------------------------------------------
  # Gate decision
  # ---------------------------------------------------------------------------

  if [[ -n "$TICKET_ID" ]]; then
    echo "publish-gate: approved — Linear ticket ${TICKET_IDENTIFIER} (${TICKET_TITLE}) is Approved." >&2
    trap - ERR
    return 0
  fi

  local STOP_REASON="PUBLISH GATE: No Linear ticket found in \"Approved\" state with label \"publish\""
  if [[ -n "$PACKAGE_HINT" ]]; then
    STOP_REASON="${STOP_REASON} matching package \"${PACKAGE_HINT}\""
  fi
  STOP_REASON="${STOP_REASON}. Safe publish path: run the bopen-tools:publish-request skill to prepare the release plan in Linear, have a human review it and move the ticket to Approved, then retry through the gate."

  deny_permission "$STOP_REASON"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  input=$(cat)
  publish_gate_main "$input"
  exit 0
fi
