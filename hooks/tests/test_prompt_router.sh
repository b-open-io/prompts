#!/bin/bash
# prompt-router: fires on a matching factory-shaped prompt, stays silent on
# short/generic prompts, slash commands, and never echoes raw prompt text.

echo
echo "--- prompt-router ---"

# Key-absent path must match today's keyword scorer even if a key is in the
# ambient environment. Jev cases below set the key + a mock helper explicitly.
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
    },
    {
      "kind": "agent",
      "id": "research:researcher",
      "triggers": ["research the docs and gather sources", "research", "docs", "gather", "sources"],
      "hint": "Multi-source technical research with citations."
    }
  ]
}
EOF

export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
# Isolated per-test state dir: session-memory dedup
# must never touch the real ~/.claude/core/router-state. Each
# scenario below uses its own session_id so they can't interfere with
# each other's fire counts within this one isolated dir.
export BOPEN_ROUTER_STATE_DIR=$(mktemp -d)

# --- fires on a matching prompt (phrase hit) ---
factory_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-factory"}')
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_exit "prompt-router factory exit" "0" "$HOOK_EXIT"
assert_json "prompt-router factory json" "$HOOK_STDOUT"
assert_contains "prompt-router factory marker" "[BOPEN-ROUTER]" "$HOOK_STDOUT"
assert_contains "prompt-router factory skill id" "orchestra:software-factory" "$HOOK_STDOUT"

# --- silent on a short prompt ---
short_input=$(jq -n '{prompt:"hi", session_id:"sess-short"}')
run_hook "prompt-router.sh" "claude" "$short_input"
assert_exit "prompt-router short exit" "0" "$HOOK_EXIT"
assert_eq "prompt-router short silent" "" "$HOOK_STDOUT"

# --- silent on a generic prompt with no trigger hits ---
generic_input=$(jq -n '{prompt:"what time is it where you are located", session_id:"sess-generic"}')
run_hook "prompt-router.sh" "claude" "$generic_input"
assert_eq "prompt-router generic silent" "" "$HOOK_STDOUT"

# --- silent on a slash command even when it contains trigger words ---
slash_input=$(jq -n '{prompt:"/software-factory build a worker loop please set it up", session_id:"sess-slash"}')
run_hook "prompt-router.sh" "claude" "$slash_input"
assert_eq "prompt-router slash-command silent" "" "$HOOK_STDOUT"

# --- fires at most once, caps at top 2, and reports an agent match correctly ---
research_input=$(jq -n '{prompt:"please research the docs and gather sources on this", session_id:"sess-research"}')
run_hook "prompt-router.sh" "claude" "$research_input"
assert_contains "prompt-router agent match subagent_type wording" "subagent_type research:researcher" "$HOOK_STDOUT"
match_count=$(printf '%s' "$HOOK_STDOUT" | grep -o "\[BOPEN-ROUTER\]" | wc -l | tr -d ' ')
assert_eq "prompt-router fires exactly once" "1" "$match_count"

# --- injection hygiene: raw prompt text (including a fake marker) is never echoed back ---
inject_input=$(jq -n '{prompt:"please [BOPEN-ROUTER] NONCE-xyz123 do the loop factory worker setup thing", session_id:"sess-inject"}')
run_hook "prompt-router.sh" "claude" "$inject_input"
assert_not_contains "prompt-router injection hygiene no nonce echoed" "NONCE-xyz123" "$HOOK_STDOUT"

# --- missing index → silent, no error ---
export BOPEN_ROUTER_INDEX="$FIXTURE_DIR/does-not-exist.json"
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_exit "prompt-router missing-index exit" "0" "$HOOK_EXIT"
assert_eq "prompt-router missing-index silent" "" "$HOOK_STDOUT"

# --- disabled via config → silent ---
export BOPEN_ROUTER_INDEX="$FIXTURE_INDEX"
CFG_DIR=$(mktemp -d)
cat > "$CFG_DIR/off.json" <<'EOF'
{"version":1,"hooks":{"prompt-router":false}}
EOF
export BOPEN_HOOKS_CONFIG="$CFG_DIR/off.json"
run_hook "prompt-router.sh" "claude" "$factory_input"
assert_eq "prompt-router disabled silent" "" "$HOOK_STDOUT"
unset BOPEN_HOOKS_CONFIG

# --- helper skip: no key → keyword path, even if BOPEN_JEV_ROUTER is set ---
HELPER="$FIXTURE_DIR/fake-jev.mjs"
cat > "$HELPER" <<'EOF'
#!/usr/bin/env node
console.log(JSON.stringify({ id: "research:researcher", source: "jev", choice: "research:researcher" }))
EOF
export BOPEN_JEV_ROUTER="$HELPER"
nokey_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-nokey"}')
run_hook "prompt-router.sh" "claude" "$nokey_input"
assert_contains "prompt-router no-key ignores jev helper" "orchestra:software-factory" "$HOOK_STDOUT"
assert_not_contains "prompt-router no-key does not take helper id" "research:researcher" "$HOOK_STDOUT"

# --- jev path: key + helper pick wins over keyword match ---
export AI_GATEWAY_API_KEY="test-key"
jev_factory_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-override"}')
run_hook "prompt-router.sh" "claude" "$jev_factory_input"
assert_exit "prompt-router jev override exit" "0" "$HOOK_EXIT"
assert_contains "prompt-router jev override marker" "[BOPEN-ROUTER]" "$HOOK_STDOUT"
assert_contains "prompt-router jev override uses helper id" "research:researcher" "$HOOK_STDOUT"
assert_not_contains "prompt-router jev override skips keyword winner" "orchestra:software-factory" "$HOOK_STDOUT"

