#!/bin/bash
# repo-freshness: non-destructive default-branch sync at SessionStart.
# Verifies: silent when non-git / up-to-date; auto-ff when clean+behind;
# report-only when dirty; warn (no mutation) when diverged; ref-only advance
# when on a feature branch. Uses local bare "origin" repos — no network.

echo
echo "--- repo-freshness ---"

# Force a fetch every invocation and isolate throttle state to a temp dir.
export BOPEN_REPO_FRESHNESS_TTL=0
_RF_STATE=$(mktemp -d)
export BOPEN_REPO_FRESHNESS_STATE_DIR="$_RF_STATE"

_rf_git() { git -C "$1" -c user.email=t@t -c user.name=t "${@:2}"; }

# Build: bare origin (default branch main) + a work clone + a mover clone.
_rf_setup() {
  local base; base=$(mktemp -d)
  git -c init.defaultBranch=main init -q --bare "$base/origin.git"
  git -c init.defaultBranch=main init -q "$base/work"
  _rf_git "$base/work" commit -q --allow-empty -m c1
  git -C "$base/work" remote add origin "$base/origin.git"
  git -C "$base/work" push -q -u origin main
  git clone -q "$base/origin.git" "$base/mover"
  printf '%s' "$base"
}
# Advance origin/main by one empty commit via the mover clone.
_rf_advance() {
  git -C "$1/mover" checkout -q main
  _rf_git "$1/mover" commit -q --allow-empty -m "$2"
  git -C "$1/mover" push -q origin main
}
_rf_ctx() { printf '%s' "$1" | jq -r '.hookSpecificOutput.additionalContext // ""'; }

# --- non-git directory -> silent, exit 0 ---
NON_GIT=$(mktemp -d)
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$NON_GIT" '{cwd:$cwd}')"
assert_exit "repo-freshness non-git exit" "0" "$HOOK_EXIT"
assert_eq "repo-freshness non-git silent" "" "$HOOK_STDOUT"
rm -rf "$NON_GIT"

# --- up-to-date -> silent ---
B=$(_rf_setup)
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$B/work" '{cwd:$cwd}')"
assert_exit "repo-freshness uptodate exit" "0" "$HOOK_EXIT"
assert_eq "repo-freshness uptodate silent" "" "$HOOK_STDOUT"

# --- default checked out, clean, behind -> AUTO fast-forward ---
_rf_advance "$B" c2
_rf_advance "$B" c3
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$B/work" '{cwd:$cwd}')"
assert_exit "repo-freshness ff exit" "0" "$HOOK_EXIT"
assert_json "repo-freshness ff json" "$HOOK_STDOUT"
assert_contains "repo-freshness ff message" "Auto-fast-forwarded" "$(_rf_ctx "$HOOK_STDOUT")"
assert_eq "repo-freshness ff advanced HEAD" "0" "$(git -C "$B/work" rev-list --count HEAD..origin/main)"

# --- dirty tree + behind -> REPORT only, no ff ---
_rf_advance "$B" c4
echo dirty > "$B/work/uncommitted.txt"
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$B/work" '{cwd:$cwd}')"
assert_contains "repo-freshness dirty message" "working tree is dirty" "$(_rf_ctx "$HOOK_STDOUT")"
assert_eq "repo-freshness dirty did not ff" "1" "$(git -C "$B/work" rev-list --count HEAD..origin/main)"
rm -f "$B/work/uncommitted.txt"

# --- diverged (local commit not on origin) -> WARN, no mutation ---
_rf_git "$B/work" commit -q --allow-empty -m local-only
before_head=$(git -C "$B/work" rev-parse HEAD)
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$B/work" '{cwd:$cwd}')"
assert_contains "repo-freshness diverged warns" "DIVERGED" "$(_rf_ctx "$HOOK_STDOUT")"
assert_eq "repo-freshness diverged untouched" "$before_head" "$(git -C "$B/work" rev-parse HEAD)"

# --- on a feature branch, default behind -> ff the ref only, tree untouched ---
C=$(_rf_setup)
git -C "$C/work" checkout -q -b feature-x
_rf_advance "$C" c2
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$C/work" '{cwd:$cwd}')"
assert_contains "repo-freshness feature ff-ref message" "Fast-forwarded" "$(_rf_ctx "$HOOK_STDOUT")"
assert_eq "repo-freshness feature stays on branch" "feature-x" "$(git -C "$C/work" rev-parse --abbrev-ref HEAD)"
assert_eq "repo-freshness feature main advanced" \
  "$(git -C "$C/work" rev-parse origin/main)" "$(git -C "$C/work" rev-parse main)"


# --- parked on a FULLY MERGED (dead) branch -> report, never switch ---
D=$(_rf_setup)
git -C "$D/work" checkout -q -b finished-feature
_rf_git "$D/work" commit -q --allow-empty -m "feature work"
git -C "$D/work" push -q origin finished-feature:main   # its work lands in the default branch
git -C "$D/work" fetch -q origin
before_branch=$(git -C "$D/work" rev-parse --abbrev-ref HEAD)
run_hook "repo-freshness.sh" "claude" "$(jq -n --arg cwd "$D/work" '{cwd:$cwd}')"
assert_contains "repo-freshness dead-branch reported" "FULLY MERGED" "$(_rf_ctx "$HOOK_STDOUT")"
assert_eq "repo-freshness dead-branch does NOT switch" "$before_branch" "$(git -C "$D/work" rev-parse --abbrev-ref HEAD)"
rm -rf "$D"

rm -rf "$B" "$C" "$_RF_STATE"
unset BOPEN_REPO_FRESHNESS_TTL BOPEN_REPO_FRESHNESS_STATE_DIR
