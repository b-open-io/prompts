#!/bin/bash
# Claude ask vs Codex deny for confirmation-tier patterns.

echo
echo "--- damage-control confirmation (claude ask vs codex deny) ---"

confirm_cmd='git stash drop'
input=$(jq -n --arg c "$confirm_cmd" '{tool_name:"Bash", tool_input:{command:$c}}')

# Claude: permissionDecision ask, exit 0
run_hook "damage-control.sh" "claude" "$input"
assert_exit "damage-control claude stash drop exit" "0" "$HOOK_EXIT"
assert_contains "damage-control claude ask field" '"permissionDecision":"ask"' "$HOOK_STDOUT"
assert_json "damage-control claude ask json" "$HOOK_STDOUT"

# Codex: deny, exit 2, no ask/continue fields
run_hook "damage-control.sh" "codex" "$input"
assert_exit "damage-control codex stash drop exit" "2" "$HOOK_EXIT"
assert_contains "damage-control codex deny field" '"permissionDecision":"deny"' "$HOOK_STDERR"
assert_not_contains "damage-control codex no ask" '"permissionDecision":"ask"' "$HOOK_STDERR$HOOK_STDOUT"
assert_not_contains "damage-control codex no continue" '"continue"' "$HOOK_STDERR$HOOK_STDOUT"

# Destructive still hard-blocked on both
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git reset --hard HEAD"}}')
run_hook "damage-control.sh" "claude" "$input"
assert_exit "damage-control claude hard reset" "2" "$HOOK_EXIT"
run_hook "damage-control.sh" "codex" "$input"
assert_exit "damage-control codex hard reset" "2" "$HOOK_EXIT"

# force-with-lease allowed
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git push --force-with-lease origin main"}}')
run_hook "damage-control.sh" "claude" "$input"
assert_exit "damage-control allow force-with-lease" "0" "$HOOK_EXIT"

# zero-access write blocked
input=$(jq -n '{tool_name:"Write", tool_input:{file_path:"/tmp/project/.env", content:"x=1"}}')
run_hook "damage-control.sh" "claude" "$input"
assert_exit "damage-control block write .env" "2" "$HOOK_EXIT"

# .env.example exception allowed
input=$(jq -n '{tool_name:"Write", tool_input:{file_path:"/tmp/project/.env.example", content:"x=1"}}')
run_hook "damage-control.sh" "claude" "$input"
assert_exit "damage-control allow .env.example" "0" "$HOOK_EXIT"
