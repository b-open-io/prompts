#!/bin/bash
# repo-freshness.sh — SessionStart hook. Keeps the active repo in sync with its
# remote so local checkouts don't silently drift behind (e.g. behind an
# autonomous loop that advances origin every cycle while the human checkout sits
# still and falls dozens of commits behind).
#
# STRICTLY NON-DESTRUCTIVE. It only ever fast-forwards, and only when provably
# safe:
#   • checked-out branch, clean tree, strictly behind its upstream → git merge --ff-only
#   • the default branch (when NOT checked out) is behind origin     → advance its ref only
#   • branch has diverged from upstream (local commits not on remote)→ WARN, never touch
#   • dirty working tree                                             → report, never touch
# It never resets, rebases, merges non-ff, stashes, or touches a dirty tree, and
# never blocks or prompts. Fetches are throttled per-repo to keep session start
# fast. Any missing tool / missing remote / error just skips silently.
#
# Disable via hooks-config.json: {"hooks": {"repo-freshness": false}}.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

# No `set -euo pipefail`: partial failure must never block session start.

if declare -f hook_enabled >/dev/null 2>&1; then
  hook_enabled "repo-freshness" || exit 0
fi

command -v git >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null || echo "{}")
if declare -f resolve_cwd >/dev/null 2>&1; then
  cwd="$(resolve_cwd "$input" 2>/dev/null || echo "$PWD")"
else
  cwd="$PWD"
fi

g() { git -C "$git_root" "$@"; }

git_root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$git_root" ]] || exit 0

# Only meaningful for repos that actually have an 'origin' remote.
g remote get-url origin >/dev/null 2>&1 || exit 0

# --- throttle fetches: at most one per repo per TTL, to keep session start fast
TTL="${BOPEN_REPO_FRESHNESS_TTL:-600}"   # seconds
state_dir="${BOPEN_REPO_FRESHNESS_STATE_DIR:-${HOME}/.claude/core/repo-freshness}"
mkdir -p "$state_dir" 2>/dev/null
key="$(printf '%s' "$git_root" | shasum 2>/dev/null | awk '{print $1}')"
[[ -n "$key" ]] || key="$(printf '%s' "$git_root" | md5 2>/dev/null || echo default)"
stamp="${state_dir}/${key}.stamp"

now="$(date +%s 2>/dev/null || echo 0)"
last=0
[[ -f "$stamp" ]] && last="$(cat "$stamp" 2>/dev/null || echo 0)"
[[ "$last" =~ ^[0-9]+$ ]] || last=0
if (( now - last >= TTL )); then
  # Bound the fetch so a slow/offline network never hangs session start.
  TO=""
  command -v timeout  >/dev/null 2>&1 && TO="timeout 8"
  command -v gtimeout >/dev/null 2>&1 && TO="gtimeout 8"
  if $TO git -C "$git_root" fetch origin --prune --quiet >/dev/null 2>&1; then
    printf '%s' "$now" > "$stamp" 2>/dev/null
  fi
fi

repo="$(basename "$git_root")"
cur="$(g rev-parse --abbrev-ref HEAD 2>/dev/null || echo)"
notes=()

# ---- primary: sync the CHECKED-OUT branch to its own upstream --------------
# Drive off @{u} (every tracked branch has one) rather than origin/HEAD, which
# is frequently unset. This is exactly the drift case: sitting on a branch whose
# remote has moved ahead.
upstream="$(g rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [[ -n "$upstream" ]]; then
  behind="$(g rev-list --count "HEAD..${upstream}" 2>/dev/null || echo 0)"
  ahead="$(g rev-list --count "${upstream}..HEAD" 2>/dev/null || echo 0)"
  [[ "$behind" =~ ^[0-9]+$ ]] || behind=0
  [[ "$ahead"  =~ ^[0-9]+$ ]] || ahead=0
  if (( behind > 0 && ahead == 0 )); then
    if [[ -z "$(g status --porcelain 2>/dev/null)" ]]; then
      if g merge --ff-only "$upstream" >/dev/null 2>&1; then
        notes+=("Auto-fast-forwarded ${repo} ${cur} to ${upstream} (was ${behind} behind). Working tree was clean.")
      fi
    else
      notes+=("${repo} ${cur} is ${behind} behind ${upstream} but the working tree is dirty — not auto-updating. Commit or stash, then: git pull --ff-only")
    fi
  elif (( behind > 0 && ahead > 0 )); then
    notes+=("WARNING: ${repo} ${cur} has DIVERGED from ${upstream} (${behind} behind, ${ahead} ahead). Do NOT build on it until reconciled — inspect the local-only commits first: git log --oneline ${upstream}..HEAD")
  fi
