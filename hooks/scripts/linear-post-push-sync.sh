#!/usr/bin/env bash
# linear-post-push-sync.sh — PostToolUse hook for Linear Sync
# Fires after Bash calls. If the command was `git push` or `gh pr create`
# in a linked repo, runs sync-github-issues.sh and injects a comment reminder.
# Event: PostToolUse (matcher: Bash)
# Timeout: 30s
set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Quick exit: only care about git push or gh pr create
IS_PUSH=false
IS_PR=false
if echo "$COMMAND" | grep -qE '\bgit\s+push\b'; then
  IS_PUSH=true
elif echo "$COMMAND" | grep -qE '\bgh\s+pr\s+create\b'; then
  IS_PR=true
fi

if [ "$IS_PUSH" = "false" ] && [ "$IS_PR" = "false" ]; then
  exit 0
fi

# Find repo root
GIT_TOP=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$GIT_TOP" ]; then
  exit 0
fi

REPO_NAME=$(basename "$GIT_TOP")

# Check if repo has .claude/linear-sync.json (linked repo)
CONFIG_FILE="$GIT_TOP/.claude/linear-sync.json"
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

# Check local opt-out
STATE_FILE="$HOME/.claude/linear-sync/state.json"
if [ -f "$STATE_FILE" ]; then
  OPTED_OUT=$(STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
repo = data.get('repos', {}).get(os.environ['REPO_NAME'], {})
print('true' if repo.get('workspace') == 'none' else 'false')
" 2>/dev/null || echo "false")
  if [ "$OPTED_OUT" = "true" ]; then
    exit 0
  fi
fi

# Run sync-github-issues.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/../../scripts/sync-github-issues.sh"
if [ ! -f "$SYNC_SCRIPT" ]; then
  exit 0
fi

SYNC_RESULT=$(bash "$SYNC_SCRIPT" "$GIT_TOP" 2>&1 || echo "GitHub sync: error during sync")

# Read last_issue for comment reminder
LAST_ISSUE=""
if [ -f "$STATE_FILE" ]; then
  LAST_ISSUE=$(STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
repo = data.get('repos', {}).get(os.environ['REPO_NAME'], {})
print(repo.get('last_issue', ''))
" 2>/dev/null || echo "")
fi

# Build system message
MSG="[Linear Sync] $SYNC_RESULT"
if [ -n "$LAST_ISSUE" ]; then
  if [ "$IS_PR" = "true" ]; then
    MSG="$MSG
[Linear Comment Reminder] A PR was just created. Per Linear Sync workflow, offer to post a progress comment on $LAST_ISSUE. Draft one from git log and present via AskUserQuestion."
  else
    MSG="$MSG
[Linear Comment Reminder] Code was just pushed. Per Linear Sync workflow, consider offering a progress comment on $LAST_ISSUE if this was a significant push."
  fi
fi

printf '%s' "$MSG" | jq -Rs '{systemMessage: .}'
exit 0
