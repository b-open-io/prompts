#!/bin/bash
# Shared helpers for Claude Code, Codex, and Grok Build hooks.
# Source from hook scripts:  source "$(dirname "$0")/lib/common.sh"
# Or:                       source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

# Include guard: pretooluse-bash.sh sources this directly, then sources
# bouncer.sh/damage-control.sh/publish-gate.sh which each also source this
# file — skip re-parsing after the first load in a process.
if [[ -n "${_BOPEN_COMMON_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || true
fi
_BOPEN_COMMON_SH_LOADED=1

# Runtime: set BOPEN_HOOK_RUNTIME=claude|codex|grok in the hook command string.
# When unset, detect from the host environment. Never treat Grok as Claude
# just because Grok also exports CLAUDE_PLUGIN_ROOT.
get_runtime() {
  local rt="${BOPEN_HOOK_RUNTIME:-}"
  if [[ -z "$rt" ]]; then
    if [[ -n "${GROK_AGENT:-}" || -n "${GROK_HOOK_EVENT:-}" ]]; then
      rt="grok"
    elif [[ -n "${PLUGIN_ROOT:-}" && -z "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
      rt="codex"
    else
      rt="claude"
    fi
  fi
  case "$rt" in
    grok|Grok|GROK) echo "grok" ;;
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
    cwd=$(printf '%s' "$input" | jq -r '.cwd // .workspaceRoot // .tool_input.cwd // .toolInput.cwd // empty' 2>/dev/null || true)
  fi
  if [[ -z "$cwd" || "$cwd" == "null" ]]; then
    cwd="${GROK_WORKSPACE_ROOT:-${CLAUDE_WORKING_DIR:-${CODEX_CWD:-$PWD}}}"
  fi
  printf '%s' "$cwd"
}

# Per-hook enable/disable gate. Call as the first act of every hook:
#   hook_enabled "bouncer" || exit 0
# Config precedence: $BOPEN_HOOKS_CONFIG (explicit file, tests/power users)
# → project .claude/bopen-hooks.json → project .grok/bopen-hooks.json
# → user ~/.claude/core/hooks-config.json → user ~/.grok/core/hooks-config.json.
# Schema: {"hooks": {"<name>": true|false}}. A hook is disabled ONLY by an
# explicit false; absent files, absent keys, or unreadable JSON mean enabled —
# a broken or missing config must never silently switch the guards off.
hook_enabled() {
  local name="$1"
  local verdict=""
  local cfg
  for cfg in \
    "${BOPEN_HOOKS_CONFIG:-}" \
    "${CLAUDE_PROJECT_DIR:-$PWD}/.claude/bopen-hooks.json" \
    "${GROK_WORKSPACE_ROOT:-${CLAUDE_PROJECT_DIR:-$PWD}}/.grok/bopen-hooks.json" \
    "${HOME}/.claude/core/hooks-config.json" \
    "${HOME}/.grok/core/hooks-config.json"
  do
    [[ -n "$cfg" && -f "$cfg" ]] || continue
    # NB: jq's `//` treats false as absent — use tostring, never `// empty`.
    verdict=$(jq -r --arg n "$name" '.hooks[$n] | tostring' "$cfg" 2>/dev/null || true)
    if [[ "$verdict" == "true" || "$verdict" == "false" ]]; then
      break
    fi
    verdict=""
  done
  [[ "$verdict" != "false" ]]
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
# Grok: {"decision":"deny","reason":"..."} on stdout. permissionDecision is
# ignored; only decision/reason blocks a tool.
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

  if [[ "$runtime" == "grok" ]]; then
    printf '{"decision":"deny","reason":"%s"}' "$reason"
    exit 0
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

  if [[ "$runtime" == "grok" ]]; then
    local combined
    combined=$(json_escape "${reason_raw}
${context_raw}")
    printf '{"decision":"deny","reason":"%s"}' "$combined"
    exit 0
  fi

  local reason context
  reason=$(json_escape "$reason_raw")
  context=$(json_escape "$context_raw")
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s","additionalContext":"%s"}}' \
    "$reason" "$context"
  exit 0
}

# Confirmation-tier: Claude asks the user. Codex and Grok have no ask
# flow, so they deny with an actionable reason.
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

  if [[ "$runtime" == "grok" ]]; then
    printf '{"decision":"deny","reason":"%s"}' "$escaped"
    exit 0
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
    // .toolInput.command
    // .tool_input.cmd
    // .toolInput.cmd
    // .command
    // empty
  ' 2>/dev/null || true
}

# Extract tool name, case-preserving.
extract_tool_name() {
  local input="${1:-}"
  printf '%s' "$input" | jq -r '.tool_name // .toolName // empty' 2>/dev/null || true
}

# Extract a file path from Write/Edit/Read/search_replace payloads.
extract_file_path() {
  local input="${1:-}"
  printf '%s' "$input" | jq -r '
    .tool_input.file_path
    // .toolInput.file_path
    // .tool_input.target_file
    // .toolInput.target_file
    // .tool_input.path
    // .toolInput.path
    // empty
  ' 2>/dev/null || true
}

# True if tool is a shell/bash tool (Claude Bash, Codex shell, Grok run_terminal_command).
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

is_file_write_tool() {
  local name
  name=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')
  case "$name" in
    write|edit|multiedit|search_replace) return 0 ;;
    *) return 1 ;;
  esac
}

is_file_read_tool() {
  local name
  name=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')
  case "$name" in
    read|read_file) return 0 ;;
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
