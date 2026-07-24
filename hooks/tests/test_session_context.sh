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

# --- declared settings resolve from env/json without leaking undeclared data ---
SETTINGS_HOME=$(mktemp -d)
mkdir -p "$SETTINGS_HOME/.claude/bopen-tools"
cat > "$SETTINGS_HOME/.claude/bopen-tools/settings.json" <<'JSON'
{
  "skills": {
    "coordinator": {
      "workflow": "manual",
      "orchestration": "single-agent",
      "subagents": "off"
    }
  },
  "undeclared_secret": "should-not-leak"
}
JSON
cat > "$SETTINGS_HOME/.claude/bopen-tools/hooks-config.json" <<'JSON'
{
  "version": 1,
  "hooks": {
    "bouncer": false,
    "damage-control": true,
    "session-context": true
  }
}
JSON
cat > "$SETTINGS_HOME/.claude/bopen-tools/router-index.json" <<'JSON'
{"version": 1, "entry_count": 17, "entries": []}
JSON

input=$(jq -n --arg cwd "$ROOT" '{cwd:$cwd}')
out_file=$(mktemp)
err_file=$(mktemp)
set +e
printf '%s' "$input" | HOME="$SETTINGS_HOME" \
  BOPEN_WORKER_MODEL="worker-test-model" \
  BOPEN_ROUTER_INDEX="$SETTINGS_HOME/.claude/bopen-tools/router-index.json" \
  bash "$ROOT/session-context.sh" >"$out_file" 2>"$err_file"
settings_exit=$?
set -e
settings_out=$(cat "$out_file")
settings_err=$(cat "$err_file")
rm -f "$out_file" "$err_file"

assert_exit "session-context settings exit" "0" "$settings_exit"
assert_json "session-context settings json" "$settings_out"
assert_eq "session-context settings stderr" "" "$settings_err"
ctx=$(printf '%s' "$settings_out" | jq -r '.hookSpecificOutput.additionalContext')
assert_contains "session-context settings marker" "[BOPEN-SETTINGS]" "$ctx"
assert_contains "session-context worker env" "models.worker=worker-test-model [model; configured]" "$ctx"
assert_contains "session-context advisor default" "models.advisor=fable [model; default]" "$ctx"
assert_contains "session-context workflow json" "coordinator.workflow=manual [workflow; configured]" "$ctx"
assert_contains "session-context orchestration json" "coordinator.orchestration=single-agent" "$ctx"
assert_contains "session-context subagents json" "coordinator.subagents=off" "$ctx"
assert_contains "session-context hook tier" "hooks.guard: on=damage-control,publish-gate; off=bouncer" "$ctx"
assert_contains "session-context router state" "router-index=present (17 entries)" "$ctx"
assert_not_contains "session-context undeclared secret" "should-not-leak" "$ctx"

if [[ ${#ctx} -le 4000 ]]; then
  PASS=$((PASS + 1))
  printf '  PASS  session-context hard cap (%s chars)\n' "${#ctx}"
else
  FAIL=$((FAIL + 1))
  failures+=("session-context hard cap exceeded: ${#ctx}")
  printf '  FAIL  session-context hard cap (%s chars)\n' "${#ctx}"
fi

# Installed declarations use the newest numeric version and the settings cap
# always leaves room for hook tiers and router state.
PLUGIN_CACHE="$SETTINGS_HOME/plugin-cache"
mkdir -p "$PLUGIN_CACHE/extra/1.9.0" "$PLUGIN_CACHE/extra/1.10.0"
jq -n '{
  version: 1,
  owner: "old-extra",
  settings: [{
    source: "env", key: "OLD_EXTRA", type: "string", default: "stale",
    tier: "skill", sessionContext: true, contextKey: "extra.old"
  }]
}' > "$PLUGIN_CACHE/extra/1.9.0/settings.json"
jq -n '{
  version: 1,
  owner: "new-extra",
  settings: [range(0; 30) as $i | {
    source: "env",
    key: ("EXTRA_" + ($i | tostring)),
    type: "string",
    default: ("value-" + ($i | tostring)),
    tier: "skill",
    sessionContext: true,
    contextKey: ("extra." + ($i | tostring))
  }]
}' > "$PLUGIN_CACHE/extra/1.10.0/settings.json"

# Keep this test focused on settings discovery. A stale router index would
# intentionally launch the asynchronous index builder into the isolated HOME,
# racing the fixture cleanup below and intermittently leaving Python cache
# directories behind on macOS.
touch "$SETTINGS_HOME/.claude/bopen-tools/router-index.json"

printf '%s' "$input" | HOME="$SETTINGS_HOME" \
  BOPEN_PLUGIN_CACHE_ROOT="$PLUGIN_CACHE" \
  BOPEN_ROUTER_INDEX="$SETTINGS_HOME/.claude/bopen-tools/router-index.json" \
  bash "$ROOT/session-context.sh" >"$out_file" 2>"$err_file"
capped_out=$(cat "$out_file")
rm -f "$out_file" "$err_file"
capped_ctx=$(printf '%s' "$capped_out" | jq -r '.hookSpecificOutput.additionalContext')
assert_contains "session-context newest installed version" "extra.0=value-0" "$capped_ctx"
assert_not_contains "session-context ignores older installed version" "extra.old=stale" "$capped_ctx"
assert_contains "session-context cap keeps hook tiers" "hooks.guard:" "$capped_ctx"
assert_contains "session-context cap keeps router" "router-index=present (17 entries)" "$capped_ctx"
assert_not_contains "session-context declaration cap" "extra.15=value-15" "$capped_ctx"
rm -rf "$SETTINGS_HOME"
