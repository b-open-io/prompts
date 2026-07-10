#!/bin/bash
# Table-driven bouncer tests (destructive vs nondestructive).

echo
echo "--- bouncer ---"

# name | command | expect_exit
# expect_exit 2 = blocked, 0 = allowed
bouncer_cases=(
  "block hard|git reset --hard HEAD|2"
  "block clean f|git clean -fd|2"
  "block checkout dashdash|git checkout -- file.txt|2"
  "block checkout force|git checkout -f main|2"
  "block restore worktree|git restore src/app.ts|2"
  "block restore worktree flag|git restore --worktree src/app.ts|2"
  "block stash clear|git stash clear|2"
  "allow unstage reset HEAD|git reset HEAD -- file.txt|0"
  "allow unstage reset path|git reset HEAD -- staged.txt other.txt|0"
  "allow restore staged|git restore --staged file.txt|0"
  "allow restore staged short|git restore -S file.txt|0"
  "allow stash drop (confirmation-tier elsewhere)|git stash drop|0"
  "allow ordinary status|git status|0"
  "allow log|git log -1|0"
)

for row in "${bouncer_cases[@]}"; do
  IFS='|' read -r name cmd expect <<< "$row"
  input=$(jq -n --arg c "$cmd" '{tool_name:"Bash", tool_input:{command:$c}}')
  run_hook "bouncer.sh" "claude" "$input"
  assert_exit "bouncer claude: $name (exit)" "$expect" "$HOOK_EXIT"
  if [[ "$expect" == "2" ]]; then
    assert_contains "bouncer claude: $name (deny json)" "permissionDecision" "$HOOK_STDERR"
  fi
done

# Codex same hard-block semantics
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git reset --hard"}}')
run_hook "bouncer.sh" "codex" "$input"
assert_exit "bouncer codex: hard reset blocked" "2" "$HOOK_EXIT"

input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git restore --staged foo"}}')
run_hook "bouncer.sh" "codex" "$input"
assert_exit "bouncer codex: restore --staged allowed" "0" "$HOOK_EXIT"
