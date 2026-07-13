#!/bin/bash
# skill-activity.sh — Claude-only PreToolUse hook for the Skill tool.
#
# Records invocation history for read-only consumers such as the setup
# playground. This hook is telemetry only: every failure is a silent allow,
# and it never emits permission or context output.

# The hook must be completely invisible, including when a filesystem utility
# or dependency reports an error.
exec >/dev/null 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 0
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

if declare -f hook_enabled >/dev/null; then
  hook_enabled "skill-activity" || exit 0
fi

command -v jq >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null) || exit 0
printf '%s' "$input" | jq -e 'type == "object"' >/dev/null 2>&1 || exit 0

skill=$(printf '%s' "$input" | jq -er '
  .tool_input.skill?
  | select(type == "string" and length > 0)
' 2>/dev/null) || exit 0

session_id=$(printf '%s' "$input" | jq -r '
  (.session_id? // .sessionId? // empty)
  | select(type == "string")
' 2>/dev/null) || session_id=""

if [[ -z "$session_id" ]]; then
  transcript_path=$(printf '%s' "$input" | jq -r '
    (.transcript_path? // .transcriptPath? // empty)
    | select(type == "string")
  ' 2>/dev/null) || transcript_path=""
  if [[ -n "$transcript_path" ]]; then
    session_id=$(basename -- "$transcript_path") || session_id=""
    session_id="${session_id%.jsonl}"
  fi
fi
[[ -n "$session_id" ]] || session_id="unknown"

activity_file="${BOPEN_SKILL_ACTIVITY_FILE:-${HOME}/.claude/bopen-tools/skill-activity.jsonl}"
activity_dir=$(dirname -- "$activity_file") || exit 0
mkdir -p -- "$activity_dir" || exit 0

if [[ -e "$activity_file" && ! -r "$activity_file" ]]; then
  exit 0
fi

tmp=$(mktemp "${activity_dir}/.skill-activity.tmp.XXXXXX") || exit 0
cleanup() {
  rm -f -- "$tmp"
}
trap cleanup EXIT HUP INT TERM

now=$(date +%s) || exit 0
cutoff=$((now - 7 * 24 * 60 * 60))

if [[ -f "$activity_file" ]]; then
  jq -Rc --argjson cutoff "$cutoff" '
    fromjson?
    | select((.ts | type) == "number" and .ts >= $cutoff)
  ' "$activity_file" >"$tmp" || exit 0
fi

jq -cn \
  --argjson ts "$now" \
  --arg session_id "$session_id" \
  --arg skill "$skill" \
  '{ts: $ts, session_id: $session_id, skill: $skill}' >>"$tmp" || exit 0

mv -f -- "$tmp" "$activity_file" || exit 0
trap - EXIT HUP INT TERM
exit 0
