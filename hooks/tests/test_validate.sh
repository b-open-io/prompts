#!/bin/bash
# Validate hook JSON files, shell syntax, Python compilation, git diff --check.

echo
echo "--- validation ---"

# JSON files
for f in claude-hooks.json codex-hooks.json patterns.yaml; do
  if [[ "$f" == *.json ]]; then
    if jq -e . "$ROOT/$f" >/dev/null 2>&1; then
      PASS=$((PASS + 1))
      printf '  PASS  json valid: %s\n' "$f"
    else
      FAIL=$((FAIL + 1))
      failures+=("invalid json: $f")
      printf '  FAIL  json valid: %s\n' "$f"
    fi
  fi
done

# Required structure
for f in claude-hooks.json codex-hooks.json; do
  if jq -e '.hooks.SessionStart and .hooks.PreToolUse and .hooks.Stop' "$ROOT/$f" >/dev/null 2>&1; then
    PASS=$((PASS + 1))
    printf '  PASS  structure: %s has SessionStart/PreToolUse/Stop\n' "$f"
  else
    FAIL=$((FAIL + 1))
    failures+=("structure missing in $f")
    printf '  FAIL  structure: %s\n' "$f"
  fi
done

# Claude uses CLAUDE_PLUGIN_ROOT; Codex uses PLUGIN_ROOT
claude_roots=$(jq -r '.. | strings? // empty' "$ROOT/claude-hooks.json" | grep -c 'CLAUDE_PLUGIN_ROOT' || true)
codex_roots=$(jq -r '.. | strings? // empty' "$ROOT/codex-hooks.json" | grep -c 'PLUGIN_ROOT' || true)
claude_bad=$(jq -r '.. | strings? // empty' "$ROOT/claude-hooks.json" | grep -c '\${PLUGIN_ROOT}' || true)
codex_bad=$(jq -r '.. | strings? // empty' "$ROOT/codex-hooks.json" | grep -c 'CLAUDE_PLUGIN_ROOT' || true)

assert_eq "claude-hooks uses CLAUDE_PLUGIN_ROOT" "1" "$([[ "$claude_roots" -ge 1 ]] && echo 1 || echo 0)"
assert_eq "codex-hooks uses PLUGIN_ROOT" "1" "$([[ "$codex_roots" -ge 1 ]] && echo 1 || echo 0)"
assert_eq "claude-hooks avoids PLUGIN_ROOT" "0" "$claude_bad"
assert_eq "codex-hooks avoids CLAUDE_PLUGIN_ROOT" "0" "$codex_bad"

# Codex has UserPromptSubmit + apply_patch matcher; Claude has WebFetch
if jq -e '.hooks.UserPromptSubmit' "$ROOT/codex-hooks.json" >/dev/null 2>&1; then
  PASS=$((PASS + 1)); printf '  PASS  codex UserPromptSubmit present\n'
else
  FAIL=$((FAIL + 1)); failures+=("codex missing UserPromptSubmit"); printf '  FAIL  codex UserPromptSubmit\n'
fi
if jq -r '.. | strings? // empty' "$ROOT/codex-hooks.json" | grep -q apply_patch; then
  PASS=$((PASS + 1)); printf '  PASS  codex apply_patch matcher present\n'
else
  FAIL=$((FAIL + 1)); failures+=("codex missing apply_patch"); printf '  FAIL  codex apply_patch\n'
fi
if jq -r '.. | strings? // empty' "$ROOT/claude-hooks.json" | grep -q WebFetch; then
  PASS=$((PASS + 1)); printf '  PASS  claude WebFetch matcher present\n'
else
  FAIL=$((FAIL + 1)); failures+=("claude missing WebFetch"); printf '  FAIL  claude WebFetch\n'
fi
# WebSearch should NOT be matched for browser intercept on Claude
if jq -r '.. | strings? // empty' "$ROOT/claude-hooks.json" | grep -q WebSearch; then
  FAIL=$((FAIL + 1)); failures+=("claude still matches WebSearch"); printf '  FAIL  claude should not intercept WebSearch\n'
