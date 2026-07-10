#!/bin/bash
# bouncer.sh — PreToolUse Bash guard against work-loss git commands.
# Hard-blocks destructive ops. Allows nondestructive unstaging.
# git stash drop is confirmation-tier (handled by damage-control), not hard-blocked here.
#
# Exit 0 = allow
# Exit 2 + JSON stderr = deny

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

input=$(cat)
tool_name=$(extract_tool_name "$input")

# Only act on shell tools; other tools pass through.
if [[ -n "$tool_name" ]] && ! is_shell_tool "$tool_name"; then
  exit 0
fi

command=$(extract_command "$input")
if [[ -z "$command" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Classification helpers
# Returns 0 if the command should be hard-blocked; prints matched reason.
# ---------------------------------------------------------------------------
hard_block_reason() {
  local cmd="$1"

  # git reset --hard  (any position / flags order)
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+([^|;]*[[:space:]])?reset[[:space:]]+([^|;]*[[:space:]])?--hard\b'; then
    printf '%s' "git reset --hard"
    return 0
  fi

  # git clean with force (-f / -fd / -fx / combined flags containing f)
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+clean[[:space:]]+([^|;]*-[[:alnum:]]*f|[[:space:]]+-f\b)'; then
    printf '%s' "git clean -f"
    return 0
  fi

  # git checkout -f
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+checkout[[:space:]]+([^|;]*[[:space:]])?-f\b'; then
    printf '%s' "git checkout -f"
    return 0
  fi

  # git checkout -- <paths>  (discards worktree changes)
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+checkout[[:space:]]+--([[:space:]]|$)'; then
    printf '%s' "git checkout -- <paths>"
    return 0
  fi

  # git restore: allow pure --staged / -S unstaging; block worktree restores.
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+restore\b'; then
    # Block explicit worktree restore
    if printf '%s' "$cmd" | grep -qE -- '--worktree|-W\b'; then
      printf '%s' "git restore --worktree"
      return 0
    fi
    # Block restore from a source (-s / --source) that overwrites worktree
    if printf '%s' "$cmd" | grep -qE -- '(^|[[:space:]])-s[[:space:]]|=|--source([=[:space:]])' ; then
      # Allow if ONLY staged and source is used with --staged? Still can be destructive to index.
      # Safer: block -s without pure staged-only intent when worktree would change.
      if ! printf '%s' "$cmd" | grep -qE -- '--staged|-S\b'; then
        printf '%s' "git restore -s/--source"
        return 0
      fi
    fi
    # Pure staged unstage: git restore --staged [--] <paths>
    if printf '%s' "$cmd" | grep -qE -- '--staged|-S\b'; then
      return 1
    fi
    # Default git restore <paths> discards worktree changes
    printf '%s' "git restore (worktree)"
    return 0
  fi

  # git stash clear — drops all stashes unconditionally
  if printf '%s' "$cmd" | grep -qE '(^|[[:space:];|&])git[[:space:]]+stash[[:space:]]+clear\b'; then
    printf '%s' "git stash clear"
    return 0
  fi

  # Intentionally NOT blocked (nondestructive / confirmation-tier):
  #   git reset HEAD -- <file>     (unstaging)
  #   git reset -- <file>          (mixed path reset = unstage)
  #   git restore --staged <file>  (unstaging)
  #   git stash drop               (confirmation-tier via damage-control)

  return 1
}

reason=$(hard_block_reason "$command" || true)
if [[ -n "${reason:-}" ]]; then
  deny_permission "BLOCKED: This command can destroy uncommitted work (matched: ${reason}). Ask the user for explicit permission before running destructive git commands."
fi

exit 0
