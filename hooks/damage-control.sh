#!/bin/bash
# damage-control.sh
# PreToolUse hook: tiered path/command protection from patterns.yaml.
# Supports Claude Code (Bash/Write/Edit/Read) and Codex (Bash/shell + apply_patch).
#
# Runtime (BOPEN_HOOK_RUNTIME=claude|codex):
#   Claude confirmation → permissionDecision: "ask"
#   Codex confirmation  → permissionDecision: "deny" with actionable reason
#
# Exit 0 = allow (or Claude ask JSON on stdout)
# Exit 2 = deny (JSON on stderr)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

PATTERNS_FILE="${SCRIPT_DIR}/patterns.yaml"

if [[ ! -f "$PATTERNS_FILE" ]]; then
  echo "damage-control: patterns.yaml not found at $PATTERNS_FILE" >&2
  exit 0
fi

input=$(cat)
tool_name=$(extract_tool_name "$input")

# ---------------------------------------------------------------------------
# YAML list extract
# ---------------------------------------------------------------------------
extract_section() {
  local section="$1"
  awk "/^${section}:/{found=1; next} found && /^  - /{gsub(/^  - /, \"\"); print} found && /^[a-z]/{found=0}" "$PATTERNS_FILE" | sed 's/^"//;s/"$//'
}

path_matches_list() {
  local filepath="$1"
  local section="$2"
  local basename_path
  basename_path=$(basename "$filepath")

  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    local expanded_pattern
    expanded_pattern="${pattern//\~/$HOME}"

    if [[ "$pattern" == */ ]]; then
      if [[ "$filepath" == "${expanded_pattern}"* ]]; then
        return 0
      fi
      continue
    fi

    if [[ "$pattern" == \*.* ]]; then
      local ext="${pattern#\*}"
      if [[ "$filepath" == *"$ext" ]]; then
        return 0
      fi
      continue
    fi

    if [[ "$pattern" == ".env.*" ]]; then
      if [[ "$basename_path" == .env.* ]]; then
        return 0
      fi
      continue
    fi

    if [[ "$basename_path" == "$pattern" ]] || [[ "$filepath" == "$expanded_pattern" ]]; then
      return 0
    fi
  done < <(extract_section "$section")

  return 1
}

is_exception() {
  local filepath="$1"
  local basename_path
  basename_path=$(basename "$filepath")
  while IFS= read -r exception; do
    [[ -z "$exception" ]] && continue
    if [[ "$basename_path" == "$exception" ]]; then
      return 0
    fi
  done < <(extract_section "zeroAccessExceptions")
  return 1
}

# Enforce path policy for a single file path and operation:
#   write | delete | read
enforce_path_policy() {
  local file_path="$1"
  local op="$2" # write|delete|read

  [[ -z "$file_path" ]] && return 0

  if path_matches_list "$file_path" "zeroAccessPaths"; then
    if ! is_exception "$file_path"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' is in the zero-access list. The agent must never read or write this file. If the user requires changes, they must make them manually."
    fi
  fi

  if [[ "$op" == "write" || "$op" == "delete" ]]; then
    if path_matches_list "$file_path" "readOnlyPaths"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' is read-only. The agent may read this file but must not modify or delete it."
    fi
  fi

  if [[ "$op" == "delete" ]]; then
    if path_matches_list "$file_path" "noDeletePaths"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' matches a no-delete path. This file or directory must not be deleted."
    fi
    # Also treat zero-access as no-delete (already handled above for non-exceptions)
  fi
}

# ---------------------------------------------------------------------------
# Bash / shell — command pattern checks
# ---------------------------------------------------------------------------

_is_shell=false
if is_shell_tool "$tool_name"; then
  _is_shell=true
elif [[ -z "$tool_name" && -n "$(extract_command "$input")" ]]; then
  # Some hosts omit tool_name; treat presence of a command as shell.
  _is_shell=true
fi

