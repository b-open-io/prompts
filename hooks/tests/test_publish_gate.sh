#!/bin/bash
# Mocked publish-gate: approved / rejected / API error / timeout / on-chain ack.
# Asserts outbound request JSON parses.

echo
echo "--- publish-gate ---"

MOCK_BIN=$(mktemp -d)
CAPTURE_REQ=$(mktemp)
CAPTURE_COMMENTS=$(mktemp)

# Fake curl that reads scenarios from PUBLISH_GATE_MOCK_MODE
cat > "$MOCK_BIN/curl" <<'MOCK'
#!/bin/bash
# Minimal curl mock for publish-gate tests.
mode="${PUBLISH_GATE_MOCK_MODE:-approved}"
# Capture body from -d
body=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d) body="$2"; shift 2 ;;
    -d*) body="${1#-d}"; shift ;;
    *) shift ;;
  esac
done
# Store last body for inspection
if [[ -n "${PUBLISH_GATE_CAPTURE_REQUEST:-}" && -n "$body" ]]; then
  # Only overwrite primary capture for issues query
  if printf '%s' "$body" | grep -q 'Issues'; then
    printf '%s' "$body" > "$PUBLISH_GATE_CAPTURE_REQUEST"
  fi
fi
if [[ -n "${PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST:-}" && -n "$body" ]]; then
  if printf '%s' "$body" | grep -q 'IssueComments'; then
    printf '%s' "$body" > "$PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST"
  fi
fi

case "$mode" in
  approved)
    if printf '%s' "$body" | grep -q 'IssueComments'; then
      echo '{"data":{"issue":{"comments":{"nodes":[{"body":"irreversible acknowledged"}]}}}}'
    else
      echo '{"data":{"issues":{"nodes":[{"id":"iss_1","identifier":"PUB-1","title":"publish bopen-tools"}]}}}'
    fi
    ;;
  rejected)
    echo '{"data":{"issues":{"nodes":[]}}}'
    ;;
  api_error)
    echo '{"errors":[{"message":"boom"}],"data":null}'
    ;;
  timeout)
    exit 28
    ;;
  on_chain_no_ack)
    if printf '%s' "$body" | grep -q 'IssueComments'; then
      echo '{"data":{"issue":{"comments":{"nodes":[{"body":"looks good"}]}}}}'
    else
      echo '{"data":{"issues":{"nodes":[{"id":"iss_1","identifier":"PUB-1","title":"publish bopen-tools"}]}}}'
    fi
    ;;
  on_chain_ack)
    if printf '%s' "$body" | grep -q 'IssueComments'; then
      echo '{"data":{"issue":{"comments":{"nodes":[{"body":"IRREVERSIBLE ACKNOWLEDGED by me"}]}}}}'
    else
      echo '{"data":{"issues":{"nodes":[{"id":"iss_1","identifier":"PUB-1","title":"publish bopen-tools"}]}}}'
    fi
    ;;
  *)
    echo '{"data":{"issues":{"nodes":[]}}}'
    ;;
esac
exit 0
MOCK
chmod +x "$MOCK_BIN/curl"

export LINEAR_API_KEY="test-key-not-real"
export PUBLISH_GATE_CURL="$MOCK_BIN/curl"
export PUBLISH_GATE_CAPTURE_REQUEST="$CAPTURE_REQ"
export PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST="$CAPTURE_COMMENTS"
unset PUBLISH_BYPASS_TOKEN

run_publish() {
  local runtime="$1"
  local cmd="$2"
  local mode="$3"
  local cwd="${4:-$ROOT}"
  export PUBLISH_GATE_MOCK_MODE="$mode"
  : > "$CAPTURE_REQ"
  : > "$CAPTURE_COMMENTS"
  local input
  input=$(jq -n --arg c "$cmd" --arg cwd "$cwd" \
    '{tool_name:"Bash", tool_input:{command:$c}, cwd:$cwd}')
  run_hook "publish-gate.sh" "$runtime" "$input"
}

# Non-gated command passes without API
export PUBLISH_GATE_MOCK_MODE="rejected"
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"echo hello"}, cwd:"/tmp"}')
run_hook "publish-gate.sh" "claude" "$input"
assert_exit "publish-gate non-gated allow" "0" "$HOOK_EXIT"

# Shell-chain publish detection (claude deny: stdout JSON + exit 0)
run_publish "claude" "cd /tmp && npm publish" "rejected"
assert_exit "publish-gate chain npm publish gated" "0" "$HOOK_EXIT"
assert_contains "publish-gate chain deny" "PUBLISH GATE" "$HOOK_STDOUT"
assert_contains "publish-gate chain deny field" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# Approved
run_publish "claude" "npm publish" "approved"
assert_exit "publish-gate approved allow" "0" "$HOOK_EXIT"
assert_json "publish-gate outbound request JSON" "$(cat "$CAPTURE_REQ")"
# Must use variables, not broken string interpolation
assert_contains "publish-gate uses GraphQL variables" "variables" "$(cat "$CAPTURE_REQ")"
assert_contains "publish-gate query field" "query" "$(cat "$CAPTURE_REQ")"

# Rejected
run_publish "codex" "bun publish" "rejected"
assert_exit "publish-gate rejected deny" "2" "$HOOK_EXIT"
assert_contains "publish-gate rejected reason" "No Linear ticket" "$HOOK_STDERR"
assert_not_contains "publish-gate rejected no continue field" '"continue"' "$HOOK_STDERR$HOOK_STDOUT"

# API error
run_publish "claude" "npm publish" "api_error"
assert_exit "publish-gate api error deny" "0" "$HOOK_EXIT"
assert_contains "publish-gate api error msg" "GraphQL error" "$HOOK_STDOUT"

# Timeout
run_publish "claude" "npm publish" "timeout"
assert_exit "publish-gate timeout deny" "0" "$HOOK_EXIT"
assert_contains "publish-gate timeout msg" "timed out" "$HOOK_STDOUT"

# On-chain without ack
run_publish "claude" "clawnet publish --on-chain" "on_chain_no_ack"
assert_exit "publish-gate on-chain no ack deny" "0" "$HOOK_EXIT"
assert_contains "publish-gate on-chain no ack msg" "irreversible acknowledged" "$HOOK_STDOUT"
assert_json "publish-gate comments request JSON" "$(cat "$CAPTURE_COMMENTS")"

# On-chain with ack
run_publish "claude" "clawnet publish --on-chain" "on_chain_ack"
assert_exit "publish-gate on-chain ack allow" "0" "$HOOK_EXIT"

# Missing API key on-chain fails closed
unset LINEAR_API_KEY
input=$(jq -n --arg cwd "$ROOT" \
  '{tool_name:"Bash", tool_input:{command:"clawnet publish --on-chain"}, cwd:$cwd}')
run_hook "publish-gate.sh" "claude" "$input"
assert_exit "publish-gate on-chain no key deny" "0" "$HOOK_EXIT"
assert_contains "publish-gate on-chain no key deny field" '"permissionDecision":"deny"' "$HOOK_STDOUT"
export LINEAR_API_KEY="test-key-not-real"

rm -rf "$MOCK_BIN" "$CAPTURE_REQ" "$CAPTURE_COMMENTS"
unset PUBLISH_GATE_CURL PUBLISH_GATE_CAPTURE_REQUEST PUBLISH_GATE_CAPTURE_COMMENTS_REQUEST PUBLISH_GATE_MOCK_MODE
