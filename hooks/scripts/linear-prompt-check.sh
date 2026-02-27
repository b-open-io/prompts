#!/usr/bin/env bash
# linear-prompt-check.sh — UserPromptSubmit hook for Linear Sync
# Detects issue ID references (like ENG-123) in the dev's prompt and
# injects a hint to fetch context via the linear-sync subagent.
# Event: UserPromptSubmit
# Timeout: 5s
set -euo pipefail

# ---------- helpers ----------
STATE_FILE="$HOME/.claude/linear-sync/state.json"

json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null
}

emit() {
  local ctx
  ctx=$(printf '%s' "$1" | json_escape)
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}\n' "$ctx"
}

# ---------- read stdin ----------
INPUT=$(cat)

CWD=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('cwd', d.get('sessionState', {}).get('cwd', '')))
except Exception:
    print('')
" 2>/dev/null || echo "")

PROMPT=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('prompt_content', d.get('userPrompt', {}).get('content', '')))
except Exception:
    print('')
" 2>/dev/null || echo "")

if [ -z "$CWD" ] || [ -z "$PROMPT" ]; then
  exit 0
fi

# ---------- check if git repo ----------
GIT_TOP=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$GIT_TOP" ]; then
  exit 0
fi

REPO_NAME=$(basename "$GIT_TOP" 2>/dev/null || echo "")
if [ -z "$REPO_NAME" ]; then
  exit 0
fi

# ---------- check repo status ----------
if [ ! -f "$STATE_FILE" ]; then
  # Also check repo-level config
  REPO_CONFIG_FILE="$GIT_TOP/.claude/linear-sync.json"
  if [ ! -f "$REPO_CONFIG_FILE" ]; then
    exit 0
  fi
  # Has repo config but no state file — can still detect issue IDs
  # but no workspace to report. Just exit.
  exit 0
fi

REPO_STATUS=$(STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, sys, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
repo = data.get('repos', {}).get(os.environ['REPO_NAME'], None)
if repo is None:
    print('UNLINKED')
elif repo.get('workspace') == 'none':
    print('OPTED_OUT')
else:
    ws_id = repo.get('workspace', '')
    ws = data.get('workspaces', {}).get(ws_id, None)
    if ws:
        print('LINKED:' + ws_id)
    else:
        print('UNLINKED')
" 2>/dev/null || echo "UNLINKED")

case "$REPO_STATUS" in
  UNLINKED|OPTED_OUT)
    exit 0
    ;;
esac

WORKSPACE_ID="${REPO_STATUS#LINKED:}"

# ---------- scan prompt for issue IDs ----------
MATCHES=$(printf '%s' "$PROMPT" | python3 -c "
import re, sys
text = sys.stdin.read()
matches = re.findall(r'[A-Z]{2,5}-[0-9]+', text)
seen = []
for m in matches:
    if m not in seen:
        seen.append(m)
    if len(seen) == 3:
        break
print(', '.join(seen))
" 2>/dev/null || echo "")

if [ -z "$MATCHES" ]; then
  exit 0
fi

CTX="[Linear/$WORKSPACE_ID] Issue(s) referenced: $MATCHES. Delegate to linear-sync subagent (background) to fetch summaries."
emit "$CTX"
exit 0
