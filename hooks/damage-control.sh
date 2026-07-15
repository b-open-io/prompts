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

# Extract the argument paths rm/unlink/rmdir would actually operate on,
# across a shell chain — never the raw command string. A chained command
# that merely mentions a protected path elsewhere (e.g. `rm /tmp/x && cat
# ~/.claude/plugins/foo`) must not trip the no-delete check just because the
# whole line contains the substring; only rm's own arguments count.
extract_rm_targets() {
  local cmd="$1"
  local seg trimmed word found
  while IFS= read -r seg; do
    trimmed="$(printf '%s' "$seg" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [[ -z "$trimmed" ]] && continue
    found=false
    for word in $trimmed; do
      if [[ "$found" == "true" ]]; then
        [[ "$word" == -* ]] && continue
        printf '%s\n' "$word"
      elif [[ "$word" == "rm" || "$word" == "unlink" || "$word" == "rmdir" ]]; then
        found=true
      fi
    done
  done < <(printf '%s\n' "$cmd" | tr ';&|' '\n\n\n')
}

# True if a resolved rm-target path matches a noDeletePaths entry — either
# exactly (file or the protected directory itself) or as a path underneath a
# trailing-slash directory pattern.
rm_target_matches_no_delete() {
  local target="$1"
  local expanded_target="${target//\~/$HOME}"
  local target_noslash="${expanded_target%/}"
  local basename_target
  basename_target=$(basename "$expanded_target")

  local pattern expanded_pattern pattern_noslash
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    expanded_pattern="${pattern//\~/$HOME}"

    if [[ "$pattern" == */ ]]; then
      pattern_noslash="${expanded_pattern%/}"
      if [[ "$target_noslash" == "$pattern_noslash" ]] || [[ "$expanded_target" == "${expanded_pattern}"* ]]; then
        return 0
      fi
      continue
    fi

    if [[ "$basename_target" == "$pattern" ]] || [[ "$expanded_target" == "$expanded_pattern" ]]; then
      return 0
    fi
  done < <(extract_section "noDeletePaths")

  return 1
}

safe_command_alternative() {
  local pattern="$1"

  case "$pattern" in
    "git reset --hard")
      printf '%s' "inspect with 'git status' and 'git diff'; use 'git restore --staged <path>' to unstage, or preserve work in a named stash before requesting approval"
      ;;
    "git clean -fd"|"git clean -df")
      printf '%s' "preview with 'git clean -nd' and move wanted untracked files to scratch before requesting cleanup approval"
      ;;
    "git push --force"|"git push -f")
      printf '%s' "use 'git push --force-with-lease' so the push refuses to overwrite unexpected remote work"
      ;;
    "npm unpublish")
      printf '%s' "deprecate the affected version with 'npm deprecate <package>@<version> \"reason\"' instead of removing it"
      ;;
    "drop table"|"drop database"|"truncate table"|"truncate ")
      printf '%s' "inspect the affected rows/schema with a read-only query and prepare a reviewed migration plus backup before requesting execution"
      ;;
    "vercel rm"|"vercel remove"|"railway delete")
      printf '%s' "list and inspect the target first, then disable or scale it down where supported while a human reviews permanent deletion"
      ;;
    "rm -rf /"|"rm -rf /*"|"rm -fr /"|"rm -fr /*"|"rm -r -f /")
      printf '%s' "operate only on an explicitly named disposable scratch directory and inspect the resolved path before removing anything"
      ;;
    "chmod 777")
      printf '%s' "grant only the needed owner/group permission, such as 'chmod u+rwX <path>', after inspecting the current mode"
      ;;
    *)
      printf '%s' "use the command's preview or dry-run form and preserve affected work in a named stash, backup, or scratch copy before requesting approval"
      ;;
  esac
}

# Enforce path policy for a single file path and operation:
#   write | delete | read
enforce_path_policy() {
  local file_path="$1"
  local op="$2" # write|delete|read

  [[ -z "$file_path" ]] && return 0

  if path_matches_list "$file_path" "zeroAccessPaths"; then
    if ! is_exception "$file_path"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' is in the zero-access list. The agent must never read or write this file. Safe alternative: work from a redacted .env.example/.env.sample or ask the user to make the secret-bearing change manually and provide only sanitized results."
    fi
  fi

  if [[ "$op" == "write" || "$op" == "delete" ]]; then
    if path_matches_list "$file_path" "readOnlyPaths"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' is read-only. The agent may read this file but must not modify or delete it. Safe alternative: copy the relevant content to a project scratch directory, edit the copy, and propose the resulting diff."
    fi
    if path_matches_list "$file_path" "askPaths"; then
      ask_or_deny "damage-control: '${file_path}' controls which guard hooks are enabled. Modifying it requires the user's explicit confirmation — disabling guards removes work-loss and secret protections. State plainly which hooks the change affects. Safe alternative: leave the config unchanged, describe the exact proposed edit, and continue under the current protections while awaiting confirmation."
    fi
  fi

  if [[ "$op" == "delete" ]]; then
    if path_matches_list "$file_path" "noDeletePaths"; then
      deny_permission "BLOCKED by damage-control: '${file_path}' matches a no-delete path. This file or directory must not be deleted. Safe alternative: for a regular tracked file that only needs to stop being tracked, use 'git rm --cached -- ${file_path}'; otherwise copy or move new work to scratch while leaving the protected path intact."
    fi
    # Also treat zero-access as no-delete (already handled above for non-exceptions)
  fi
}

