#!/bin/bash
# session-context: another git repo + non-git directory; real newlines; no plugin cache.

echo
echo "--- session-context ---"

# --- non-git directory ---
NON_GIT=$(mktemp -d)
input=$(jq -n --arg cwd "$NON_GIT" '{cwd:$cwd, source:"startup"}')
run_hook "session-context.sh" "claude" "$input"
assert_exit "session-context non-git exit" "0" "$HOOK_EXIT"
assert_json "session-context non-git json" "$HOOK_STDOUT"
ctx=$(printf '%s' "$HOOK_STDOUT" | jq -r '.hookSpecificOutput.additionalContext')
assert_contains "session-context non-git has cwd" "$NON_GIT" "$ctx"
assert_contains "session-context non-git notes no git" "not a repository" "$ctx"
assert_not_contains "session-context non-git no plugin inventory" "Plugin inventory" "$ctx"
# Real newlines (not literal \n sequence as the only separators)
newline_count=$(printf '%s' "$ctx" | awk 'END{print NR}')
if [[ "${newline_count:-0}" -ge 2 ]]; then
  PASS=$((PASS + 1))
  printf '  PASS  session-context non-git real newlines (%s lines)\n' "$newline_count"
else
  FAIL=$((FAIL + 1))
  failures+=("session-context non-git: expected multi-line context, got lines=$newline_count")
  printf '  FAIL  session-context non-git real newlines\n'
fi
# Must not report the plugin hooks directory as the workspace when cwd differs
assert_not_contains "session-context non-git not plugin root as cwd label only" "hooks/session-context" "$ctx"
rm -rf "$NON_GIT"

# --- another git repo (not this plugin) ---
OTHER_GIT=$(mktemp -d)
(
  cd "$OTHER_GIT" || exit 1
  git init -q
  git config user.email "test@example.com"
  git config user.name "Test"
  echo "hello" > README.txt
  git add README.txt
  git commit -qm "init"
)
input=$(jq -n --arg cwd "$OTHER_GIT" '{cwd:$cwd}')
run_hook "session-context.sh" "codex" "$input"
assert_exit "session-context other-git exit" "0" "$HOOK_EXIT"
ctx=$(printf '%s' "$HOOK_STDOUT" | jq -r '.hookSpecificOutput.additionalContext')
assert_contains "session-context other-git cwd" "$OTHER_GIT" "$ctx"
assert_contains "session-context other-git branch" "Branch:" "$ctx"
assert_contains "session-context other-git commits" "init" "$ctx"
assert_not_contains "session-context other-git no plugin inventory" "Plugin inventory" "$ctx"
rm -rf "$OTHER_GIT"

# --- this plugin repo should show inventory ---
input=$(jq -n --arg cwd "$ROOT" '{cwd:$cwd}')
run_hook "session-context.sh" "claude" "$input"
ctx=$(printf '%s' "$HOOK_STDOUT" | jq -r '.hookSpecificOutput.additionalContext')
assert_contains "session-context plugin repo inventory" "Plugin inventory" "$ctx"
