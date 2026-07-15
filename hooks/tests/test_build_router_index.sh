#!/bin/bash
# build-router-index: produces valid, deterministic JSON from a fixture
# plugin cache dir, and only indexes the LATEST installed version per plugin.

echo
echo "--- build-router-index ---"

CACHE_DIR=$(mktemp -d)
OUT_DIR=$(mktemp -d)
OUT_FILE="$OUT_DIR/router-index.json"

# Older version — should be ignored in favor of the newer one below.
OLD_SKILLS="$CACHE_DIR/pluginA/0.9.0/skills/old-skill"
mkdir -p "$OLD_SKILLS"
cat > "$OLD_SKILLS/SKILL.md" <<'EOF'
---
name: old-skill
description: Use this skill when you need "the old behavior" that should never appear in the index.
---
Body.
EOF

# Newer version — this one should be indexed.
NEW_SKILLS="$CACHE_DIR/pluginA/1.2.0/skills/foo-skill"
mkdir -p "$NEW_SKILLS"
cat > "$NEW_SKILLS/SKILL.md" <<'EOF'
---
name: foo-skill
description: Use this skill when the user asks to "build a foo widget" or needs foo bar baz automation. It should not be used for diegetic controls or three-dimensional interfaces.
---
Body.
EOF

NEW_AGENTS="$CACHE_DIR/pluginA/1.2.0/agents"
mkdir -p "$NEW_AGENTS"
cat > "$NEW_AGENTS/bar-agent.md" <<'EOF'
---
name: bar-agent
description: |-
  Use this agent when the user asks to "review the bar report" or needs bar reporting analysis.

  <example>
  Context: dialogue noise that must not pollute triggers
  user: "unrelated question"
  assistant: "I'll use the bar-agent to handle unrelated dialogue text here."
  </example>
---
Body.
EOF

BUILDER="$ROOT/../scripts/build-router-index.py"
python3 "$BUILDER" --cache-root "$CACHE_DIR" --output "$OUT_FILE"
BUILD_EXIT=$?
assert_exit "build-router-index exit" "0" "$BUILD_EXIT"

if [[ -f "$OUT_FILE" ]] && jq -e . "$OUT_FILE" >/dev/null 2>&1; then
  PASS=$((PASS + 1)); printf '  PASS  build-router-index produces valid json\n'
else
  FAIL=$((FAIL + 1)); failures+=("build-router-index: invalid or missing output"); printf '  FAIL  build-router-index produces valid json\n'
fi

ids=$(jq -r '.entries[].id' "$OUT_FILE" 2>/dev/null)
assert_contains "build-router-index includes new skill" "pluginA:foo-skill" "$ids"
assert_contains "build-router-index includes new agent" "pluginA:bar-agent" "$ids"
assert_not_contains "build-router-index skips older version" "pluginA:old-skill" "$ids"

triggers=$(jq -r '.entries[] | select(.id=="pluginA:foo-skill") | .triggers[]' "$OUT_FILE" 2>/dev/null)
assert_contains "build-router-index captures quoted phrase" "build a foo widget" "$triggers"
build_keyword=$(jq -r '.entries[] | select(.id=="pluginA:foo-skill") | .triggers[] | select(.=="build")' "$OUT_FILE" 2>/dev/null)
assert_eq "build-router-index does not duplicate quoted words" "" "$build_keyword"
assert_not_contains "build-router-index excludes negative clause" "diegetic" "$triggers"
assert_not_contains "build-router-index excludes negative clause tail" "interfaces" "$triggers"

agent_triggers=$(jq -r '.entries[] | select(.id=="pluginA:bar-agent") | .triggers[]' "$OUT_FILE" 2>/dev/null)
assert_not_contains "build-router-index excludes example dialogue" "i'll use the bar-agent to handle unrelated dialogue text here" "$agent_triggers"

# Determinism: rebuilding produces the same entries (ignoring generated_at).
OUT_FILE2="$OUT_DIR/router-index-2.json"
python3 "$BUILDER" --cache-root "$CACHE_DIR" --output "$OUT_FILE2" >/dev/null 2>&1
diff_out=$(diff <(jq 'del(.generated_at)' "$OUT_FILE") <(jq 'del(.generated_at)' "$OUT_FILE2") 2>&1)
assert_eq "build-router-index deterministic across runs" "" "$diff_out"

rm -rf "$CACHE_DIR" "$OUT_DIR"
