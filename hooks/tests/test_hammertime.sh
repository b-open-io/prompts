#!/bin/bash
# HammerTime: distinct Codex session IDs, null transcript, stop_hook_active, triggering rule.

echo
echo "--- hammertime ---"

HT_HOME=$(mktemp -d)
export BOPEN_HAMMERTIME_HOME="$HT_HOME"
# Isolate from real Anthropic calls
unset ANTHROPIC_API_KEY
export HAMMERTIME_DEBUG="$HT_HOME/debug.log"

resolved_home=$(python3 "$ROOT/../skills/hammertime/scripts/hammertime_paths.py")
assert_eq "hammertime shared resolver honors override" "$HT_HOME" "$resolved_home"

run_ht() {
  local input="$1"
  local out_file err_file
  out_file=$(mktemp)
  err_file=$(mktemp)
  set +e
  printf '%s' "$input" | python3 "$ROOT/hammertime.py" >"$out_file" 2>"$err_file"
  HOOK_EXIT=$?
  set -e
  HOOK_STDOUT=$(cat "$out_file")
  HOOK_STDERR=$(cat "$err_file")
  rm -f "$out_file" "$err_file"
}

# Triggering message with many project-owner signals to exceed threshold without Haiku
TRIGGER_MSG='These are pre-existing errors. Nothing new from our changes. They match baseline and are unrelated to our work. Already failing before our changes. Not from our changes. Errors are unchanged. I will not fix the pre-existing typescript issues.'

# Clean benign message
CLEAN_MSG='Implemented the feature and all new tests pass.'

# 1) stop_hook_active skips content rules (exit 0, no block)
input=$(jq -n --arg m "$TRIGGER_MSG" \
  '{session_id:"sess-stop", stop_hook_active:true, last_assistant_message:$m, transcript_path:null}')
run_ht "$input"
assert_exit "hammertime stop_hook_active allows exit" "0" "$HOOK_EXIT"
assert_not_contains "hammertime stop_hook_active no block decision" '"decision": "block"' "$HOOK_STDOUT"
assert_not_contains "hammertime stop_hook_active no block decision compact" '"decision":"block"' "$HOOK_STDOUT"

# 2) null transcript_path still works with last_assistant_message
input=$(jq -n --arg m "$CLEAN_MSG" \
  '{session_id:"sess-null-tx", last_assistant_message:$m, transcript_path:null, cwd:"/tmp"}')
run_ht "$input"
assert_exit "hammertime null transcript clean exit" "0" "$HOOK_EXIT"

# 3) Triggering rule blocks with decision:block
input=$(jq -n --arg m "$TRIGGER_MSG" \
  '{session_id:"sess-trigger", last_assistant_message:$m, transcript_path:null}')
run_ht "$input"
assert_exit "hammertime trigger exit" "0" "$HOOK_EXIT"
assert_contains "hammertime trigger decision block" '"decision": "block"' "$HOOK_STDOUT"
# systemMessage present
assert_contains "hammertime trigger systemMessage" "HammerTime" "$HOOK_STDOUT"
assert_json "hammertime trigger output json" "$HOOK_STDOUT"

# The bundled skill script must write where the hook reads.
timer_output=$(python3 "$ROOT/../skills/hammertime/scripts/create-timer.py" 1m "shared resolver test")
assert_json "hammertime create-timer output json" "$timer_output"
assert_eq "hammertime create-timer shared rules path" "1" "$(jq 'length' "$HT_HOME/rules.json")"

# 4) Distinct Codex session IDs keep separate iteration state
# Write a user rule with max_iterations:1 and low threshold to observe state
mkdir -p "$HT_HOME"
cat > "$HT_HOME/rules.json" <<'JSON'
[
  {
    "name": "no-ship-it",
    "rule": "Never say ship it without tests.",
    "enabled": true,
    "keywords": ["ship it", "shipping it", "lgtm ship"],
    "confidence_threshold": 1,
    "max_iterations": 2,
    "evaluate_full_turn": false
  }
]
JSON

msg='Looks good, ship it.'
input=$(jq -n --arg m "$msg" '{session_id:"codex-session-A", last_assistant_message:$m}')
run_ht "$input"
assert_contains "hammertime session A first block" '"decision": "block"' "$HOOK_STDOUT"

# State should record session A
state_a=$(jq -r '.session_id' "$HT_HOME/state.json")
assert_eq "hammertime state session A" "codex-session-A" "$state_a"
iter_a=$(jq -r '.rule_iterations["no-ship-it"] // 0' "$HT_HOME/state.json")

# New session B should reset counters
input=$(jq -n --arg m "$msg" '{session_id:"codex-session-B", last_assistant_message:$m}')
run_ht "$input"
state_b=$(jq -r '.session_id' "$HT_HOME/state.json")
assert_eq "hammertime state session B distinct" "codex-session-B" "$state_b"
iter_b=$(jq -r '.rule_iterations["no-ship-it"] // 0' "$HT_HOME/state.json")
# Fresh session starts at 1 after one block
assert_eq "hammertime session B iteration starts fresh" "1" "$iter_b"

# 5) Missing last message + null transcript → quiet exit
input='{"session_id":"empty","transcript_path":null}'
run_ht "$input"
assert_exit "hammertime empty message exit" "0" "$HOOK_EXIT"

# 6) Codex-format transcript adapter (tolerant)
TX=$(mktemp)
cat > "$TX" <<'JSONL'
{"type":"event_msg","payload":{"type":"user_message","message":"please fix"}}
{"type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Looks good, ship it."}]}}
JSONL
input=$(jq -n --arg p "$TX" --arg m "$msg" \
  '{session_id:"codex-tx", transcript_path:$p, last_assistant_message:$m}')
run_ht "$input"
assert_contains "hammertime codex transcript still blocks on last_msg" '"decision": "block"' "$HOOK_STDOUT"
rm -f "$TX"

rm -rf "$HT_HOME"
unset BOPEN_HAMMERTIME_HOME HAMMERTIME_DEBUG
