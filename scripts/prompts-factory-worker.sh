#!/usr/bin/env bash
set -euo pipefail

mode="${1:-exec}"
# LoopTop registration (/factory-init) writes loop.json into the state dir.
# Everything the worker needs comes from that manifest and from the gh login
# that runs it, so there is nothing to configure by hand.
factory_state_dir="${HOME}/.prompts-factory/loop"
manifest_file="$factory_state_dir/loop.json"
state_file="$factory_state_dir/state.json"
ledger_file="$factory_state_dir/ledger.jsonl"
ledger_written=no
lock_created=no
current_step="startup"

if [[ ! -f "$manifest_file" ]]; then
  echo "NOT_REGISTERED: $manifest_file is missing. Run /factory-init in the prompts checkout to register this loop with LoopTop." >&2
  exit 2
fi

repo_dir="$(python3 - "$manifest_file" <<'PY'
import json, sys
manifest = json.load(open(sys.argv[1], encoding="utf-8"))
repo_dir = manifest.get("repoDir")
if not isinstance(repo_dir, str) or not repo_dir:
    sys.exit("loop.json has no repoDir; re-run /factory-init")
print(repo_dir)
PY
)"
[[ -d "$repo_dir/.git" ]] || { echo "BAD_REPO_DIR: $repo_dir from loop.json is not a git checkout" >&2; exit 2; }
reviewer="$(gh api user --jq .login)"

ledger() {
  local rc="$1" result="$2" ref="$3" detail="$4"
  python3 - "$ledger_file" "$mode" "$rc" "$result" "$ref" "$detail" <<'PY'
import json, sys
from datetime import datetime, timezone

path, mode, rc, result, ref, detail = sys.argv[1:]
entry = {
    "ts": datetime.now(timezone.utc).isoformat(),
    "mode": mode,
    "rc": int(rc),
    "payload": {"result": result, "ref": ref, "detail": detail},
}
with open(path, "a", encoding="utf-8") as handle:
    handle.write(json.dumps(entry, separators=(",", ":")) + "\n")
PY
  ledger_written=yes
}

record_exec() {
  local accepted="$1"
  [[ "$mode" == "exec" ]] || return 0
  python3 - "$state_file" "$accepted" <<'PY'
import json, os, sys, tempfile

path, accepted = sys.argv[1:]
try:
    state = json.load(open(path, encoding="utf-8"))
except (FileNotFoundError, json.JSONDecodeError):
    state = {}
state["exec_total"] = int(state.get("exec_total", 0)) + 1
state["exec_accepted"] = int(state.get("exec_accepted", 0)) + (accepted == "yes")
fd, temporary = tempfile.mkstemp(dir=os.path.dirname(path), prefix="state.", text=True)
with os.fdopen(fd, "w", encoding="utf-8") as handle:
    json.dump(state, handle, indent=2)
    handle.write("\n")
os.replace(temporary, path)
PY
}

cleanup() {
  local rc="$?"
  if [[ "$lock_created" == "yes" ]]; then
    rm -rf "$factory_state_dir/.lock"
  fi
  if [[ "$ledger_written" == "no" ]]; then
    record_exec no || true
    ledger "$rc" error "" "failed during $current_step" || true
  fi
}
trap cleanup EXIT

paused="$(python3 - "$state_file" <<'PY'
import json, sys
try:
    state = json.load(open(sys.argv[1], encoding="utf-8"))
except (FileNotFoundError, json.JSONDecodeError):
    state = {"paused": True}
print("yes" if state.get("paused", True) else "no")
PY
)"
if [[ "$paused" == "yes" ]]; then
  ledger 0 skipped "" "worker is paused"
  exit 0
fi

current_step="lock acquisition"
if ! mkdir "$factory_state_dir/.lock" 2>/dev/null; then
  ledger 0 skipped "" "another pass is running"
  exit 0
fi
lock_created=yes
echo "$$" > "$factory_state_dir/.lock/pid"

current_step="repository sync"
cd "$repo_dir"
repo_slug="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
default_branch="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)"
git fetch origin dev "$default_branch" --quiet

if [[ "$mode" == "maintenance" ]]; then
  current_step="maintenance gate"
  bash scripts/test-isolated-plugin-install.sh
  python3 scripts/run-plugin-harness.py >/dev/null
  ledger 0 completed "origin/dev" "plugin validation and harness passed"
  exit 0
fi

if [[ "$mode" != "exec" ]]; then
  ledger 2 error "" "unknown mode: $mode"
  exit 2
fi

current_step="promotion PR"
dev_sha="$(git rev-parse origin/dev)"
number="$(gh pr list --repo "$repo_slug" --base "$default_branch" --head dev --state open --json number --jq '.[0].number // empty')"
if [[ -z "$number" ]]; then
  gh pr create --repo "$repo_slug" --base "$default_branch" --head dev \
    --title "Promote tested dev changes" \
    --body "This standing promotion PR contains changes that passed through dev. Every update resets the 24-hour cooling period and requires a fresh /approve comment. Required checks must be green before promotion."
  number="$(gh pr list --repo "$repo_slug" --base "$default_branch" --head dev --state open --json number --jq '.[0].number')"
fi

last_notified="$(python3 - "$state_file" <<'PY'
import json, sys
try:
    state = json.load(open(sys.argv[1], encoding="utf-8"))
except (FileNotFoundError, json.JSONDecodeError):
    state = {}
print(state.get("last_notified_sha", ""))
PY
)"

if [[ "$last_notified" != "$dev_sha" ]]; then
  gh pr edit "$number" --repo "$repo_slug" --add-assignee "$reviewer"
  deadline="$(git show -s --format=%cI origin/dev | python3 -c 'from datetime import datetime,timedelta; import sys; print((datetime.fromisoformat(sys.stdin.read().strip())+timedelta(hours=24)).strftime("%Y-%m-%d %H:%M %Z"))')"
  tick='`'
  body="@${reviewer} dev changed at ${tick}${dev_sha}${tick}. Review by **${deadline}**. Comment ${tick}/approve${tick} after reviewing to permit promotion. Another dev commit resets the clock and invalidates earlier approval."
  gh pr comment "$number" --repo "$repo_slug" --body "$body"
  python3 - "$state_file" "$dev_sha" "$number" <<'PY'
import json, os, sys, tempfile

path, sha, number = sys.argv[1:]
try:
    state = json.load(open(path, encoding="utf-8"))
except (FileNotFoundError, json.JSONDecodeError):
    state = {}
state.update({"last_notified_sha": sha, "promotion_pr": int(number)})
fd, temporary = tempfile.mkstemp(dir=os.path.dirname(path), prefix="state.", text=True)
with os.fdopen(fd, "w", encoding="utf-8") as handle:
    json.dump(state, handle, indent=2)
    handle.write("\n")
os.replace(temporary, path)
PY
fi

record_exec yes
ledger 0 completed "PR #$number" "promotion review is open for $dev_sha"
