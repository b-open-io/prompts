#!/bin/bash
# prompt-router.sh — UserPromptSubmit hook (Claude runtime only; Codex has no
# equivalent tool/subagent_type namespace for this to route into).
#
# Scores the submitted prompt against ~/.claude/bopen-tools/router-index.json
# (built by scripts/build-router-index.py) and — above threshold — injects a
# short pointer at the best-matching Skill or roster subagent_type. Advisory
# only: this hook only ever allows, it never blocks the prompt.
#
# Injection hygiene: the emitted additionalContext is built ONLY from
# index-derived strings (id, hint) that were authored by us at build time —
# the raw user prompt is read for scoring but never echoed back verbatim.
#
# Duplicate-invocation handling is deliberately
# two-layer and NOT transcript-based:
#   1. Conditional phrasing — the directive always reads "...unless its
#      instructions are already loaded in your context this session." The
#      model's own context view is the only accurate judge of loaded-ness;
#      transcripts lie after compaction, and a faded-attention re-nudge is
#      desirable, not a bug.
#   2. Router-side session memory — ~/.claude/bopen-tools/router-state/
#      <session_id>.json tracks, per matched id, how many times it has
#      fired and at which prompt count. Each id fires at most twice per
#      session, with a minimum 10-prompt gap between the two firings. This
#      stops repeat nagging while still allowing one late re-nudge after a
#      long gap. State files older than 7 days are pruned on every write.
#
# No set -e: a missing index, missing jq/python3, or a malformed stdin
# payload must all fall through to a silent no-op, never a hook error.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

if declare -f hook_enabled >/dev/null; then
  hook_enabled "prompt-router" || exit 0
fi

command -v python3 >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null || echo "{}")

