#!/bin/bash
# roster-guard: advisory context-only for general-purpose/Explore Task
# dispatches that match a roster specialist; silent for roster subagent_types
# and for dispatches with no specialist match. Never denies, and never emits
# a permissionDecision at all — additionalContext is a standalone PreToolUse
# field, and this hook must leave the permission flow completely untouched.

echo
echo "--- roster-guard ---"

FIXTURE_DIR=$(mktemp -d)
FIXTURE_INDEX="$FIXTURE_DIR/router-index.json"
cat > "$FIXTURE_INDEX" <<'EOF'
{
  "version": 1,
  "entries": [
    {
      "kind": "skill",
      "id": "bopen-tools:software-factory",
      "triggers": ["factory", "loop", "worker"],
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

# --- general-purpose dispatch matching the researcher agent ---
gp_input=$(jq -n '{tool_name:"Task", tool_input:{subagent_type:"general-purpose", description:"research task", prompt:"research the docs and gather sources on X twitter sentiment"}}')
run_hook "roster-guard.sh" "claude" "$gp_input"
assert_exit "roster-guard general-purpose exit" "0" "$HOOK_EXIT"
assert_json "roster-guard general-purpose json" "$HOOK_STDOUT"
assert_contains "roster-guard marker" "[BOPEN-ROSTER]" "$HOOK_STDOUT"
assert_contains "roster-guard suggests researcher" "bopen-tools:researcher" "$HOOK_STDOUT"
decision=$(printf '%s' "$HOOK_STDOUT" | jq -r '.hookSpecificOutput | has("permissionDecision")')
assert_eq "roster-guard carries no permission semantics" "false" "$decision"

# --- Explore dispatch also considered ---
explore_input=$(jq -n '{tool_name:"Task", tool_input:{subagent_type:"Explore", description:"", prompt:"research the docs and gather sources"}}')
run_hook "roster-guard.sh" "claude" "$explore_input"
assert_contains "roster-guard Explore also matches" "bopen-tools:researcher" "$HOOK_STDOUT"

# --- roster subagent_type already specific → silent ---
roster_input=$(jq -n '{tool_name:"Task", tool_input:{subagent_type:"bopen-tools:researcher", description:"research task", prompt:"research the docs and gather sources"}}')
run_hook "roster-guard.sh" "claude" "$roster_input"
assert_exit "roster-guard roster-subagent exit" "0" "$HOOK_EXIT"
assert_eq "roster-guard roster-subagent silent" "" "$HOOK_STDOUT"

# --- general-purpose dispatch with no specialist match → silent ---
nomatch_input=$(jq -n '{tool_name:"Task", tool_input:{subagent_type:"general-purpose", description:"", prompt:"summarize this short note about lunch plans"}}')
run_hook "roster-guard.sh" "claude" "$nomatch_input"
assert_eq "roster-guard no-match silent" "" "$HOOK_STDOUT"

# --- missing index → silent, no error ---
export BOPEN_ROUTER_INDEX="$FIXTURE_DIR/does-not-exist.json"
run_hook "roster-guard.sh" "claude" "$gp_input"
assert_exit "roster-guard missing-index exit" "0" "$HOOK_EXIT"
assert_eq "roster-guard missing-index silent" "" "$HOOK_STDOUT"

# --- disabled via config → silent ---
export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
CFG_DIR=$(mktemp -d)
cat > "$CFG_DIR/off.json" <<'EOF'
{"version":1,"hooks":{"roster-guard":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/off.json"
run_hook "roster-guard.sh" "claude" "$gp_input"
assert_eq "roster-guard disabled silent" "" "$HOOK_STDOUT"
unset BOPEN_HOOKS_CONFIG

unset BOPEN_ROUTER_INDEX
rm -rf "$FIXTURE_DIR" "$CFG_DIR"