if [[ "$_is_shell" == "true" ]]; then
  command_str=$(extract_command "$input")
  command_lower=$(printf '%s' "$command_str" | tr '[:upper:]' '[:lower:]')

  # Hard block: destructiveCommands
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    pattern_lower=$(printf '%s' "$pattern" | tr '[:upper:]' '[:lower:]')

    # Special case: allow --force-with-lease even though --force is blocked
    if [[ "$pattern_lower" == "git push --force"* ]] || [[ "$pattern_lower" == "git push -f "* ]] || [[ "$pattern_lower" == "git push -f" ]]; then
      if printf '%s' "$command_lower" | grep -q "force-with-lease"; then
        continue
      fi
    fi

    if printf '%s' "$command_lower" | grep -qF "$pattern_lower"; then
      deny_permission "BLOCKED by damage-control: command matches destructive pattern '${pattern}'. This operation is not permitted. If you believe this is necessary, ask the user for explicit written permission."
    fi
  done < <(extract_section "destructiveCommands")

  # Confirmation tier: ask (Claude) or deny with reason (Codex)
  # Fixed: do NOT use `local` outside a function (that failed open).
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    pattern_lower=$(printf '%s' "$pattern" | tr '[:upper:]' '[:lower:]')
    if printf '%s' "$command_lower" | grep -qF "$pattern_lower"; then
      ask_or_deny "damage-control: The command matches a confirmation-required pattern (${pattern}). You must ask the user for explicit permission before running: ${command_str}"
    fi
  done < <(extract_section "askConfirmation")

  # noDeletePaths — block rm/unlink targeting protected files
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    expanded_pattern="${pattern//\~/$HOME}"
    basename_pattern=$(basename "$expanded_pattern")

    if printf '%s' "$command_str" | grep -qE '(^|[[:space:];|&])(rm|unlink|rmdir)[[:space:]]' \
      && printf '%s' "$command_str" | grep -qF "$basename_pattern"; then
      deny_permission "BLOCKED by damage-control: attempting to delete protected path '${pattern}'. This file or directory must not be deleted."
    fi
  done < <(extract_section "noDeletePaths")

  exit 0
fi

# ---------------------------------------------------------------------------
# Codex apply_patch — parse Add/Update/Delete file headers
# Native reads and arbitrary shell paths cannot be fully intercepted.
# ---------------------------------------------------------------------------

if is_apply_patch_tool "$tool_name"; then
  patch_body=$(printf '%s' "$input" | jq -r '
    .tool_input.input
    // .tool_input.patch
    // .tool_input.command
    // .tool_input.contents
    // empty
  ' 2>/dev/null || true)

  # Parse anchored headers only:
  #   *** Add File: path
  #   *** Update File: path
  #   *** Delete File: path
  while IFS= read -r header_line; do
    [[ -z "$header_line" ]] && continue
    op=""
    fpath=""
    if [[ "$header_line" =~ ^\*\*\*[[:space:]]+Add[[:space:]]+File:[[:space:]]*(.+)$ ]]; then
      op="write"
      fpath="${BASH_REMATCH[1]}"
    elif [[ "$header_line" =~ ^\*\*\*[[:space:]]+Update[[:space:]]+File:[[:space:]]*(.+)$ ]]; then
      op="write"
      fpath="${BASH_REMATCH[1]}"
    elif [[ "$header_line" =~ ^\*\*\*[[:space:]]+Delete[[:space:]]+File:[[:space:]]*(.+)$ ]]; then
      op="delete"
      fpath="${BASH_REMATCH[1]}"
    else
      continue
    fi
    # Trim trailing whitespace/CR
    fpath=$(printf '%s' "$fpath" | sed 's/[[:space:]]*$//')
    enforce_path_policy "$fpath" "$op"
  done < <(printf '%s\n' "$patch_body" | grep -E '^\*\*\*[[:space:]]+(Add|Update|Delete)[[:space:]]+File:' || true)

  exit 0
fi

# ---------------------------------------------------------------------------
# Write / Edit tool — path checks (Claude)
# ---------------------------------------------------------------------------

tool_lower=$(printf '%s' "$tool_name" | tr '[:upper:]' '[:lower:]')
if [[ "$tool_lower" == "write" || "$tool_lower" == "edit" || "$tool_lower" == "multiedit" ]]; then
  file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
  enforce_path_policy "$file_path" "write"
  exit 0
fi

# ---------------------------------------------------------------------------
# Read tool — zero access paths block reads too (Claude)
# ---------------------------------------------------------------------------

if [[ "$tool_lower" == "read" ]]; then
  file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
  if [[ -n "$file_path" ]]; then
    if path_matches_list "$file_path" "zeroAccessPaths"; then
      if ! is_exception "$file_path"; then
        deny_permission "BLOCKED by damage-control: '${file_path}' is in the zero-access list. The agent must never read this file."
      fi
    fi
  fi
  exit 0
fi

exit 0