prompt=""
session_id=""
transcript_path=""
if command -v jq >/dev/null 2>&1; then
  prompt=$(printf '%s' "$input" | jq -r '
    .prompt
    // .user_prompt
    // .message
    // .content
    // empty
  ' 2>/dev/null || true)
  session_id=$(printf '%s' "$input" | jq -r '.session_id // .sessionId // empty' 2>/dev/null || true)
  transcript_path=$(printf '%s' "$input" | jq -r '.transcript_path // .transcriptPath // empty' 2>/dev/null || true)
fi

[[ -n "$prompt" ]] || exit 0

# Skip short/generic prompts — not enough signal to route confidently.
[[ ${#prompt} -ge 15 ]] || exit 0

# Skip slash commands — they already route to a specific command.
if printf '%s' "$prompt" | grep -qE '^[[:space:]]*/'; then
  exit 0
fi

INDEX_PATH="${BOPEN_ROUTER_INDEX:-${HOME}/.claude/bopen-tools/router-index.json}"
[[ -f "$INDEX_PATH" ]] || exit 0

STATE_DIR="${BOPEN_ROUTER_STATE_DIR:-${HOME}/.claude/bopen-tools/router-state}"

PROMPT="$prompt" INDEX_PATH="$INDEX_PATH" SESSION_ID="$session_id" \
  TRANSCRIPT_PATH="$transcript_path" STATE_DIR="$STATE_DIR" python3 - <<'PY'
import json
import os
import re
import sys
import time

prompt = os.environ.get("PROMPT", "")
index_path = os.environ.get("INDEX_PATH", "")
state_dir = os.environ.get("STATE_DIR", "")

try:
    with open(index_path, "r", encoding="utf-8") as f:
        index = json.load(f)
except (OSError, ValueError):
    sys.exit(0)

entries = index.get("entries") or []
if not entries:
    sys.exit(0)

# Session id: prefer the explicit hook field, else derive from the
# transcript filename, else a fixed sentinel — mirrors hammertime.py's
# session-id resolution so state keys stay consistent across our hooks.
session_id = os.environ.get("SESSION_ID", "")
if not session_id:
    transcript_path = os.environ.get("TRANSCRIPT_PATH", "")
    if transcript_path:
        session_id = os.path.basename(transcript_path).replace(".jsonl", "")
    else:
        session_id = "unknown"
safe_session_id = re.sub(r"[^A-Za-z0-9_-]", "_", session_id)[:200] or "unknown"
state_path = os.path.join(state_dir, f"{safe_session_id}.json") if state_dir else ""

state = {"prompt_count": 0, "fires": {}}
if state_path:
    try:
        with open(state_path, "r", encoding="utf-8") as f:
            loaded = json.load(f)
        if isinstance(loaded, dict):
            state["prompt_count"] = int(loaded.get("prompt_count") or 0)
            if isinstance(loaded.get("fires"), dict):
                state["fires"] = loaded["fires"]
    except (OSError, ValueError, TypeError):
        pass

# Every prompt that reaches this scorer advances the counter — it's the
# real clock the 10-prompt firing gap is measured against.
state["prompt_count"] += 1
current_index = state["prompt_count"]


def write_state():
    if not state_dir or not state_path:
        return
    try:
        os.makedirs(state_dir, exist_ok=True)
        tmp = f"{state_path}.tmp.{os.getpid()}"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f)
        os.replace(tmp, state_path)
        # Prune stale session state (7-day retention).
        cutoff = time.time() - 7 * 86400
        for fname in os.listdir(state_dir):
            fpath = os.path.join(state_dir, fname)
            try:
                if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                    os.remove(fpath)
            except OSError:
                pass
    except OSError:
        pass


prompt_lower = prompt.lower()
word_re = re.compile(r"[a-z0-9']+")
prompt_words = set(word_re.findall(prompt_lower))


def score_entry(entry):
    score = 0
    for trig in entry.get("triggers") or []:
        t = (trig or "").strip().lower()
        if not t:
            continue
        if " " in t:
            pattern = r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])"
            if re.search(pattern, prompt_lower):
                score += 3
        elif t in prompt_words:
            score += 1
    return score


# Threshold: >=2 keyword hits OR >=1 phrase hit (a phrase alone scores 3).
scored = []
for entry in entries:
    s = score_entry(entry)
    if s >= 2:
        scored.append((s, entry))

if not scored:
    write_state()
    sys.exit(0)


def eligible(entry_id):
    rec = state["fires"].get(entry_id)
    if not rec:
        return True
    count = rec.get("count", 0)
    if count >= 2:
        return False
    if count == 1:
        return (current_index - rec.get("last_fired_at", 0)) >= 10
    return True


scored = [(s, e) for s, e in scored if eligible(e["id"])]
if not scored:
    write_state()
    sys.exit(0)

scored.sort(key=lambda x: (-x[0], x[1]["kind"], x[1]["id"]))
top = scored[:2]


def describe(entry):
    if entry["kind"] == "skill":
        return f"Skill({entry['id']})"
    return f"subagent_type {entry['id']}"


primary = top[0][1]
hint = primary.get("hint", "")
if primary["kind"] == "skill":
    msg = (
        f"[BOPEN-ROUTER] This prompt matches {describe(primary)} — {hint} "
        f"Invoke {describe(primary)} before responding — unless its "
        f"instructions are already loaded in your context this session."
    )
else:
    msg = (
        f"[BOPEN-ROUTER] This prompt matches {describe(primary)} — {hint} "
        f"Delegate to {describe(primary)} rather than a generic agent — "
        f"unless you've already delegated to it in your context this session."
    )

if len(top) > 1:
    second = top[1][1]
    msg += f" (Also relevant: {describe(second)})"

if len(msg) > 500:
    msg = msg[:497] + "..."

for _, entry in top:
    rec = state["fires"].setdefault(entry["id"], {"count": 0, "last_fired_at": 0})
    rec["count"] = rec.get("count", 0) + 1
    rec["last_fired_at"] = current_index

write_state()

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": msg,
    }
}, ensure_ascii=False))
PY

exit 0
