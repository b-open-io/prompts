#!/bin/bash
# agent-browser-solo fetch-and-serve tests (mocked agent-browser).

echo
echo "--- agent-browser-solo ---"

MOCK_AB=$(mktemp -d)/agent-browser
cat > "$MOCK_AB" <<'MOCK'
#!/bin/bash
# Mock agent-browser: --session <name> <cmd> ...
shift 2   # drop --session <name>
case "$1" in
  open)  exit 0 ;;
  get)
    case "$2" in
      title) echo "Mock Page Title" ;;
      text)
        # Real CLI requires a selector: `get text body`
        if [[ "${3:-}" != "body" ]]; then
          echo "Missing arguments for: get text" >&2
          exit 0
        fi
        echo "mock extracted page text with useful content"
        ;;
    esac
    ;;
  close) exit 0 ;;
esac
exit 0
MOCK
chmod +x "$MOCK_AB"

FAIL_AB=$(mktemp -d)/agent-browser
cat > "$FAIL_AB" <<'MOCK'
#!/bin/bash
exit 1
MOCK
chmod +x "$FAIL_AB"

fetch_input=$(jq -n '{tool_name:"WebFetch", tool_input:{url:"https://example.com/docs"}}')

# Claude: content served in a clean structured deny (stdout, exit 0)
export AGENT_BROWSER_SOLO_BIN="$MOCK_AB"
run_hook "agent-browser-solo.sh" "claude" "$fetch_input"
assert_exit "ab-solo claude serve exit" "0" "$HOOK_EXIT"
assert_contains "ab-solo claude deny json" '"permissionDecision":"deny"' "$HOOK_STDOUT"
assert_contains "ab-solo claude event name" '"hookEventName":"PreToolUse"' "$HOOK_STDOUT"
assert_contains "ab-solo claude untrusted marker" "UNTRUSTED WEB CONTENT" "$HOOK_STDOUT"
assert_contains "ab-solo claude page text" "mock extracted page text" "$HOOK_STDOUT"
assert_contains "ab-solo claude url echoed" "example.com/docs" "$HOOK_STDOUT"
assert_not_contains "ab-solo claude no systemMessage" '"systemMessage"' "$HOOK_STDOUT"

# Codex: same content, stderr + exit 2
run_hook "agent-browser-solo.sh" "codex" "$fetch_input"
assert_exit "ab-solo codex serve exit" "2" "$HOOK_EXIT"
assert_contains "ab-solo codex deny json" '"permissionDecision":"deny"' "$HOOK_STDERR"
assert_contains "ab-solo codex page text" "mock extracted page text" "$HOOK_STDERR"

# WebSearch untouched
search_input=$(jq -n '{tool_name:"WebSearch", tool_input:{query:"anything"}}')
run_hook "agent-browser-solo.sh" "claude" "$search_input"
assert_exit "ab-solo websearch allow" "0" "$HOOK_EXIT"
assert_not_contains "ab-solo websearch no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Fetch failure → allow WebFetch through, no deny, no error
export AGENT_BROWSER_SOLO_BIN="$FAIL_AB"
run_hook "agent-browser-solo.sh" "claude" "$fetch_input"
assert_exit "ab-solo fetch-fail allow" "0" "$HOOK_EXIT"
assert_not_contains "ab-solo fetch-fail no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Not installed → allow through with install hint
export AGENT_BROWSER_SOLO_BIN="/nonexistent/agent-browser"
run_hook "agent-browser-solo.sh" "claude" "$fetch_input"
assert_exit "ab-solo missing allow" "0" "$HOOK_EXIT"
assert_contains "ab-solo missing hint" "npm install -g agent-browser" "$HOOK_STDOUT"
assert_not_contains "ab-solo missing no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Size cap enforced with truncation notice
export AGENT_BROWSER_SOLO_BIN="$MOCK_AB"
export AGENT_BROWSER_SOLO_MAX_BYTES=10
run_hook "agent-browser-solo.sh" "claude" "$fetch_input"
assert_contains "ab-solo truncation notice" "truncated at 10 bytes" "$HOOK_STDOUT"
assert_not_contains "ab-solo truncated body" "useful content" "$HOOK_STDOUT"
unset AGENT_BROWSER_SOLO_MAX_BYTES

unset AGENT_BROWSER_SOLO_BIN
rm -rf "$(dirname "$MOCK_AB")" "$(dirname "$FAIL_AB")"