# Entry point. Callable standalone (this file executed directly) or sourced
# and invoked in-process by pretooluse-bash.sh — either way $1 is the raw
# hook stdin JSON; a deny/ask exits the whole process via common.sh, an
# allow returns 0 so a caller can continue to the next check.
damage_control_main() {
  local input="$1"
  hook_enabled "damage-control" || return 0

  if [[ ! -f "$PATTERNS_FILE" ]]; then
    echo "damage-control: patterns.yaml not found at $PATTERNS_FILE" >&2
    return 0
  fi

  local tool_name
  tool_name=$(extract_tool_name "$input")

  # ---------------------------------------------------------------------------
  # Bash / shell — command pattern checks
  # ---------------------------------------------------------------------------

  local _is_shell=false
  if is_shell_tool "$tool_name"; then
    _is_shell=true
  elif [[ -z "$tool_name" && -n "$(extract_command "$input")" ]]; then
    # Some hosts omit tool_name; treat presence of a command as shell.
    _is_shell=true
  fi

  if [[ "$_is_shell" == "true" ]]; then
    local command_str command_lower alternative
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
        alternative=$(safe_command_alternative "$pattern")
        deny_permission "BLOCKED by damage-control: command matches destructive pattern '${pattern}'. This operation is not permitted. If you believe this is necessary, ask the user for explicit written permission. Safe alternative: ${alternative}."
      fi
    done < <(extract_section "destructiveCommands")

    # Confirmation tier: ask (Claude) or deny with reason (Codex)
    # Fixed: do NOT use `local` outside a function (that failed open).
    while IFS= read -r pattern; do
      [[ -z "$pattern" ]] && continue
      pattern_lower=$(printf '%s' "$pattern" | tr '[:upper:]' '[:lower:]')
      if printf '%s' "$command_lower" | grep -qF "$pattern_lower"; then
        ask_or_deny "damage-control: The command matches a confirmation-required pattern (${pattern}). You must ask the user for explicit permission before running: ${command_str}. Safe alternative: preview first with 'git status', 'git diff', 'git stash list', or the command's dry-run form, and preserve affected work in a named backup or scratch copy."
      fi
    done < <(extract_section "askConfirmation")

    # noDeletePaths — block rm/unlink/rmdir targeting protected paths, evaluated
    # against each invocation's actual argument paths (see extract_rm_targets).
    while IFS= read -r target; do
      [[ -z "$target" ]] && continue
      if rm_target_matches_no_delete "$target"; then
        deny_permission "BLOCKED by damage-control: attempting to delete protected path '${target}'. This file or directory must not be deleted. Safe alternative: for a regular tracked file that only needs to stop being tracked, use 'git rm --cached -- ${target}'; otherwise copy or move new work to scratch while leaving the protected path intact."
      fi
    done < <(extract_rm_targets "$command_str")

    return 0
  fi

  # ---------------------------------------------------------------------------
  # Codex apply_patch — parse Add/Update/Delete file headers
  # Native reads and arbitrary shell paths cannot be fully intercepted.
  # ---------------------------------------------------------------------------

  if is_apply_patch_tool "$tool_name"; then
    local patch_body
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

    return 0
  fi

  # ---------------------------------------------------------------------------
  # Write / Edit tool — path checks (Claude)
  # ---------------------------------------------------------------------------

  local tool_lower
  tool_lower=$(printf '%s' "$tool_name" | tr '[:upper:]' '[:lower:]')
  if [[ "$tool_lower" == "write" || "$tool_lower" == "edit" || "$tool_lower" == "multiedit" ]]; then
    local file_path
    file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
    enforce_path_policy "$file_path" "write"
    return 0
  fi

  # ---------------------------------------------------------------------------
  # Read tool — zero access paths block reads too (Claude)
  # ---------------------------------------------------------------------------

  if [[ "$tool_lower" == "read" ]]; then
    local file_path
    file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
    if [[ -n "$file_path" ]]; then
      if path_matches_list "$file_path" "zeroAccessPaths"; then
        if ! is_exception "$file_path"; then
          deny_permission "BLOCKED by damage-control: '${file_path}' is in the zero-access list. The agent must never read this file. Safe alternative: use a redacted .env.example/.env.sample or ask the user for the specific sanitized, non-secret value needed."
        fi
      fi
    fi
    return 0
  fi

  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  input=$(cat)
  damage_control_main "$input"
  exit 0
fi
