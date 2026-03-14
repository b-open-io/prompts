#!/bin/bash
# publish-gate.sh
# PreToolUse hook: requires a Linear ticket in "Approved" state with label "publish"
# before allowing publish commands to execute.
#
# Exit 0 (no output)  = allow
# Exit 0 (JSON)       = stop turn, explain approval workflow to model
# Exit 2 (JSON stderr)= hard block (only for on-chain without LINEAR_API_KEY)
#
# Commands intercepted:
#   - git push origin master / main (only when HEAD commit starts with "Release v")
#   - bun publish
#   - npm publish
#   - clawnet publish --on-chain

set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // ""')

# Only intercept Bash tool calls
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

command_str=$(echo "$input" | jq -r '.tool_input.command // ""')
command_lower=$(echo "$command_str" | tr '[:upper:]' '[:lower:]')

# ---------------------------------------------------------------------------
# Detect whether this command is a publish-gated command
# ---------------------------------------------------------------------------

IS_GIT_PUSH=false
IS_ON_CHAIN=false
IS_GATED=false
PACKAGE_HINT=""

# git push origin master / main — only if HEAD commit starts with "Release v"
if echo "$command_str" | grep -qE 'git push (origin )?(master|main)\b'; then
  RECENT_MSG=$(git -C "${CLAUDE_WORKING_DIR:-$PWD}" log -1 --format="%s" 2>/dev/null || echo "")
  if echo "$RECENT_MSG" | grep -qiE '^Release v[0-9]'; then
    IS_GIT_PUSH=true
    IS_GATED=true
    for f in "${CLAUDE_WORKING_DIR:-$PWD}/.claude-plugin/plugin.json" \
              "${CLAUDE_WORKING_DIR:-$PWD}/package.json"; do
      if [[ -f "$f" ]]; then
        PACKAGE_HINT=$(jq -r '.name // ""' "$f" 2>/dev/null || echo "")
        [[ -n "$PACKAGE_HINT" ]] && break
      fi
    done
    [[ -z "$PACKAGE_HINT" ]] && PACKAGE_HINT=$(basename "${CLAUDE_WORKING_DIR:-$PWD}")
  fi
fi

# bun publish / npm publish
if echo "$command_lower" | grep -qE '^(bun|npm) publish(\s|$)'; then
  IS_GATED=true
  PACKAGE_HINT=$(jq -r '.name // ""' "${CLAUDE_WORKING_DIR:-$PWD}/package.json" 2>/dev/null || echo "")
  [[ -z "$PACKAGE_HINT" ]] && PACKAGE_HINT=$(basename "${CLAUDE_WORKING_DIR:-$PWD}")
fi

# clawnet publish --on-chain
if echo "$command_lower" | grep -qE 'clawnet publish.*--on-chain'; then
  IS_GATED=true
  IS_ON_CHAIN=true
  PACKAGE_HINT=$(jq -r '.name // ""' "${CLAUDE_WORKING_DIR:-$PWD}/package.json" 2>/dev/null || echo "")
  [[ -z "$PACKAGE_HINT" ]] && PACKAGE_HINT=$(basename "${CLAUDE_WORKING_DIR:-$PWD}")
fi

