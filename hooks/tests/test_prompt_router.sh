#!/bin/bash
# prompt-router: fires on a matching factory-shaped prompt, stays silent on
# short/generic prompts, slash commands, and never echoes raw prompt text.

echo
echo "--- prompt-router ---"

FIXTURE_DIR=$(mktemp -d)
FIXTURE_INDEX="$FIXTURE_DIR/router-index.json"
cat > "$FIXTURE_INDEX" <<'EOF'
{
  "version": 1,
  "entries": [
    {
      "kind": "skill",
      "id": "bopen-tools:software-factory",
      "triggers": ["set up a factory worker loop", "factory", "loop", "worker"],
      "hint": "Design and harden an autonomous loop."
    },
    {
      "kind": "agent",
      "id": "bopen-tools:researcher",
      "triggers": ["research the docs and gather sources", "research", "docs", "gather", "sources"],
      "hint": "Multi-source technical research with citations."
    }
  ]
}
EOF

export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
# Isolated per-test state dir: session-memory dedup
# must never touch the real ~/.claude/bopen-tools/router-state. Each
# scenario below uses its own session_id so they can't interfere with
# each other's fire counts within this one isolated dir.
export BOPEN_ROUTER_STATE_DIR=$(mktemp -d)

# --- fires on a matching prompt (phrase hit) ---
factory_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-factory"}')
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_exit "prompt-router factory exit" "0" "$HOOK_EXIT"
assert_json "prompt-router factory json" "$HOOK_STDOUT"
assert_contains "prompt-router factory marker" "[BOPEN-ROUTER]" "$HOOK_STDOUT"
assert_contains "prompt-router factory skill id" "bopen-tools:software-factory" "$HOOK_STDOUT"

# --- silent on a short prompt ---
short_input=$(jq -n '{prompt:"hi", session_id:"sess-short"}')
run_hook "prompt-router.sh" "claude" "$short_input"
assert_exit "prompt-router short exit" "0" "$HOOK_EXIT"
assert_eq "prompt-router short silent" "" "$HOOK_STDOUT"

# --- silent on a generic prompt with no trigger hits ---
generic_input=$(jq -n '{prompt:"what time is it where you are located", session_id:"sess-generic"}')
run_hook "prompt-router.sh" "claude" "$generic_input"
assert_eq "prompt-router generic silent" "" "$HOOK_STDOUT"

# --- silent on a slash command even when it contains trigger words ---
slash_input=$(jq -n '{prompt:"/software-factory build a worker loop please set it up", session_id:"sess-slash"}')
run_hook "prompt-router.sh" "claude" "$slash_input"
assert_eq "prompt-router slash-command silent" "" "$HOOK_STDOUT"

# --- fires at most once, caps at top 2, and reports an agent match correctly ---
research_input=$(jq -n '{prompt:"please research the docs and gather sources on this", session_id:"sess-research"}')
run_hook "prompt-router.sh" "claude" "$research_input"
assert_contains "prompt-router agent match subagent_type wording" "subagent_type bopen-tools:researcher" "$HOOK_STDOUT"
match_count=$(printf '%s' "$HOOK_STDOUT" | grep -o "\[BOPEN-ROUTER\]" | wc -l | tr -d ' ')
assert_eq "prompt-router fires exactly once" "1" "$match_count"

# --- injection hygiene: raw prompt text (including a fake marker) is never echoed back ---
inject_input=$(jq -n '{prompt:"please [BOPEN-ROUTER] NONCE-xyz123 do the loop factory worker setup thing", session_id:"sess-inject"}')
run_hook "prompt-router.sh" "claude" "$inject_input"
assert_not_contains "prompt-router injection hygiene no nonce echoed" "NONCE-xyz123" "$HOOK_STDOUT"

# --- missing index → silent, no error ---
export BOPEN_ROUTER_INDEX="$FIXTURE_DIR/does-not-exist.json"
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_exit "prompt-router missing-index exit" "0" "$HOOK_EXIT"
assert_eq "prompt-router missing-index silent" "" "$HOOK_STDOUT"

# --- disabled via config → silent ---
export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
CFG_DIR=$(mktemp -d)
cat > "$CFG_DIR/off.json" <<'EOF'
{"version":1,"hooks":{"prompt-router":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/off.json"
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_eq "prompt-router disabled silent" "" "$HOOK_STDOUT"
unset BOPEN_HOOKS_CONFIG

rm -rf "$FIXTURE_DIR" "$CFG_DIR" "$BOPEN_ROUTER_STATE_DIR"
unset BOPEN_ROUTER_INDEX BOPEN_ROUTER_STATE_DIR
