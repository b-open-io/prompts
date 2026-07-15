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

safe_alternative_for() {
  local reason="$1"

  case "$reason" in
    "git reset --hard")
      printf '%s' "inspect with 'git status' and 'git diff'; if the goal is only to unstage files, use 'git restore --staged <path>', and preserve wanted work in a named stash before any cleanup"
      ;;
    "git clean -f")
      printf '%s' "preview exactly what would be removed with 'git clean -nd' and move wanted untracked files to scratch before asking for cleanup approval"
      ;;
    "git checkout -f"|"git checkout -- <paths>")
      printf '%s' "inspect the affected paths with 'git diff -- <paths>' and preserve wanted changes with 'git stash push -m \"backup before checkout\" -- <paths>'"
      ;;
    "git restore --worktree"|"git restore -s/--source"|"git restore (worktree)")
      printf '%s' "inspect with 'git diff -- <paths>'; use 'git restore --staged <paths>' if you only need to unstage, or stash a named backup before restoring the worktree"
      ;;
    "git stash clear")
      printf '%s' "review with 'git stash list' and 'git stash show -p stash@{0}', then keep or export needed stashes instead of clearing all of them"
      ;;
    *)
      printf '%s' "inspect with 'git status' and 'git diff', then preserve wanted work in a named stash before requesting approval"
      ;;
  esac
}

# Entry point. Callable standalone (this file executed directly) or sourced
# and invoked in-process by pretooluse-bash.sh — either way $1 is the raw
# hook stdin JSON; a deny/ask exits the whole process via common.sh, an
# allow returns 0 so a caller can continue to the next check.
bouncer_main() {
  local input="$1"
  hook_enabled "bouncer" || return 0

  local tool_name
  tool_name=$(extract_tool_name "$input")

  # Only act on shell tools; other tools pass through.
  if [[ -n "$tool_name" ]] && ! is_shell_tool "$tool_name"; then
    return 0
  fi

  local command
  command=$(extract_command "$input")
  if [[ -z "$command" ]]; then
    return 0
  fi

  local reason
  reason=$(hard_block_reason "$command" || true)
  if [[ -n "${reason:-}" ]]; then
    local alternative
    alternative=$(safe_alternative_for "$reason")
    deny_permission "BLOCKED: This command can destroy uncommitted work (matched: ${reason}). Ask the user for explicit permission before running destructive git commands. Safe alternative: ${alternative}."
  fi

  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  input=$(cat)
  bouncer_main "$input"
  exit 0
fi