# Not a gated command — allow immediately
if [[ "$IS_GATED" != "true" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Check for manual bypass (must be set in the human's terminal, not by agent)
# ---------------------------------------------------------------------------

if [[ -n "${PUBLISH_BYPASS_TOKEN:-}" ]]; then
  echo "publish-gate: BYPASS USED for '${PACKAGE_HINT}' — PUBLISH_BYPASS_TOKEN was set manually." >&2
  exit 0
fi

# ---------------------------------------------------------------------------
# Handle missing LINEAR_API_KEY
# ---------------------------------------------------------------------------

if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  if [[ "$IS_ON_CHAIN" == "true" ]]; then
    printf '{
  "hookSpecificOutput": {
    "permissionDecision": "deny"
  },
  "systemMessage": "PUBLISH GATE (on-chain): LINEAR_API_KEY is not set. clawnet publish --on-chain broadcasts an irreversible BSV transaction to mainnet. Set LINEAR_API_KEY and obtain an Approved Linear ticket before proceeding."
}' >&2
    exit 2
  else
    echo "publish-gate: WARNING — LINEAR_API_KEY not set. Skipping approval check for reversible publish of '${PACKAGE_HINT}'." >&2
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
# Query Linear for an "Approved" ticket with label "publish" for this package
# ---------------------------------------------------------------------------

if [[ -n "$PACKAGE_HINT" ]]; then
  GQL_FILTER='{"state":{"name":{"eq":"Approved"}},"labels":{"name":{"containsIgnoreCase":"publish"}},"title":{"containsIgnoreCase":"'"$PACKAGE_HINT"'"}}'
else
  GQL_FILTER='{"state":{"name":{"eq":"Approved"}},"labels":{"name":{"containsIgnoreCase":"publish"}}}'
fi

GQL_QUERY='{"query":"{ issues(filter: '"$GQL_FILTER"') { nodes { id identifier title } } }"}'

LINEAR_RESPONSE=$(curl -s --max-time 8 \
  -X POST https://api.linear.app/graphql \
  -H "Authorization: ${LINEAR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$GQL_QUERY" 2>/dev/null || echo '{"data":{"issues":{"nodes":[]}}}')

TICKET_ID=$(echo "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].id // ""')
TICKET_IDENTIFIER=$(echo "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].identifier // ""')
TICKET_TITLE=$(echo "$LINEAR_RESPONSE" | jq -r '.data.issues.nodes[0].title // ""')

# ---------------------------------------------------------------------------
# For on-chain: require "irreversible acknowledged" comment in addition
# ---------------------------------------------------------------------------

if [[ "$IS_ON_CHAIN" == "true" && -n "$TICKET_ID" ]]; then
  COMMENTS_QUERY='{"query":"{ issue(id: \"'"$TICKET_ID"'\") { comments { nodes { body } } } }"}'
  COMMENTS_RESPONSE=$(curl -s --max-time 8 \
    -X POST https://api.linear.app/graphql \
    -H "Authorization: ${LINEAR_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$COMMENTS_QUERY" 2>/dev/null || echo '{"data":{"issue":{"comments":{"nodes":[]}}}}')

  HAS_ACK=$(echo "$COMMENTS_RESPONSE" | \
    jq -r '[.data.issue.comments.nodes[].body] | map(ascii_downcase) | any(test("irreversible acknowledged"))' 2>/dev/null || echo "false")

  if [[ "$HAS_ACK" != "true" ]]; then
    printf '{"continue":false,"stopReason":"PUBLISH GATE (on-chain): Linear ticket %s (%s) is Approved, but no comment containing \"irreversible acknowledged\" was found. The approver must add a comment with that exact phrase to confirm they understand this BSV transaction cannot be undone."}' \
      "$TICKET_IDENTIFIER" "$TICKET_TITLE"
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
# Gate decision
# ---------------------------------------------------------------------------

if [[ -n "$TICKET_ID" ]]; then
  echo "publish-gate: approved — Linear ticket ${TICKET_IDENTIFIER} (${TICKET_TITLE}) is Approved." >&2
  exit 0
fi

# No approved ticket found — stop the turn and explain the workflow

STOP_REASON="PUBLISH GATE: No Linear ticket found in \"Approved\" state with label \"publish\""
[[ -n "$PACKAGE_HINT" ]] && STOP_REASON="${STOP_REASON} matching package \"${PACKAGE_HINT}\""
STOP_REASON="${STOP_REASON}. Use the publish-request skill to prepare a release plan and post it to Linear. Then ask the user to review and move the ticket to Approved. Once confirmed, retry the publish command."

printf '{"continue":false,"stopReason":"%s"}' "$(echo "$STOP_REASON" | sed 's/"/\\"/g')"
exit 0
