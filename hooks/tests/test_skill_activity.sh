#!/bin/bash
# skill-activity: append-only invocation telemetry with seven-day pruning.

echo
echo "--- skill-activity ---"

ACTIVITY_ROOT=$(mktemp -d)
SKILL_ACTIVITY_ORIGINAL_HOME="$HOME"
SKILL_ACTIVITY_ORIGINAL_PROJECT_DIR="${CLAUDE_PROJECT_DIR-}"
SKILL_ACTIVITY_HAD_PROJECT_DIR="${CLAUDE_PROJECT_DIR+x}"
SKILL_ACTIVITY_ORIGINAL_HOOKS_CONFIG="${BOPEN_HOOKS_CONFIG-}"
SKILL_ACTIVITY_HAD_HOOKS_CONFIG="${BOPEN_HOOKS_CONFIG+x}"
export HOME="$ACTIVITY_ROOT/home"
export CLAUDE_PROJECT_DIR="$ACTIVITY_ROOT/project"
export BOPEN_SKILL_ACTIVITY_FILE="$ACTIVITY_ROOT/activity.jsonl"
unset BOPEN_HOOKS_CONFIG
mkdir -p "$HOME"

# 1. An invocation appends one compact, well-formed activity line.
first_input=$(jq -n '{tool_name:"Skill", tool_input:{skill:"bopen-tools:hook-manager"}, session_id:"session-one"}')
run_hook "skill-activity.sh" "claude" "$first_input"
assert_exit "skill-activity invocation exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity invocation silent stdout" "" "$HOOK_STDOUT"
assert_eq "skill-activity invocation silent stderr" "" "$HOOK_STDERR"
assert_eq "skill-activity invocation one line" "1" "$(wc -l < "$BOPEN_SKILL_ACTIVITY_FILE" | tr -d ' ')"
first_line=$(sed -n '1p' "$BOPEN_SKILL_ACTIVITY_FILE")
assert_json "skill-activity invocation valid json" "$first_line"
assert_eq "skill-activity invocation skill" "bopen-tools:hook-manager" "$(printf '%s' "$first_line" | jq -r '.skill')"
assert_eq "skill-activity invocation session" "session-one" "$(printf '%s' "$first_line" | jq -r '.session_id')"
assert_eq "skill-activity invocation numeric timestamp" "number" "$(printf '%s' "$first_line" | jq -r '.ts | type')"

# 2. A second invocation appends instead of overwriting the first.
second_input=$(jq -n '{tool_name:"Skill", tool_input:{skill:"bopen-tools:software-factory"}, session_id:"session-one"}')
run_hook "skill-activity.sh" "claude" "$second_input"
assert_exit "skill-activity second invocation exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity second invocation line count" "2" "$(wc -l < "$BOPEN_SKILL_ACTIVITY_FILE" | tr -d ' ')"
assert_eq "skill-activity second invocation keeps first" "bopen-tools:hook-manager" "$(sed -n '1p' "$BOPEN_SKILL_ACTIVITY_FILE" | jq -r '.skill')"
assert_eq "skill-activity second invocation appends second" "bopen-tools:software-factory" "$(sed -n '2p' "$BOPEN_SKILL_ACTIVITY_FILE" | jq -r '.skill')"