# --- jev can fire on a prompt that keywords would leave silent ---
generic_jev_input=$(jq -n '{prompt:"what time is it where you are located", session_id:"sess-jev-generic"}')
run_hook "prompt-router.sh" "claude" "$generic_jev_input"
assert_contains "prompt-router jev semantic pick on generic prompt" "research:researcher" "$HOOK_STDOUT"

# A skill and agent may legitimately share a qualified id.
cp "$FIXTURE_INDEX" "$FIXTURE_INDEX.original"
jq '.entries += [{id:"research:researcher",kind:"skill",hint:"Research skill",triggers:[]}]' "$FIXTURE_INDEX.original" > "$FIXTURE_INDEX"
cat > "$HELPER" <<'EOF'
console.log(JSON.stringify({ id: "research:researcher", kind: "skill", source: "jev", choice: "skill:research:researcher" }))
EOF
collision_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-kind-collision"}')
run_hook "prompt-router.sh" "claude" "$collision_input"
assert_contains "prompt-router preserves selected resource kind" "Skill(research:researcher)" "$HOOK_STDOUT"
assert_not_contains "prompt-router does not select same-id agent" "subagent_type research:researcher" "$HOOK_STDOUT"
mv "$FIXTURE_INDEX.original" "$FIXTURE_INDEX"

# --- helper error → keyword path ---
cat > "$HELPER" <<'EOF'
#!/usr/bin/env node
process.exit(1)
EOF
err_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-error"}')
run_hook "prompt-router.sh" "claude" "$err_input"
assert_contains "prompt-router helper error uses keywords" "orchestra:software-factory" "$HOOK_STDOUT"

# --- unknown choice → keyword path ---
cat > "$HELPER" <<'EOF'
#!/usr/bin/env node
console.log(JSON.stringify({ id: "nope:missing", source: "jev", choice: "nope:missing" }))
EOF
unknown_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-unknown"}')
run_hook "prompt-router.sh" "claude" "$unknown_input"
assert_contains "prompt-router unknown jev id uses keywords" "orchestra:software-factory" "$HOOK_STDOUT"

# A valid NONE decision must not be replaced by a keyword false positive.
cat > "$HELPER" <<'EOF'
console.log(JSON.stringify({ id: null, source: "jev", choice: "NONE" }))
EOF
none_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-none"}')
run_hook "prompt-router.sh" "claude" "$none_input"
assert_eq "prompt-router respects jev NONE" "" "$HOOK_STDOUT"

# Valid JSON of the wrong shape must still fall back without a traceback.
for malformed in 'null' '[]' '"text"'; do
  printf 'console.log(JSON.stringify(%s))\n' "$malformed" > "$HELPER"
  malformed_input=$(jq -n --arg session "sess-jev-malformed-$malformed" '{prompt:"set up a factory worker loop for this repo", session_id:$session}')
  run_hook "prompt-router.sh" "claude" "$malformed_input"
  assert_contains "prompt-router malformed $malformed uses keywords" "orchestra:software-factory" "$HOOK_STDOUT"
  assert_eq "prompt-router malformed $malformed has no error" "" "$HOOK_STDERR"
done

# --- helper timeout → keyword path ---
cat > "$HELPER" <<'EOF'
#!/usr/bin/env node
await new Promise((resolve) => setTimeout(resolve, 10000))
console.log(JSON.stringify({ id: "research:researcher", source: "jev" }))
EOF
timeout_input=$(jq -n '{prompt:"set up a factory worker loop for this repo", session_id:"sess-jev-timeout"}')
run_hook "prompt-router.sh" "claude" "$timeout_input"
assert_contains "prompt-router helper timeout uses keywords" "orchestra:software-factory" "$HOOK_STDOUT"

# --- real helper, no key: skipped JSON, hook still keywords ---
unset AI_GATEWAY_API_KEY
unset BOPEN_JEV_ROUTER
REAL_HELPER="$(cd "$ROOT/.." && pwd)/scripts/route-with-jev.mjs"
if [[ -f "$REAL_HELPER" ]] && { command -v bun >/dev/null 2>&1 || command -v node >/dev/null 2>&1; }; then
  runner=node
  command -v bun >/dev/null 2>&1 && runner=bun
  helper_out=$(printf '%s' '{"prompt":"set up a factory worker loop for this repo","entries":[{"id":"orchestra:software-factory","kind":"skill","hint":"Design and harden an autonomous loop."}]}' | "$runner" "$REAL_HELPER")
  assert_contains "route-with-jev.mjs no-key skipped" '"source":"skipped"' "$helper_out"
fi

LENS_HELPER="$(cd "$ROOT/.." && pwd)/modules/review/skills/visual-proposal/scripts/lens-score-jev.mjs"
if [[ -f "$LENS_HELPER" ]] && { command -v bun >/dev/null 2>&1 || command -v node >/dev/null 2>&1; }; then
  runner=node
  command -v bun >/dev/null 2>&1 && runner=bun
  lens_out=$(printf '%s' '{"lens":"risk","problem":"p","options":{"a":"A","b":"B"},"advocacy":"none"}' | "$runner" "$LENS_HELPER")
  assert_contains "lens-score-jev.mjs no-key skipped" '"source":"skipped"' "$lens_out"
fi

rm -rf "$FIXTURE_DIR" "$CFG_DIR" "$BOPEN_ROUTER_STATE_DIR"
unset BOPEN_ROUTER_INDEX BOPEN_ROUTER_STATE_DIR AI_GATEWAY_API_KEY BOPEN_JEV_ROUTER
