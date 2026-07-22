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

# Every case pins cwd to an empty temp dir. Without it the hook falls back
# to os.getcwd() = this repo, DISCOVERS the live Claude session's transcript
# in ~/.claude/projects/, and full-turn rules score that session's real
# conversation instead of the test message — the outcome then depends on
# what the developer's assistant happened to be saying, which was the
# long-standing "flaky hammertime" mystery.
HT_CWD=$(mktemp -d)

# 1) stop_hook_active skips content rules (exit 0, no block)
input=$(jq -n --arg m "$TRIGGER_MSG" --arg cwd "$HT_CWD" \
  '{session_id:"sess-stop", stop_hook_active:true, last_assistant_message:$m, transcript_path:null, cwd:$cwd}')
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
input=$(jq -n --arg m "$TRIGGER_MSG" --arg cwd "$HT_CWD" \
  '{session_id:"sess-trigger", last_assistant_message:$m, transcript_path:null, cwd:$cwd}')
run_ht "$input"
# Failure diagnostics: an empty stdout here has historically been an opaque
# flake. Dump everything needed to explain it before the assertions fire.
if [ -z "$HOOK_STDOUT" ]; then
  echo "DIAG trigger-case empty stdout:"
  echo "DIAG exit=$HOOK_EXIT stderr=[$HOOK_STDERR]"
  echo "DIAG HAMMERTIME_DEBUG=$HAMMERTIME_DEBUG"
  echo "DIAG BOPEN_HOOKS_CONFIG=${BOPEN_HOOKS_CONFIG:-unset} CLAUDE_PROJECT_DIR=${CLAUDE_PROJECT_DIR:-unset} PWD=$PWD"
  echo "DIAG debug.log ($(wc -l < "$HAMMERTIME_DEBUG" 2>/dev/null || echo 0) lines) BEGIN"
  sed 's/^/DIAG | /' "$HAMMERTIME_DEBUG" 2>/dev/null || echo "DIAG (no debug.log)"
  echo "DIAG debug.log END"
  echo "DIAG home dir:"; ls -la "$BOPEN_HAMMERTIME_HOME" 2>/dev/null | sed 's/^/DIAG | /'
  echo "DIAG retrying same input in place:"
  run_ht "$input"
  echo "DIAG retry exit=$HOOK_EXIT stdout_bytes=$(printf '%s' "$HOOK_STDOUT" | wc -c | tr -d ' ')"
fi
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

# 5) cwd_prefix scopes content-rule evaluation to CLAUDE_PROJECT_DIR
cat > "$HT_HOME/rules.json" <<'JSON'
[
  {
    "name": "scoped-ship-it",
    "rule": "Never say ship it without tests.",
    "enabled": true,
    "keywords": ["ship it"],
    "confidence_threshold": 1,
    "cwd_prefix": ["/work/other", "/work/scoped-repo"]
  }
]
JSON
input=$(jq -n --arg m "$msg" \
  '{session_id:"scope-match", last_assistant_message:$m, cwd:"/hook/input/is-not-the-scope"}')
CLAUDE_PROJECT_DIR="/work/scoped-repo/packages/app" run_ht "$input"
assert_contains "hammertime matching cwd_prefix blocks" '"decision": "block"' "$HOOK_STDOUT"

input=$(jq -n --arg m "$msg" \
  '{session_id:"scope-miss", last_assistant_message:$m, cwd:"/work/scoped-repo"}')
CLAUDE_PROJECT_DIR="/work/unrelated" run_ht "$input"
assert_not_contains "hammertime nonmatching cwd_prefix skips" '"decision": "block"' "$HOOK_STDOUT"

cat > "$HT_HOME/rules.json" <<'JSON'
[
  {
    "name": "scoped-timer",
    "rule": "Keep working in the scoped project.",
    "enabled": true,
    "deadline": "2999-01-01T00:00:00",
    "keywords": [],
    "max_iterations": 0,
    "cwd_prefix": "/work/timer-repo"
  }
]
JSON
input=$(jq -n --arg m "$CLEAN_MSG" '{session_id:"scope-timer-miss", last_assistant_message:$m}')
CLAUDE_PROJECT_DIR="/work/unrelated" run_ht "$input"
assert_not_contains "hammertime nonmatching timer cwd_prefix skips" '"decision": "block"' "$HOOK_STDOUT"

input=$(jq -n --arg m "$CLEAN_MSG" '{session_id:"scope-timer-match", last_assistant_message:$m}')
CLAUDE_PROJECT_DIR="/work/timer-repo/app" run_ht "$input"
assert_contains "hammertime matching timer cwd_prefix blocks" '"decision": "block"' "$HOOK_STDOUT"

cat > "$HT_HOME/rules.json" <<'JSON'
[
  {
    "name": "malformed-scope",
    "rule": "Never say ship it without tests.",
    "enabled": true,
    "keywords": ["ship it"],
    "confidence_threshold": 1,
    "cwd_prefix": 42
  }
]
JSON
input=$(jq -n --arg m "$msg" '{session_id:"scope-malformed", last_assistant_message:$m}')
CLAUDE_PROJECT_DIR="/work/scoped-repo" run_ht "$input"
assert_not_contains "hammertime malformed cwd_prefix skips" '"decision": "block"' "$HOOK_STDOUT"
assert_contains "hammertime malformed cwd_prefix warns" "malformed cwd_prefix" "$HOOK_STDERR"

# 6) Missing last message + null transcript → quiet exit
input='{"session_id":"empty","transcript_path":null}'
run_ht "$input"
assert_exit "hammertime empty message exit" "0" "$HOOK_EXIT"

# 7) Codex-format transcript adapter (tolerant)
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

# 8) Pure per-project scoping predicate and malformed-scope warnings
if python3 "$TESTS_DIR/test_hammertime_scope.py"; then
  PASS=$((PASS + 1))
  printf '  PASS  hammertime cwd_prefix unit tests\n'
else
  FAIL=$((FAIL + 1))
  failures+=("hammertime cwd_prefix unit tests")
  printf '  FAIL  hammertime cwd_prefix unit tests\n'
fi

# 9) Production scorer corpus, including quoted/documentation false positives
if python3 "$ROOT/../skills/hammertime/evals/test_scorer.py"; then
  PASS=$((PASS + 1))
  printf '  PASS  hammertime scorer corpus\n'
else
  FAIL=$((FAIL + 1))
  failures+=("hammertime scorer corpus")
  printf '  FAIL  hammertime scorer corpus\n'
fi

rm -rf "$HT_HOME"
unset BOPEN_HAMMERTIME_HOME HAMMERTIME_DEBUG
