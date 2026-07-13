#!/bin/bash
# pretooluse-bash.sh — consolidated single PreToolUse Bash entry point.
# Verifies bouncer -> damage-control -> publish-gate order, short-circuit on
# first deny, allow-through when none match, and that each check's
# hook_enabled("<name>") gate still works when composed into one process.

echo
echo "--- pretooluse-bash (consolidated chain) ---"

# Allow: no check matches, single clean pass through all three.
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"echo hello"}}')
run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash allow exit" "0" "$HOOK_EXIT"
assert_not_contains "pretooluse-bash allow no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# bouncer fires first: a bouncer-only pattern (git checkout -- <path>) denies
# via the bouncer's own message, proving bouncer runs before damage-control.
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git checkout -- file.txt"}}')
run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash bouncer-first exit" "0" "$HOOK_EXIT"
assert_contains "pretooluse-bash bouncer-first deny" "can destroy uncommitted work" "$HOOK_STDOUT"

# damage-control's own destructiveCommands list still fires when bouncer
# does not match (e.g. chmod 777, which bouncer has no rule for).
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"chmod 777 /tmp/x"}}')
run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash damage-control fires exit" "0" "$HOOK_EXIT"
assert_contains "pretooluse-bash damage-control fires deny" "BLOCKED by damage-control" "$HOOK_STDOUT"

# OPL-2842 regression, exercised through the consolidated entry too: a
# chained command that merely mentions a protected path via `cat` (not `rm`)
# must not trip the no-delete check.
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"rm /tmp/x && cat ~/.claude/plugins/foo"}}')
run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash rm-elsewhere-mention allow exit" "0" "$HOOK_EXIT"
assert_not_contains "pretooluse-bash rm-elsewhere-mention no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Real deletion of the protected dir still denies through the chain.
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"rm -rf ~/.claude"}}')
run_hook "pretooluse-bash.sh" "claude" "$input"
assert_contains "pretooluse-bash rm protected dir deny" '"permissionDecision":"deny"' "$HOOK_STDOUT"

# hook_enabled semantics preserved when composed: disabling bouncer lets a
# bouncer-only pattern fall through (no other check matches "git stash clear"
# as hard-blocked... damage-control has no destructiveCommands entry for it,
# so with bouncer off it must now pass cleanly).
CFG_DIR=$(mktemp -d)
printf '{"hooks":{"bouncer":false}}' > "$CFG_DIR/bouncer-off.json"
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git stash clear"}}')
BOPEN_HOOKS_CONFIG="$CFG_DIR/bouncer-off.json" run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash bouncer-disabled exit" "0" "$HOOK_EXIT"
assert_not_contains "pretooluse-bash bouncer-disabled no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"

# Disabling all three lets even a hard-blocked command through cleanly.
printf '{"hooks":{"bouncer":false,"damage-control":false,"publish-gate":false}}' > "$CFG_DIR/all-off.json"
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"chmod 777 /tmp/x"}}')
BOPEN_HOOKS_CONFIG="$CFG_DIR/all-off.json" run_hook "pretooluse-bash.sh" "claude" "$input"
assert_exit "pretooluse-bash all-disabled exit" "0" "$HOOK_EXIT"
assert_not_contains "pretooluse-bash all-disabled no deny" "permissionDecision" "$HOOK_STDOUT$HOOK_STDERR"
rm -rf "$CFG_DIR"

# Codex runtime: chain still short-circuits with codex's stderr+exit2 shape.
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"chmod 777 /tmp/x"}}')
run_hook "pretooluse-bash.sh" "codex" "$input"
assert_exit "pretooluse-bash codex deny exit" "2" "$HOOK_EXIT"
assert_contains "pretooluse-bash codex deny field" '"permissionDecision":"deny"' "$HOOK_STDERR"

# The individual scripts remain independently runnable (Codex + tests call
# them directly; this is not a redundant check — it guards against the
# standalone-execution path guard being broken by the refactor).
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git reset --hard"}}')
run_hook "bouncer.sh" "claude" "$input"
assert_contains "pretooluse-bash bouncer.sh standalone still works" '"permissionDecision":"deny"' "$HOOK_STDOUT"
run_hook "damage-control.sh" "claude" "$input"
assert_contains "pretooluse-bash damage-control.sh standalone still works" '"permissionDecision":"deny"' "$HOOK_STDOUT"