else
  PASS=$((PASS + 1)); printf '  PASS  claude does not intercept WebSearch\n'
fi

# OPL-2842: PreToolUse Bash matcher is a single consolidated entry (one bash
# spawn) pointing at pretooluse-bash.sh, not three separate hook entries.
for f in claude-hooks.json codex-hooks.json; do
  bash_hook_count=$(jq -r --arg m "Bash" '
    [.hooks.PreToolUse[] | select(.matcher | test("(^|[|])" + $m + "([|]|$)"; "i")) | .hooks[]] | length
  ' "$ROOT/$f" 2>/dev/null || echo -1)
  assert_eq "$f: single consolidated Bash PreToolUse entry" "1" "$bash_hook_count"
  if jq -r '.. | strings? // empty' "$ROOT/$f" | grep -q 'pretooluse-bash.sh'; then
    PASS=$((PASS + 1)); printf '  PASS  %s: uses pretooluse-bash.sh\n' "$f"
  else
    FAIL=$((FAIL + 1)); failures+=("$f: does not reference pretooluse-bash.sh")
    printf '  FAIL  %s: uses pretooluse-bash.sh\n' "$f"
  fi
done

# hooks.json removed
if [[ ! -f "$ROOT/hooks.json" ]]; then
  PASS=$((PASS + 1)); printf '  PASS  default hooks.json removed\n'
else
  FAIL=$((FAIL + 1)); failures+=("hooks.json still present"); printf '  FAIL  hooks.json still present\n'
fi

# Shell syntax
for sh in bouncer.sh damage-control.sh publish-gate.sh pretooluse-bash.sh \
          session-context.sh agent-browser-solo.sh browser-intent.sh \
          lib/common.sh; do
  if bash -n "$ROOT/$sh" 2>/dev/null; then
    PASS=$((PASS + 1))
    printf '  PASS  bash -n %s\n' "$sh"
  else
    FAIL=$((FAIL + 1))
    failures+=("bash -n failed: $sh")
    printf '  FAIL  bash -n %s\n' "$sh"
  fi
done

# Python compile (write bytecode to a temp dir so a read-only/cache issue cannot fail us)
PY_TMP=$(mktemp -d)
if python3 -c "import py_compile,sys; py_compile.compile(sys.argv[1], cfile=sys.argv[2], doraise=True)" \
    "$ROOT/hammertime.py" "$PY_TMP/hammertime.pyc" 2>"$PY_TMP/err"; then
  PASS=$((PASS + 1)); printf '  PASS  python compile hammertime.py\n'
else
  FAIL=$((FAIL + 1))
  err=$(cat "$PY_TMP/err" 2>/dev/null || true)
  failures+=("py_compile hammertime.py: $err")
  printf '  FAIL  python compile hammertime.py\n        %s\n' "$err"
fi
rm -rf "$PY_TMP"

# git diff --check on owned files
if git -C "$ROOT/.." diff --check -- hooks/ >/dev/null 2>&1; then
  PASS=$((PASS + 1)); printf '  PASS  git diff --check hooks/\n'
else
  # Also check untracked via diff against empty? For working tree:
  set +e
  check_out=$(git -C "$ROOT/.." diff --check -- hooks/ 2>&1)
  # Include staged
  check_out2=$(git -C "$ROOT/.." diff --cached --check -- hooks/ 2>&1)
  set -e
  if [[ -z "$check_out" && -z "$check_out2" ]]; then
    PASS=$((PASS + 1)); printf '  PASS  git diff --check hooks/\n'
  else
    FAIL=$((FAIL + 1))
    failures+=("git diff --check: $check_out $check_out2")
    printf '  FAIL  git diff --check hooks/\n%s\n%s\n' "$check_out" "$check_out2"
  fi
fi
