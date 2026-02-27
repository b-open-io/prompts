#!/usr/bin/env bash
# linear-commit-guard.sh — PreToolUse hook for Linear Sync
# Enforces issue ID conventions on git commits, branch creation, and PR creation.
# Blocks non-compliant commands with exit 2 in linked repos.
# Event: PreToolUse (matcher: Bash)
# Timeout: 5s
set -euo pipefail

# ---------- helpers ----------
STATE_FILE="$HOME/.claude/linear-sync/state.json"

has_issue_id() {
  printf '%s' "$1" | python3 -c "
import re, sys
text = sys.stdin.read()
if re.search(r'[A-Z]{2,5}-[0-9]+', text):
    sys.exit(0)
else:
    sys.exit(1)
" 2>/dev/null
}

# ---------- read stdin ----------
INPUT=$(cat)

COMMAND=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    ti = d.get('tool_input', d.get('toolInput', {}))
    print(ti.get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

if [ -z "$COMMAND" ]; then
  exit 0
fi

# ---------- determine command type ----------
CMD_TYPE=""
EXTRACTED=""

if GIT_CMD="$COMMAND" python3 -c '
import os, re
cmd = os.environ["GIT_CMD"]
DQ = chr(34)
SQ = chr(39)
if re.search(r"\bgit\s+commit\b", cmd) and (re.search(r"-[a-zA-Z]*m[\s" + DQ + SQ + "]", cmd) or re.search(r"-[a-zA-Z]*m$", cmd) or re.search(r"--message[\s=]", cmd)):
    exit(0)
exit(1)
' 2>/dev/null; then
  CMD_TYPE="commit"
  EXTRACTED=$(GIT_CMD="$COMMAND" python3 -c '
import os, re
cmd = os.environ["GIT_CMD"]
DQ = chr(34)
SQ = chr(39)
m = None
m = re.search("--message=" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search("--message=" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"--message\s+" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search(r"--message\s+" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"--message=(\S+)", cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m\s+" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m\s+" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m\s+(\S+)", cmd)
if not m:
    m = re.search(r"-[a-zA-Z]*m(\S+)", cmd)
if m:
    print(m.group(1))
else:
    print("")
' 2>/dev/null || echo "")

elif printf '%s' "$COMMAND" | python3 -c "
import sys, re
cmd = sys.stdin.read()
if re.search(r'\bgit\s+commit\b', cmd) and 'EOF' in cmd:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  CMD_TYPE="commit"
  EXTRACTED=$(printf '%s' "$COMMAND" | python3 -c "
import sys
cmd = sys.stdin.read()
print(cmd)
" 2>/dev/null || echo "$COMMAND")

elif GIT_CMD="$COMMAND" python3 -c '
import os, re
cmd = os.environ["GIT_CMD"]
DQ = chr(34)
SQ = chr(39)
if re.search(r"\bgit\s+commit\b", cmd):
    has_amend = bool(re.search(r"--amend\b", cmd))
    has_no_edit = bool(re.search(r"--no-edit\b", cmd))
    has_msg = bool(re.search(r"-[a-zA-Z]*m[\s" + DQ + SQ + "]", cmd)) or bool(re.search(r"--message[\s=]", cmd))
    if has_amend and has_no_edit and not has_msg:
        exit(0)
exit(1)
' 2>/dev/null; then
  CMD_TYPE="amend_no_edit"

elif GIT_CMD="$COMMAND" python3 -c '
import os, re
cmd = os.environ["GIT_CMD"]
DQ = chr(34)
SQ = chr(39)
if re.search(r"\bgit\s+commit\b", cmd):
    if not re.search(r"-[a-zA-Z]*m[\s" + DQ + SQ + "]", cmd) and not re.search(r"--message[\s=]", cmd) and "EOF" not in cmd:
        exit(0)
exit(1)
' 2>/dev/null; then
  CMD_TYPE="bare_commit"

elif printf '%s' "$COMMAND" | python3 -c "
import sys, re
cmd = sys.stdin.read()
if re.search(r'\bgit\s+checkout\s+-b\b', cmd):
    sys.exit(0)
if re.search(r'\bgit\s+switch\s+-c\b', cmd):
    sys.exit(0)
if re.search(r'\bgit\s+branch\s+(?!-)[^\s-]', cmd):
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  CMD_TYPE="branch"
  EXTRACTED=$(printf '%s' "$COMMAND" | python3 -c "
import sys, re
cmd = sys.stdin.read().strip()
m = re.search(r'\bgit\s+checkout\s+-b\s+(\S+)', cmd)
if not m:
    m = re.search(r'\bgit\s+switch\s+-c\s+(\S+)', cmd)
if not m:
    m = re.search(r'\bgit\s+branch\s+([^\s-]\S*)', cmd)
if m:
    print(m.group(1))
else:
    print('')
" 2>/dev/null || echo "")

elif printf '%s' "$COMMAND" | python3 -c "
import sys, re
cmd = sys.stdin.read()
if re.search(r'\bgh\s+pr\s+create\b', cmd):
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  CMD_TYPE="pr"
  EXTRACTED=$(GIT_CMD="$COMMAND" python3 -c '
import os, re
cmd = os.environ["GIT_CMD"]
DQ = chr(34)
SQ = chr(39)
m = None
m = re.search("--title=" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search("--title=" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"--title\s+" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search(r"--title\s+" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"--title=(\S+)", cmd)
if not m:
    m = re.search("-t=" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search("-t=" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"-t\s+" + DQ + r"((?:[^" + DQ + r"\\]|\\.)*)" + DQ, cmd)
if not m:
    m = re.search(r"-t\s+" + SQ + "([^" + SQ + "]*)" + SQ, cmd)
if not m:
    m = re.search(r"-t=(\S+)", cmd)
if m:
    print(m.group(1))
else:
    print("")
' 2>/dev/null || echo "")

elif printf '%s' "$COMMAND" | python3 -c "
import sys, re
cmd = sys.stdin.read()
if re.search(r'\bgit\s+push\b', cmd):
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  CMD_TYPE="push"
fi

if [ -z "$CMD_TYPE" ]; then
  exit 0
fi

# ---------- check repo status ----------
CWD=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('cwd', d.get('sessionState', {}).get('cwd', '')))
except Exception:
    print('')
" 2>/dev/null || echo "")

if [ -z "$CWD" ]; then
  exit 0
fi

GIT_TOP=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$GIT_TOP" ]; then
  exit 0
fi

REPO_NAME=$(basename "$GIT_TOP" 2>/dev/null || echo "")
if [ -z "$REPO_NAME" ]; then
  exit 0
fi

REPO_CONFIG_FILE="$GIT_TOP/.claude/linear-sync.json"

if [ ! -f "$STATE_FILE" ] && [ ! -f "$REPO_CONFIG_FILE" ]; then
  exit 0
fi
REPO_INFO=$(REPO_CONFIG_FILE="$REPO_CONFIG_FILE" STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os

repo_cfg_path = os.environ['REPO_CONFIG_FILE']
state_path = os.environ['STATE_FILE']
repo_name = os.environ['REPO_NAME']

try:
    with open(state_path) as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError, KeyError):
    data = {}

try:
    with open(repo_cfg_path) as f:
        repo_cfg = json.load(f)
    team = repo_cfg.get('team', '')
    ws_id = repo_cfg.get('workspace', '')
    if team and ws_id:
        ws = data.get('workspaces', {}).get(ws_id, None)
        if ws:
            print('LINKED:' + team)
        else:
            print('UNLINKED')
    elif team:
        print('LINKED:' + team)
    else:
        raise FileNotFoundError('no team in repo config')
except (FileNotFoundError, json.JSONDecodeError, KeyError):
    repo = data.get('repos', {}).get(repo_name, None)
    if repo is None:
        print('UNLINKED')
    elif repo.get('workspace') == 'none':
        print('OPTED_OUT')
    else:
        ws_id = repo.get('workspace', '')
        ws = data.get('workspaces', {}).get(ws_id, None)
        if ws:
            team = repo.get('team', ws.get('default_team', 'XXX'))
            print('LINKED:' + team)
        else:
            print('UNLINKED')
" 2>/dev/null || echo "UNLINKED")

case "$REPO_INFO" in
  UNLINKED|OPTED_OUT)
    exit 0
    ;;
esac

TEAM_PREFIX="${REPO_INFO#LINKED:}"

# ---------- allow --amend --no-edit ----------
if [ "$CMD_TYPE" = "amend_no_edit" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
fi

# ---------- block bare commits ----------
if [ "$CMD_TYPE" = "bare_commit" ]; then
  echo "BLOCKED: Commits must include an issue ID via the -m flag." >&2
  echo "Editor-based commits (without -m or --message) cannot be verified by the hook." >&2
  echo "Use: git commit -m \"${TEAM_PREFIX}-123: your message\"" >&2
  echo "Tip: Ask Claude to create a Linear ticket if you don't have one yet." >&2
  exit 2
fi

# ---------- cross-issue commit validation on push ----------
if [ "$CMD_TYPE" = "push" ]; then
  CROSS_ISSUE=$(cd "$GIT_TOP" 2>/dev/null && python3 -c "
import subprocess, re
candidates = []
sym = subprocess.run(['git', 'symbolic-ref', 'refs/remotes/origin/HEAD'], capture_output=True, text=True)
if sym.returncode == 0 and sym.stdout.strip():
    candidates.append(sym.stdout.strip().replace('refs/remotes/origin/', ''))
candidates.extend(['main', 'master'])
for base in candidates:
    result = subprocess.run(['git', 'merge-base', base, 'HEAD'], capture_output=True, text=True)
    if result.returncode == 0:
        merge_base = result.stdout.strip()
        break
else:
    print('')
    exit()

log = subprocess.run(['git', 'log', '--oneline', f'{merge_base}..HEAD'], capture_output=True, text=True)
if log.returncode != 0 or not log.stdout.strip():
    print('')
    exit()

ids = set()
for line in log.stdout.strip().split('\n'):
    for m in re.findall(r'[A-Z]{2,5}-[0-9]+', line):
        ids.add(m)

if len(ids) > 1:
    print(', '.join(sorted(ids)))
else:
    print('')
" 2>/dev/null || echo "")

  if [ -n "$CROSS_ISSUE" ]; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"[CROSS-ISSUE-COMMITS] This branch has commits referencing multiple issues: %s. This is usually fine for related work, but consider splitting into separate branches if the work is unrelated.","permissionDecision":"allow"}}\n' "$CROSS_ISSUE"
  else
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  fi
  exit 0
fi

# ---------- check for issue ID ----------

if [ "$CMD_TYPE" = "pr" ] && [ -z "$EXTRACTED" ]; then
  BRANCH=$(cd "$GIT_TOP" 2>/dev/null && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if has_issue_id "$BRANCH"; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
    exit 0
  fi
  echo "BLOCKED: PR title must contain an issue ID (e.g. ${TEAM_PREFIX}-123)." >&2
  echo "Either provide --title with an issue ID, or rename your branch to include one." >&2
  echo "Tip: Ask Claude to create a Linear ticket if you don't have one yet." >&2
  exit 2
fi

CHECK_STRING="$EXTRACTED"

if [ "$CMD_TYPE" = "commit" ] && [ -z "$EXTRACTED" ]; then
  CHECK_STRING="$COMMAND"
fi

if [ -n "$CHECK_STRING" ] && has_issue_id "$CHECK_STRING"; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
fi

# ---------- block ----------
case "$CMD_TYPE" in
  bare_commit)
    echo "BLOCKED: Commits must include an issue ID via the -m flag." >&2
    echo "Use: git commit -m \"${TEAM_PREFIX}-123: your message\"" >&2
    ;;
  commit)
    echo "BLOCKED: Commit message must contain an issue ID (e.g. ${TEAM_PREFIX}-123: your message)." >&2
    echo "Expected format: \"${TEAM_PREFIX}-<number>: description\"" >&2
    echo "Tip: Ask Claude to create a Linear ticket if you don't have one yet." >&2
    ;;
  branch)
    echo "BLOCKED: Branch name must contain an issue ID (e.g. ${TEAM_PREFIX}-123-my-feature)." >&2
    echo "Expected format: ${TEAM_PREFIX}-<number>-slug" >&2
    echo "Tip: Ask Claude to create a Linear ticket if you don't have one yet." >&2
    ;;
  pr)
    echo "BLOCKED: PR title must contain an issue ID (e.g. ${TEAM_PREFIX}-123: your title)." >&2
    echo "Expected format: \"${TEAM_PREFIX}-<number>: description\"" >&2
    echo "Tip: Ask Claude to create a Linear ticket if you don't have one yet." >&2
    ;;
esac

exit 2
