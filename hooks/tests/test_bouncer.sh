#!/bin/bash
# Table-driven bouncer tests (destructive vs nondestructive).

echo
echo "--- bouncer ---"

# name | command | verdict
# On Claude a deny is stdout JSON + exit 0 (stderr + exit 2 renders as a
# "hook error" banner); the verdict is read from the output, not the exit code.
bouncer_cases=(
  "block hard|git reset --hard HEAD|deny"
  "block clean f|git clean -fd|deny"
  "block checkout dashdash|git checkout -- file.txt|deny"
  "block checkout force|git checkout -f main|deny"
  "block restore worktree|git restore src/app.ts|deny"
  "block restore worktree flag|git restore --worktree src/app.ts|deny"
  "block stash clear|git stash clear|deny"
  "allow unstage reset HEAD|git reset HEAD -- file.txt|allow"
  "allow unstage reset path|git reset HEAD -- staged.txt other.txt|allow"
  "allow restore staged|git restore --staged file.txt|allow"
  "allow restore staged short|git restore -S file.txt|allow"
  "allow stash drop (confirmation-tier elsewhere)|git stash drop|allow"
  "allow ordinary status|git status|allow"
  "allow log|git log -1|allow"
)

for row in "${bouncer_cases[@]}"; do
  IFS='|' read -r name cmd verdict <<< "$row"
  input=$(jq -n --arg c "$cmd" '{tool_name:"Bash", tool_input:{command:$c}}')
  run_hook "bouncer.sh" "claude" "$input"
  assert_exit "bouncer claude: $name (exit)" "0" "$HOOK_EXIT"
  if [[ "$verdict" == "deny" ]]; then
    assert_contains "bouncer claude: $name (deny json)" '"permissionDecision":"deny"' "$HOOK_STDOUT"
    assert_contains "bouncer claude: $name (event name)" '"hookEventName":"PreToolUse"' "$HOOK_STDOUT"
    assert_contains "bouncer claude: $name (safe alternative)" "Safe alternative:" "$HOOK_STDOUT"
  else
    assert_not_contains "bouncer claude: $name (no deny)" '"permissionDecision":"deny"' "$HOOK_STDOUT$HOOK_STDERR"
  fi
done

# Codex keeps hard-block semantics: stderr JSON + exit 2
input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git reset --hard"}}')
run_hook "bouncer.sh" "codex" "$input"
assert_exit "bouncer codex: hard reset blocked" "2" "$HOOK_EXIT"
assert_contains "bouncer codex: deny json on stderr" '"permissionDecision":"deny"' "$HOOK_STDERR"
assert_contains "bouncer codex: safe alternative on stderr" "git restore --staged" "$HOOK_STDERR"

input=$(jq -n '{tool_name:"Bash", tool_input:{command:"git restore --staged foo"}}')
run_hook "bouncer.sh" "codex" "$input"
assert_exit "bouncer codex: restore --staged allowed" "0" "$HOOK_EXIT"