fi

# ---- secondary: keep the DEFAULT branch fresh while you work elsewhere ------
# Best-effort default-branch resolution: origin/HEAD if set, else main/master.
def="$(g symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's#^refs/remotes/origin/##')"
if [[ -z "$def" ]]; then
  for cand in main master; do
    g rev-parse --verify --quiet "refs/remotes/origin/$cand" >/dev/null 2>&1 && { def="$cand"; break; }
  done
fi
if [[ -n "$def" && "$cur" != "$def" ]] && g rev-parse --verify --quiet "refs/heads/$def" >/dev/null 2>&1; then
  if g merge-base --is-ancestor "$def" "origin/$def" 2>/dev/null; then
    dbehind="$(g rev-list --count "${def}..origin/${def}" 2>/dev/null || echo 0)"
    [[ "$dbehind" =~ ^[0-9]+$ ]] || dbehind=0
    if (( dbehind > 0 )); then
      g update-ref "refs/heads/$def" "refs/remotes/origin/$def" 2>/dev/null \
        && notes+=("Fast-forwarded ${repo} ${def} ref to origin (${dbehind} commits) while you work on ${cur}.")
    fi
  elif ! g merge-base --is-ancestor "origin/$def" "$def" 2>/dev/null; then
    notes+=("WARNING: ${repo} local ${def} has diverged from origin/${def}. Reconcile it before branching off it.")
  fi
fi

# ---- parked on a DEAD branch --------------------------------------------
# The gap this closes: the checks above keep whatever you have checked out in
# sync, and keep the default branch's ref fresh — but neither notices that the
# branch you are sitting on is FINISHED. A feature branch whose commits are all
# already in the default branch is dead: new work started from it silently
# branches off stale history, and every "is the repo ready" glance reports
# clean-and-current because, technically, it is. Observed cost: a checkout sat
# on a months-merged feature branch through an entire release cycle, noticed
# only in the release preflight (2026-08-21).
# Report only — switching branches is the maintainer's call, never a hook's.
if [[ -n "$def" && -n "$cur" && "$cur" != "$def" && "$cur" != "HEAD" ]]; then
  if g merge-base --is-ancestor HEAD "origin/$def" 2>/dev/null; then
    if [[ -z "$(g status --porcelain 2>/dev/null)" ]]; then
      notes+=("${repo} is parked on '${cur}', which is FULLY MERGED into ${def} — that branch is finished, so work started here would build on stale history. Switch before starting anything new: git -C '${git_root}' checkout ${def} && git pull --ff-only")
    else
      notes+=("${repo} is parked on '${cur}', which is fully merged into ${def} (finished branch), and the working tree is dirty. Commit or stash, then switch to ${def}.")
    fi
  fi
fi

(( ${#notes[@]} > 0 )) || exit 0

# Join notes with newlines under a single [REPO-FRESHNESS] banner.
note="[REPO-FRESHNESS]"
for n in "${notes[@]}"; do note="${note}
- ${n}"; done

# Emit SessionStart additionalContext (Claude format), matching session-context.sh.
if command -v python3 >/dev/null 2>&1; then
  ADDITIONAL="$note" python3 - <<'PY'
import json, os
ctx = os.environ.get("ADDITIONAL", "")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}, ensure_ascii=False))
PY
else
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' \
    "$(printf '%s' "$note" | sed 's/"/\\"/g' | awk 'BEGIN{ORS="\\n"}{print}')"
fi
