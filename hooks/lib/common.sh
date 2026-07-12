#!/bin/bash
# Shared helpers for dual-runtime (Claude Code + Codex) hooks.
# Source from hook scripts:  source "$(dirname "$0")/lib/common.sh"
# Or:                       source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

# Runtime: set BOPEN_HOOK_RUNTIME=claude|codex in the hook command string.
# Defaults to claude for backward compatibility.
get_runtime() {
  local rt="${BOPEN_HOOK_RUNTIME:-}"
  if [[ -z "$rt" ]]; then
    if [[ -n "${PLUGIN_ROOT:-}" && -z "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
      rt="codex"
    else
      rt="claude"
    fi
  fi
  # Normalize
  case "$rt" in
    codex|Codex|CODEX) echo "codex" ;;
    *) echo "claude" ;;
  esac
}

# Resolve workspace cwd from hook stdin JSON (preferred) then env fallbacks.
# Usage: cwd=$(resolve_cwd "$input_json")
resolve_cwd() {
  local input="${1:-}"
  local cwd=""
  if [[ -n "$input" ]]; then
    cwd=$(printf '%s' "$input" | jq -r '.cwd // .tool_input.cwd // empty' 2>/dev/null || true)
  fi
  if [[ -z "$cwd" || "$cwd" == "null" ]]; then
    cwd="${CLAUDE_WORKING_DIR:-${CODEX_CWD:-$PWD}}"
  fi
  printf '%s' "$cwd"
}

# JSON-escape a string (no surrounding quotes). The herestring feeding stdin
# appends a newline; strip that one so messages don't end with a stray \n.
json_escape() {
  python3 -c 'import json,sys; s=sys.stdin.read(); s=s[:-1] if s.endswith("\n") else s; print(json.dumps(s)[1:-1])' <<< "${1:-}"
}

# Emit a hard deny, per runtime.
# Claude Code: structured deny on stdout, exit 0 — stderr + exit 2 surfaces as
# a "PreToolUse hook error" banner instead of a clean deny (regression first
# fixed in 0abffbe; do not unify back onto the codex path).
# Codex: JSON on stderr, exit 2 (its supported block signal).
deny_permission() {
  local reason
  reason=$(json_escape "${1:-Blocked by hook.}")
  local runtime
  runtime=$(get_runtime)

  if [[ "$runtime" == "codex" ]]; then
    printf '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"%s"}' \
      "$reason" >&2
    exit 2
  fi

  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' \
    "$reason"
  exit 0
}

# Deny while delivering content through additionalContext, per runtime.
# Claude Code renders the deny REASON in the transcript (tinted), but
# additionalContext arrives as an invisible system reminder — so keep the
# reason to ONE short line and put the payload in the context argument.
# Codex has no additionalContext: reason and payload are concatenated into
# the stderr deny (its UI does not have the banner problem).
deny_with_context() {
  local reason_raw="${1:-Blocked by hook.}"
  local context_raw="${2:-}"
  local runtime
  runtime=$(get_runtime)

  if [[ "$runtime" == "codex" ]]; then
    local combined
    combined=$(json_escape "${reason_raw}
${context_raw}")
    printf '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"%s"}' \
      "$combined" >&2
    exit 2
  fi

  local reason context
  reason=$(json_escape "$reason_raw")
  context=$(json_escape "$context_raw")
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s","additionalContext":"%s"}}' \
    "$reason" "$context"
  exit 0
}

# Confirmation-tier: Claude asks the user; Codex denies with an actionable reason
# (Codex does not support permissionDecision=ask or continue/stopReason fields).
ask_or_deny() {
  local reason="${1:-This action requires explicit user confirmation.}"
  local runtime
  runtime=$(get_runtime)
  local escaped
  escaped=$(json_escape "$reason")

  if [[ "$runtime" == "codex" ]]; then
    printf '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"%s"}' \
      "$escaped" >&2
    exit 2
  fi

  # Claude Code: supported ask path
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"},"systemMessage":"%s"}' \
    "$escaped" "$escaped"
  exit 0
}

# Extract Bash/shell command from various tool input shapes.
extract_command() {
  local input="${1:-}"
  printf '%s' "$input" | jq -r '
    .tool_input.command
    // .tool_input.cmd
    // .command
    // empty
  ' 2>/dev/null || true
}

# Extract tool name, case-preserving.
extract_tool_name() {
  local input="${1:-}"
  printf '%s' "$input" | jq -r '.tool_name // .toolName // empty' 2>/dev/null || true
}

# True if tool is a shell/bash tool (Claude Bash or Codex shell variants).
is_shell_tool() {
  local name
  name=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')
  case "$name" in
    bash|shell|shell_command|run_terminal_command|local_shell) return 0 ;;
    *) return 1 ;;
  esac
}

# True if tool is apply_patch / file-edit via patch.
is_apply_patch_tool() {
  local name
  name=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')
  case "$name" in
    apply_patch|applypatch|apply-patch) return 0 ;;
    *) return 1 ;;
  esac
}

# Cap a multi-line string to N lines, each line to M chars.
# Usage: capped=$(cap_lines "$text" 5 120)
cap_lines() {
  local text="${1:-}"
  local max_lines="${2:-10}"
  local max_chars="${3:-160}"
  printf '%s' "$text" | awk -v ml="$max_lines" -v mc="$max_chars" '
    NR <= ml {
      line = $0
      if (length(line) > mc) line = substr(line, 1, mc - 1) "…"
      print line
    }
    END {
      if (NR > ml) print "  … (" (NR - ml) " more truncated)"
    }
  '
}