# 3. Every write prunes an eight-day-old line while retaining fresh lines.
now=$(date +%s)
old_ts=$((now - 8 * 24 * 60 * 60))
fresh_ts=$((now - 60))
jq -cn --argjson ts "$old_ts" '{ts:$ts,session_id:"old-session",skill:"old-skill"}' > "$BOPEN_SKILL_ACTIVITY_FILE"
jq -cn --argjson ts "$fresh_ts" '{ts:$ts,session_id:"fresh-session",skill:"fresh-skill"}' >> "$BOPEN_SKILL_ACTIVITY_FILE"
prune_input=$(jq -n '{tool_name:"Skill", tool_input:{skill:"new-skill"}, session_id:"new-session"}')
run_hook "skill-activity.sh" "claude" "$prune_input"
assert_exit "skill-activity prune exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity prune removes old" "0" "$(jq -s '[.[] | select(.skill == "old-skill")] | length' "$BOPEN_SKILL_ACTIVITY_FILE")"
assert_eq "skill-activity prune keeps fresh" "1" "$(jq -s '[.[] | select(.skill == "fresh-skill")] | length' "$BOPEN_SKILL_ACTIVITY_FILE")"
assert_eq "skill-activity prune keeps new" "1" "$(jq -s '[.[] | select(.skill == "new-skill")] | length' "$BOPEN_SKILL_ACTIVITY_FILE")"

# 4. An explicit disabled config produces no activity file.
disabled_file="$ACTIVITY_ROOT/disabled.jsonl"
export BOPEN_SKILL_ACTIVITY_FILE="$disabled_file"
cat > "$ACTIVITY_ROOT/hooks-off.json" <<'EOF'
{"version":1,"hooks":{"skill-activity":false}}
EOF
export BOPEN_HOOKS_CONFIG="$ACTIVITY_ROOT/hooks-off.json"
run_hook "skill-activity.sh" "claude" "$first_input"
assert_exit "skill-activity disabled exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity disabled silent" "" "$HOOK_STDOUT$HOOK_STDERR"
assert_eq "skill-activity disabled no write" "0" "$([[ -e "$disabled_file" ]] && echo 1 || echo 0)"
unset BOPEN_HOOKS_CONFIG

# 5. Malformed stdin exits zero, stays silent, and writes nothing.
malformed_file="$ACTIVITY_ROOT/malformed.jsonl"
export BOPEN_SKILL_ACTIVITY_FILE="$malformed_file"
run_hook "skill-activity.sh" "claude" '{not json'
assert_exit "skill-activity malformed exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity malformed silent" "" "$HOOK_STDOUT$HOOK_STDERR"
assert_eq "skill-activity malformed no write" "0" "$([[ -e "$malformed_file" ]] && echo 1 || echo 0)"

# 6. The env override wins, and the default path under isolated HOME is untouched.
override_file="$ACTIVITY_ROOT/custom/activity.jsonl"
default_file="$HOME/.claude/bopen-tools/skill-activity.jsonl"
export BOPEN_SKILL_ACTIVITY_FILE="$override_file"
fallback_input=$(jq -n '{tool_name:"Skill", tool_input:{skill:"fallback-skill"}, transcript_path:"/tmp/transcript-session.jsonl"}')
run_hook "skill-activity.sh" "claude" "$fallback_input"
assert_exit "skill-activity env override exit" "0" "$HOOK_EXIT"
assert_eq "skill-activity env override file exists" "1" "$([[ -f "$override_file" ]] && echo 1 || echo 0)"
assert_eq "skill-activity env override default untouched" "0" "$([[ -e "$default_file" ]] && echo 1 || echo 0)"
assert_eq "skill-activity transcript session fallback" "transcript-session" "$(jq -r '.session_id' "$override_file")"

unset BOPEN_SKILL_ACTIVITY_FILE
export HOME="$SKILL_ACTIVITY_ORIGINAL_HOME"
if [[ "$SKILL_ACTIVITY_HAD_PROJECT_DIR" == "x" ]]; then
  export CLAUDE_PROJECT_DIR="$SKILL_ACTIVITY_ORIGINAL_PROJECT_DIR"
else
  unset CLAUDE_PROJECT_DIR
fi
if [[ "$SKILL_ACTIVITY_HAD_HOOKS_CONFIG" == "x" ]]; then
  export BOPEN_HOOKS_CONFIG="$SKILL_ACTIVITY_ORIGINAL_HOOKS_CONFIG"
else
  unset BOPEN_HOOKS_CONFIG
fi
rm -rf "$ACTIVITY_ROOT"
