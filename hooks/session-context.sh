#!/bin/bash
# session-context.sh — SessionStart hook that injects active-workspace context.
# Uses hook input .cwd (not the plugin install path). Caps all lists/lengths.
# Plugin inventory is shown only when the active project is itself a plugin repo.
# No set -euo pipefail: partial failures must not block session start.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

if declare -f hook_enabled >/dev/null; then
  hook_enabled "session-context" || exit 0
fi

input=$(cat 2>/dev/null || echo "{}")

# Prefer hook-provided cwd; never default to the plugin cache directory.
cwd=""
if command -v jq >/dev/null 2>&1; then
  cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || true)
fi
if [[ -z "$cwd" || "$cwd" == "null" ]]; then
  cwd="${CLAUDE_WORKING_DIR:-${CODEX_CWD:-$PWD}}"
fi

# Resolve git root from the active workspace (not the plugin root).
git_root=""
if command -v git >/dev/null 2>&1; then
  git_root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)
fi

inspect_root="${git_root:-$cwd}"

MAX_COMMITS=3
MAX_FILES=10
MAX_LINE=140

# Helpers -------------------------------------------------------------------

is_plugin_repo() {
  local root="$1"
  [[ -f "${root}/.claude-plugin/plugin.json" ]] \
    || [[ -f "${root}/.codex-plugin/plugin.json" ]]
}

# Gather context ------------------------------------------------------------

branch="(not a git repo)"
recent_commits="  - (none)"
recent_files="  - (none)"
dirty_count=0
dirty_note=""
in_git=false

if [[ -n "$git_root" ]]; then
  in_git=true
  branch=$(git -C "$git_root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  raw_commits=$(git -C "$git_root" log --oneline -"${MAX_COMMITS}" 2>/dev/null || true)
  if [[ -n "$raw_commits" ]]; then
    recent_commits=$(printf '%s\n' "$raw_commits" | awk -v mc="$MAX_LINE" '{
      line = "  - " $0
      if (length(line) > mc) line = substr(line, 1, mc - 1) "…"
      print line
    }')
  fi

  dirty_count=$(git -C "$git_root" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${dirty_count:-0}" -gt 0 ]]; then
    dirty_note=" (${dirty_count} uncommitted)"
  fi

  raw_files=$(git -C "$git_root" diff-tree --no-commit-id -r --name-only HEAD 2>/dev/null || true)
  if [[ -n "$raw_files" ]]; then
    recent_files=$(printf '%s\n' "$raw_files" | head -n "$MAX_FILES" | awk -v mc="$MAX_LINE" '{
      line = "  - " $0
      if (length(line) > mc) line = substr(line, 1, mc - 1) "…"
      print line
    }')
    file_total=$(printf '%s\n' "$raw_files" | wc -l | tr -d ' ')
    if [[ "${file_total:-0}" -gt "$MAX_FILES" ]]; then
      recent_files="${recent_files}
  … ($((file_total - MAX_FILES)) more truncated)"
    fi
  else
    recent_files="  - (no files in last commit)"
  fi
fi

# Plugin inventory only when the active project is a plugin repo
plugin_line=""
if is_plugin_repo "$inspect_root"; then
  agent_count=$(find "${inspect_root}/agents" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  skill_count=$(find "${inspect_root}/skills" -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  command_count=$(find "${inspect_root}/commands" -maxdepth 2 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  hook_count=$(find "${inspect_root}/hooks" -maxdepth 1 \( -name "*.sh" -o -name "*.py" \) 2>/dev/null | wc -l | tr -d ' ')
  plugin_line="- Plugin inventory: ${agent_count:-0} agents, ${skill_count:-0} skills, ${command_count:-0} commands, ${hook_count:-0} hooks"
fi

# Build human-readable context with REAL newlines (not literal \n)
context_file=$(mktemp 2>/dev/null || echo "")
if [[ -n "$context_file" ]]; then
  {
    printf '%s\n' "## Session Context (active workspace)"
    printf '%s\n' "- Cwd: ${cwd}"
    if [[ "$in_git" == "true" ]]; then
      printf '%s\n' "- Git root: ${git_root}"
      printf '%s\n' "- Branch: ${branch}${dirty_note}"
      printf '%s\n' "- Last commits:"
      printf '%s\n' "$recent_commits"
      printf '%s\n' "- Files changed in last commit:"
      printf '%s\n' "$recent_files"
    else
      printf '%s\n' "- Git: not a repository (cwd used as workspace root)"
    fi
    if [[ -n "$plugin_line" ]]; then
      printf '%s\n' "$plugin_line"
    fi
  } > "$context_file"
  context=$(cat "$context_file")
  rm -f "$context_file"
else
  context="## Session Context (active workspace)
- Cwd: ${cwd}"
fi

# One-time hooks setup offer, linear-sync style: when no user hooks config
# exists, point the session at the hook-manager skill. The wizard writes the
# config (even for "keep all defaults"), which silences this permanently.
if [[ ! -f "${HOME}/.claude/bopen-tools/hooks-config.json" ]]; then
  context="${context}

[BOPEN-HOOKS-SETUP] No hooks config found at ~/.claude/bopen-tools/hooks-config.json. All bopen-tools hooks are running with defaults (everything enabled). When convenient — do not interrupt the user's task for this — offer to run hook setup via the bopen-tools:hook-manager skill (conversational) or the bopen-tools:setup skill (visual installer UI covering hooks plus all other harness dependencies) to review which hooks are enabled and check their prerequisites. Writing the config (even all-defaults) dismisses this notice."
fi

# Emit JSON with real newlines inside additionalContext via json.dumps
if command -v python3 >/dev/null 2>&1; then
  ADDITIONAL="$context" python3 - <<'PY'
import json, os
ctx = os.environ.get("ADDITIONAL", "")
# Hard cap total context size
if len(ctx) > 4000:
    ctx = ctx[:3990] + "\n…"
out = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": ctx,
    }
}
print(json.dumps(out, ensure_ascii=False))
PY
else
  # Minimal fallback
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Session cwd: %s"}}\n' \
    "$(printf '%s' "$cwd" | sed 's/"/\\"/g')"
fi
