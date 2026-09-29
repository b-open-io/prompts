#!/bin/bash
# prompt-router duplicate-invocation handling (OPL-2883 amendment):
# conditional "unless already loaded" phrasing, and router-side session
# memory that suppresses a second back-to-back firing of the same id.

echo
echo "--- prompt-router dedup (OPL-2883 amendment) ---"

unset AI_GATEWAY_API_KEY
unset BOPEN_JEV_ROUTER

FIXTURE_DIR=$(mktemp -d)
FIXTURE_INDEX="$FIXTURE_DIR/router-index.json"
cat > "$FIXTURE_INDEX" <<'EOF'
{
  "version": 1,
  "entries": [
    {
      "kind": "skill",
      "id": "orchestra:software-factory",
      "triggers": ["set up a factory worker loop", "factory", "loop", "worker"],
      "hint": "Design and harden an autonomous loop."
    }
  ]
}
EOF

export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
export BOPEN_ROUTER_STATE_DIR=$(mktemp -d)

factory_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"dedup-session"}')

# --- conditional phrasing is present in the emitted context ---
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_contains "prompt-router dedup: conditional phrasing present" \
  "unless its instructions are already loaded in your context this session" "$HOOK_STDOUT"

# --- state file records the fired id ---
state_file="$BOPEN_ROUTER_STATE_DIR/dedup-session.json"
if [[ -f "$state_file" ]]; then
  PASS=$((PASS + 1)); printf '  PASS  prompt-router dedup: state file written\n'
else
  FAIL=$((FAIL + 1)); failures+=("prompt-router dedup: state file not written"); printf '  FAIL  prompt-router dedup: state file written\n'
fi
recorded_count=$(jq -r '.fires["skill:orchestra:software-factory"].count // 0' "$state_file" 2>/dev/null)
assert_eq "prompt-router dedup: state file records id with count 1" "1" "$recorded_count"

# --- same factory prompt again immediately → second firing suppressed ---
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_exit "prompt-router dedup: second call exit 0" "0" "$HOOK_EXIT"
assert_eq "prompt-router dedup: second firing suppressed" "" "$HOOK_STDOUT"

# --- count is untouched by the suppressed attempt (no phantom re-fire) ---
recorded_count2=$(jq -r '.fires["skill:orchestra:software-factory"].count // 0' "$state_file" 2>/dev/null)
assert_eq "prompt-router dedup: count still 1 after suppressed attempt" "1" "$recorded_count2"

# --- a third call, still within the 10-prompt gap, also stays silent ---
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_eq "prompt-router dedup: third call still silent" "" "$HOOK_STDOUT"

# --- after a 10-prompt gap of unrelated prompts, one re-nudge is allowed ---
filler_input=$(jq -n '{prompt:"what is the weather like outside today", session_id:"dedup-session"}')
for _ in $(seq 1 9); do
  run_hook "prompt-router.sh" "claude" "$filler_input"
done
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_contains "prompt-router dedup: re-nudge allowed after 10-prompt gap" "[BOPEN-ROUTER]" "$HOOK_STDOUT"
recorded_count3=$(jq -r '.fires["skill:orchestra:software-factory"].count // 0' "$state_file" 2>/dev/null)
assert_eq "prompt-router dedup: fire count now 2" "2" "$recorded_count3"

# --- a fourth firing never happens — max 2 fires per session, ever ---
for _ in $(seq 1 12); do
  run_hook "prompt-router.sh" "claude" "$filler_input"
done
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_eq "prompt-router dedup: permanently silent after 2 fires" "" "$HOOK_STDOUT"

# --- a skill and an agent sharing one id keep separate fire counters ---
SHARED_INDEX="$FIXTURE_DIR/shared-index.json"
cat > "$SHARED_INDEX" <<'EOF'
{
  "version": 1,
  "entries": [
    {"kind": "skill", "id": "core:front-desk", "triggers": ["who handles this", "roster"], "hint": "Route the request."},
    {"kind": "agent", "id": "core:front-desk", "triggers": ["who handles this", "roster"], "hint": "Front desk."}
  ]
}
EOF
export BOPEN_ROUTER_INDEX="$SHARED_INDEX"
shared_input=$(jq -n '{prompt:"who handles this on the roster", session_id:"shared-session"}')
shared_filler=$(jq -n '{prompt:"what is the weather like outside today", session_id:"shared-session"}')
shared_state="$BOPEN_ROUTER_STATE_DIR/shared-session.json"
shared_count() { jq -r --arg k "$1" '.fires[$k].count // 0' "$shared_state" 2>/dev/null; }

run_hook "prompt-router.sh" "claude" "$shared_input"
assert_contains "prompt-router dedup: shared id fires the skill and the agent" "Also relevant" "$HOOK_STDOUT"
assert_eq "prompt-router dedup: skill counter is 1" "1" "$(shared_count "skill:core:front-desk")"
assert_eq "prompt-router dedup: agent counter is 1" "1" "$(shared_count "agent:core:front-desk")"
assert_eq "prompt-router dedup: no bare-id counter" "0" "$(shared_count "core:front-desk")"

for _ in $(seq 1 10); do
  run_hook "prompt-router.sh" "claude" "$shared_filler"
done
run_hook "prompt-router.sh" "claude" "$shared_input"
assert_contains "prompt-router dedup: shared id re-nudges after the gap" "Also relevant" "$HOOK_STDOUT"
assert_eq "prompt-router dedup: skill counter is 2" "2" "$(shared_count "skill:core:front-desk")"
assert_eq "prompt-router dedup: agent counter is 2" "2" "$(shared_count "agent:core:front-desk")"

rm -rf "$FIXTURE_DIR" "$BOPEN_ROUTER_STATE_DIR"
unset BOPEN_ROUTER_INDEX BOPEN_ROUTER_STATE_DIR
