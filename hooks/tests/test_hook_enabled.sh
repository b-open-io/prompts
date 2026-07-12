#!/bin/bash
# hook_enabled gating: explicit false disables; everything else stays enabled.

echo
echo "--- hook-enabled config gating ---"

CFG_DIR=$(mktemp -d)
destructive=$(jq -n '{tool_name:"Bash", tool_input:{command:"git reset --hard HEAD"}}')

# Explicit false → hook steps aside entirely (no deny, exit 0)
cat > "$CFG_DIR/off.json" <<'EOF'
{"version":1,"hooks":{"bouncer":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/off.json"
run_hook "bouncer.sh" "claude" "$destructive"
assert_exit "hook-enabled disabled exit" "0" "$HOOK_EXIT"
assert_not_contains "hook-enabled disabled no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Explicit true → guard active
cat > "$CFG_DIR/on.json" <<'EOF'
{"version":1,"hooks":{"bouncer":true}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/on.json"
run_hook "bouncer.sh" "claude" "$destructive"
assert_contains "hook-enabled enabled denies" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# Key absent from config → enabled (default-on)
cat > "$CFG_DIR/other.json" <<'EOF'
{"version":1,"hooks":{"hammertime":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/other.json"
run_hook "bouncer.sh" "claude" "$destructive"
assert_contains "hook-enabled unrelated key still denies" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# Broken JSON → enabled (a broken config must never switch guards off)
printf '{not json' > "$CFG_DIR/broken.json"
export BOPEN_HOOKS_CONFIG="$CFG_DIR/broken.json"
run_hook "bouncer.sh" "claude" "$destructive"
assert_contains "hook-enabled broken config still denies" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# Missing file → enabled
export BOPEN_HOOKS_CONFIG="$CFG_DIR/nonexistent.json"
run_hook "bouncer.sh" "claude" "$destructive"
assert_contains "hook-enabled missing config still denies" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# Gating also applies to damage-control and codex runtime
cat > "$CFG_DIR/dc-off.json" <<'EOF'
{"version":1,"hooks":{"damage-control":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/dc-off.json"
env_write=$(jq -n '{tool_name:"Write", tool_input:{file_path:"/tmp/project/.env", content:"x=1"}}')
run_hook "damage-control.sh" "claude" "$env_write"
assert_exit "hook-enabled dc disabled exit" "0" "$HOOK_EXIT"
assert_not_contains "hook-enabled dc disabled no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"
run_hook "damage-control.sh" "codex" "$env_write"
assert_exit "hook-enabled dc disabled codex exit" "0" "$HOOK_EXIT"

unset BOPEN_HOOKS_CONFIG
rm -rf "$CFG_DIR"
