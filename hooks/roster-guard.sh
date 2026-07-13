#!/bin/bash
# roster-guard.sh — PreToolUse hook, matcher "Task" (Claude runtime only;
# Codex has no Task tool / subagent_type namespace to guard).
#
# When a Task dispatch targets subagent_type "general-purpose" or "Explore",
# scores the dispatch prompt/description against the AGENT entries in
# ~/.claude/bopen-tools/router-index.json. Above threshold, emits ONLY
# additionalContext suggesting the matching roster specialist — no
# permissionDecision field at all. additionalContext is a standalone
# PreToolUse output field and does not require a decision; an advisory
# hook must leave the permission flow completely untouched, since emitting
# an explicit "allow" would skip the permission prompt as a side effect —
# permission semantics this advice-only guard has no business carrying.
#
# No set -e: a missing index, missing jq/python3, or malformed stdin must
# all fall through to silence, never a hook error and never a decision.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

if declare -f hook_enabled >/dev/null; then
  hook_enabled "roster-guard" || exit 0
fi

command -v jq >/dev/null 2>&1 || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null || echo "{}")

subagent_type=$(printf '%s' "$input" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null || true)
case "$subagent_type" in
  general-purpose|Explore) ;;
  *) exit 0 ;;
esac

INDEX_PATH="${BOPEN_ROUTER_INDEX:-${HOME}/.claude/bopen-tools/router-index.json}"
[[ -f "$INDEX_PATH" ]] || exit 0

task_desc=$(printf '%s' "$input" | jq -r '.tool_input.description // empty' 2>/dev/null || true)
task_prompt=$(printf '%s' "$input" | jq -r '.tool_input.prompt // empty' 2>/dev/null || true)
dispatch_text="${task_desc}
${task_prompt}"

[[ -n "${dispatch_text// /}" ]] || exit 0

DISPATCH_TEXT="$dispatch_text" INDEX_PATH="$INDEX_PATH" python3 - <<'PY'
import json
import os
import re
import sys

text = os.environ.get("DISPATCH_TEXT", "")
index_path = os.environ.get("INDEX_PATH", "")

try:
    with open(index_path, "r", encoding="utf-8") as f:
        index = json.load(f)
except (OSError, ValueError):
    sys.exit(0)

entries = [e for e in (index.get("entries") or []) if e.get("kind") == "agent"]
if not entries:
    sys.exit(0)

text_lower = text.lower()
word_re = re.compile(r"[a-z0-9']+")
text_words = set(word_re.findall(text_lower))


def score_entry(entry):
    score = 0
    for trig in entry.get("triggers") or []:
        t = (trig or "").strip().lower()
        if not t:
            continue
        if " " in t:
            pattern = r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])"
            if re.search(pattern, text_lower):
                score += 3
        elif t in text_words:
            score += 1
    return score


# Threshold: >=2 keyword hits OR >=1 phrase hit (a phrase alone scores 3).
scored = []
for entry in entries:
    s = score_entry(entry)
    if s >= 2:
        scored.append((s, entry))

if not scored:
    sys.exit(0)

scored.sort(key=lambda x: (-x[0], x[1]["id"]))
best = scored[0][1]

msg = (
    f"[BOPEN-ROSTER] A specialist matches this dispatch: subagent_type "
    f"{best['id']} ({best.get('hint', '')}). Prefer it unless there is a "
    f"stated reason."
)
if len(msg) > 500:
    msg = msg[:497] + "..."

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": msg,
    }
}, ensure_ascii=False))
PY

exit 0
