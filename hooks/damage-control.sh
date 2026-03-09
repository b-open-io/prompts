#!/bin/bash
# damage-control.sh
# PreToolUse hook: enforces tiered path and command protection defined in patterns.yaml.
# Exit 0 = allow, Exit 2 = block (stderr message fed to Claude).
# JSON output on stdout = ask for confirmation (askConfirmation tier).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS_FILE="${SCRIPT_DIR}/patterns.yaml"

if [[ ! -f "$PATTERNS_FILE" ]]; then
  echo "damage-control: patterns.yaml not found at $PATTERNS_FILE" >&2
  exit 0
fi

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // ""')

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Extract a YAML list section into newline-separated values.
# Usage: extract_section SECTION_NAME
extract_section() {
  local section="$1"
  awk "/^${section}:/{found=1; next} found && /^  - /{gsub(/^  - /, \"\"); print} found && /^[a-z]/{found=0}" "$PATTERNS_FILE" | sed 's/^"//;s/"$//'
}

# Return 0 (true) if the given path matches any pattern in the list.
# Supports prefix matching (ends with /), glob-style *. suffix, and exact match.
path_matches_list() {
  local filepath="$1"
  local section="$2"
  local basename_path
  basename_path=$(basename "$filepath")

  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    local expanded_pattern
    expanded_pattern="${pattern//\~/$HOME}"

    # Prefix match (directory patterns ending with /)
    if [[ "$pattern" == */ ]]; then
      if [[ "$filepath" == "${expanded_pattern}"* ]]; then
        return 0
      fi
      continue
    fi

    # Glob suffix match (e.g., *.pem, *.key)
    if [[ "$pattern" == \*.* ]]; then
      local ext="${pattern#\*}"
      if [[ "$filepath" == *"$ext" ]]; then
        return 0
      fi
      continue
    fi

    # .env.* wildcard (special case: match any .env.something)
    if [[ "$pattern" == ".env.*" ]]; then
      if [[ "$basename_path" == .env.* ]]; then
        return 0
      fi
      continue
    fi

    # Exact basename match or exact full path match
    if [[ "$basename_path" == "$pattern" ]] || [[ "$filepath" == "$expanded_pattern" ]]; then
      return 0
    fi
  done < <(extract_section "$section")

  return 1
}

# Return 0 (true) if path is in the zeroAccessExceptions list.
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

block() {
  local reason="$1"
  printf '{"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"%s"}' \
    "$reason" >&2
  exit 2
}

# ---------------------------------------------------------------------------
# Bash tool — command pattern checks
# ---------------------------------------------------------------------------

if [[ "$tool_name" == "Bash" ]]; then
  command_str=$(echo "$input" | jq -r '.tool_input.command // ""')
  command_lower=$(echo "$command_str" | tr '[:upper:]' '[:lower:]')

  # Hard block: destructiveCommands
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    pattern_lower=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')

    # Special case: allow --force-with-lease even though --force is blocked
    if [[ "$pattern_lower" == "git push --force"* ]] || [[ "$pattern_lower" == "git push -f "* ]]; then
      if echo "$command_lower" | grep -q "force-with-lease"; then
        continue
      fi
    fi

    if echo "$command_lower" | grep -qF "$pattern_lower"; then
      block "BLOCKED by damage-control: command matches destructive pattern '${pattern}'. This operation is not permitted. If you believe this is necessary, ask the user for explicit written permission."
    fi
  done < <(extract_section "destructiveCommands")

  # Ask confirmation: askConfirmation (output JSON to stdout, exit 0)
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    pattern_lower=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')
    if echo "$command_lower" | grep -qF "$pattern_lower"; then
      printf '{"continue":false,"stopReason":"damage-control: The command `%s` matches a confirmation-required pattern. You must ask the user for explicit permission before running: %s"}' \
        "$pattern" "$command_str"
      exit 0
    fi
  done < <(extract_section "askConfirmation")

  # noDeletePaths — block rm/unlink targeting protected files
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    expanded_pattern="${pattern//\~/$HOME}"
    basename_pattern=$(basename "$expanded_pattern")

    if echo "$command_str" | grep -qE "(rm|unlink|rmdir)[[:space:]].*${basename_pattern}"; then
      block "BLOCKED by damage-control: attempting to delete protected path '${pattern}'. This file or directory must not be deleted."
    fi
  done < <(extract_section "noDeletePaths")

  exit 0
fi

# ---------------------------------------------------------------------------
# Write / Edit / MultiEdit tool — path checks
# ---------------------------------------------------------------------------

if [[ "$tool_name" == "Write" || "$tool_name" == "Edit" || "$tool_name" == "MultiEdit" ]]; then
  file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // ""')

  if [[ -z "$file_path" ]]; then
    exit 0
  fi

  # zeroAccessPaths — block unless it is an exception
  if path_matches_list "$file_path" "zeroAccessPaths"; then
    if ! is_exception "$file_path"; then
      block "BLOCKED by damage-control: '${file_path}' is in the zero-access list. Claude must never read or write this file. If the user requires changes, they must make them manually."
    fi
  fi

  # readOnlyPaths — block writes
  if path_matches_list "$file_path" "readOnlyPaths"; then
    block "BLOCKED by damage-control: '${file_path}' is read-only. Claude may read this file but must not modify it."
  fi

  exit 0
fi

# ---------------------------------------------------------------------------
# Read tool — zero access paths block reads too
# ---------------------------------------------------------------------------

if [[ "$tool_name" == "Read" ]]; then
  file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

  if [[ -z "$file_path" ]]; then
    exit 0
  fi

  if path_matches_list "$file_path" "zeroAccessPaths"; then
    if ! is_exception "$file_path"; then
      block "BLOCKED by damage-control: '${file_path}' is in the zero-access list. Claude must never read this file."
    fi
  fi

  exit 0
fi

exit 0
