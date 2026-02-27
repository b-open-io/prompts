#!/usr/bin/env bash
# linear-session-start.sh — SessionStart hook for Linear Sync
# Detects repo status and injects minimal context or triggers setup wizard.
# Event: SessionStart (matcher: startup|clear|compact)
# Timeout: 10s
set -euo pipefail

# ---------- helpers ----------
STATE_DIR="$HOME/.claude/linear-sync"
STATE_FILE="$STATE_DIR/state.json"
mkdir -p "$STATE_DIR"

json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null
}

emit() {
  local msg
  # Prepend CONFIG_WARNING if set (e.g., when .claude/linear-sync.json is malformed)
  msg="${CONFIG_WARNING:-}$1"
  local ctx
  ctx=$(printf '%s' "$msg" | json_escape)
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' "$ctx"
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

if [ -z "$CWD" ]; then
  exit 0
fi

# ---------- check if git repo ----------
if [ ! -d "$CWD/.git" ]; then
  GIT_TOP=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "")
  if [ -z "$GIT_TOP" ]; then
    exit 0
  fi
else
  GIT_TOP=$(cd "$CWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "$CWD")
fi

# ---------- get repo name and GitHub org ----------
REPO_NAME=$(basename "$GIT_TOP" 2>/dev/null || echo "")
if [ -z "$REPO_NAME" ]; then
  exit 0
fi

REMOTE_URL=$(cd "$GIT_TOP" 2>/dev/null && git remote get-url origin 2>/dev/null || echo "")
GITHUB_ORG=""
if [ -n "$REMOTE_URL" ]; then
  GITHUB_ORG=$(echo "$REMOTE_URL" | python3 -c "
import sys, re
url = sys.stdin.read().strip()
m = re.search(r'github\.com[:/]([^/]+)/', url)
print(m.group(1) if m else '')
" 2>/dev/null || echo "")
fi

# ---------- read state file ----------
if [ ! -f "$STATE_FILE" ]; then
  REPO_ENTRY=""
  HAS_WORKSPACES="false"
else
  _REPO_STATE=$(STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
repo = data.get('repos', {}).get(os.environ['REPO_NAME'], None)
if repo is None:
    print('NOT_FOUND')
else:
    print(json.dumps(repo))
print('true' if data.get('workspaces', {}) else 'false')
" 2>/dev/null || printf 'NOT_FOUND\nfalse')
  REPO_ENTRY=$(printf '%s\n' "$_REPO_STATE" | sed -n '1p')
  HAS_WORKSPACES=$(printf '%s\n' "$_REPO_STATE" | sed -n '2p')
fi

# ---------- check for local opt-out ----------
if [ "$REPO_ENTRY" != "NOT_FOUND" ] && [ -n "$REPO_ENTRY" ]; then
  _LOCAL_OPTED_OUT=$(printf '%s' "$REPO_ENTRY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('true' if d.get('workspace') == 'none' else 'false')
" 2>/dev/null || echo "false")
  if [ "$_LOCAL_OPTED_OUT" = "true" ]; then
    exit 0
  fi
fi

# ---------- check for repo-level config (.claude/linear-sync.json) ----------
REPO_CONFIG_FILE="$GIT_TOP/.claude/linear-sync.json"
CONFIG_WARNING=""
if [ -f "$REPO_CONFIG_FILE" ]; then
  _REPO_CFG=$(REPO_CONFIG_FILE="$REPO_CONFIG_FILE" python3 -c "
import json, os
with open(os.environ['REPO_CONFIG_FILE']) as f:
    cfg = json.load(f)
print(json.dumps({
    'workspace': cfg.get('workspace', ''),
    'project': cfg.get('project', ''),
    'team': cfg.get('team', ''),
    'label': cfg.get('label', '')
}))
" 2>/dev/null || echo "")

  if [ -n "$_REPO_CFG" ]; then
    _RC_WS=$(printf '%s' "$_REPO_CFG" | python3 -c "import json,sys; print(json.load(sys.stdin).get('workspace',''))" 2>/dev/null || echo "")

    if [ -n "$_RC_WS" ]; then
      _WS_EXISTS="false"
      if [ -f "$STATE_FILE" ]; then
        _WS_EXISTS=$(STATE_FILE="$STATE_FILE" _RC_WS="$_RC_WS" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
ws = data.get('workspaces', {}).get(os.environ['_RC_WS'], None)
print('true' if ws else 'false')
" 2>/dev/null || echo "false")
      fi

      if [ "$_WS_EXISTS" = "true" ]; then
        REPO_ENTRY=$(STATE_FILE="$STATE_FILE" _RC_WS="$_RC_WS" _REPO_CFG="$_REPO_CFG" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
cfg = json.loads(os.environ['_REPO_CFG'])
entry = {
    'workspace': os.environ['_RC_WS'],
    'project': cfg.get('project', ''),
    'team': cfg.get('team', ''),
    'label': cfg.get('label', '')
}
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
local_repo = data.get('repos', {}).get(os.environ['REPO_NAME'], {})
if local_repo.get('last_issue'):
    entry['last_issue'] = local_repo['last_issue']
if local_repo.get('last_digest_at'):
    entry['last_digest_at'] = local_repo['last_digest_at']
print(json.dumps(entry))
" 2>/dev/null || echo "$REPO_ENTRY")
        HAS_WORKSPACES="true"
      else
        CTX="[LINEAR-SETUP] Repo \"$REPO_NAME\" has a committed .claude/linear-sync.json for workspace \"$_RC_WS\", but your local Linear credentials are not set up for this workspace. Use AskUserQuestion: \"This repo uses the $_RC_WS workspace. Set up your API key? / This repo doesn't use Linear\". If yes, use the linear-sync subagent (foreground) to add the workspace entry to the local state file. No project/team/label questions needed — they come from the repo config."
        emit "$CTX"
        exit 0
      fi
    fi
  else
    CONFIG_WARNING="[LINEAR-WARNING] .claude/linear-sync.json exists but is malformed. Falling back to local config.
"
  fi
fi

# ---------- determine status ----------

# Case 1: opted out
if [ "$REPO_ENTRY" != "NOT_FOUND" ] && [ -n "$REPO_ENTRY" ]; then
  IS_OPTED_OUT=$(printf '%s' "$REPO_ENTRY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('true' if d.get('workspace') == 'none' else 'false')
" 2>/dev/null || echo "false")

  if [ "$IS_OPTED_OUT" = "true" ]; then
    exit 0
  fi
fi

# Case 2: linked with valid workspace
if [ "$REPO_ENTRY" != "NOT_FOUND" ] && [ -n "$REPO_ENTRY" ]; then
  LINK_INFO=$(STATE_FILE="$STATE_FILE" REPO_ENTRY="$REPO_ENTRY" python3 -c "
import json, sys, os

with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)

repo = json.loads(os.environ['REPO_ENTRY'])
ws_id = repo.get('workspace', '')
ws = data.get('workspaces', {}).get(ws_id, None)

if ws is None:
    print('BROKEN')
else:
    info = {
        'workspace': ws.get('name', ws_id),
        'workspace_id': ws_id,
        'project': repo.get('project', ''),
        'team': repo.get('team', ws.get('default_team', '')),
        'label': repo.get('label', ''),
        'api_key_env': ws.get('linear_api_key_env', '')
    }
    print(json.dumps(info))
" 2>/dev/null || echo "BROKEN")

  if [ "$LINK_INFO" = "BROKEN" ]; then
    CTX="[LINEAR-SETUP] Repo \"$REPO_NAME\" references a workspace that no longer exists in the state file. Use AskUserQuestion to ask the dev: \"The Linear workspace for this repo is missing. Reconfigure? / Opt out of Linear for this repo?\" If reconfigure, use the linear-sync subagent (foreground) to walk through setup. If opt out, use the subagent to write workspace:none."
    emit "$CTX"
    exit 0
  fi

  # Valid linked repo — inject config context + session kickoff
  LINK_FIELDS=$(printf '%s' "$LINK_INFO" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('workspace', ''))
print(d.get('workspace_id', ''))
print(d.get('project', ''))
print(d.get('team', ''))
print(d.get('label', ''))
" 2>/dev/null || echo "")
  WS_NAME=$(printf '%s\n' "$LINK_FIELDS" | sed -n '1p')
  WS_ID=$(printf '%s\n' "$LINK_FIELDS" | sed -n '2p')
  PROJECT=$(printf '%s\n' "$LINK_FIELDS" | sed -n '3p')
  TEAM=$(printf '%s\n' "$LINK_FIELDS" | sed -n '4p')
  LABEL=$(printf '%s\n' "$LINK_FIELDS" | sed -n '5p')

  LAST_ISSUE=$(printf '%s' "$REPO_ENTRY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('last_issue', ''))
" 2>/dev/null || echo "")

  # Detect stale branches (5+ days with no commits)
  STALE_BRANCHES=""
  CURRENT_BRANCH=$(cd "$GIT_TOP" 2>/dev/null && git branch --show-current 2>/dev/null || echo "")
  if [ -d "$GIT_TOP/.git" ] || git -C "$GIT_TOP" rev-parse --git-dir >/dev/null 2>&1; then
    STALE_BRANCHES=$(cd "$GIT_TOP" 2>/dev/null && CURRENT_BRANCH="$CURRENT_BRANCH" python3 -c "
import subprocess, sys, os
from datetime import datetime, timedelta, timezone
cutoff = datetime.now(timezone.utc) - timedelta(days=5)
current = os.environ.get('CURRENT_BRANCH', '')
result = subprocess.run(['git', 'for-each-ref', '--format=%(refname:short) %(committerdate:iso-strict)', 'refs/heads/'], capture_output=True, text=True)
stale = []
for line in result.stdout.strip().split('\n'):
    if not line.strip():
        continue
    parts = line.rsplit(' ', 1)
    if len(parts) != 2:
        continue
    branch, date_str = parts
    if branch in ('main', 'master', 'develop') or branch == current:
        continue
    try:
        commit_date = datetime.fromisoformat(date_str)
        if commit_date < cutoff:
            days_ago = (datetime.now(timezone.utc) - commit_date).days
            stale.append(f'{branch} ({days_ago}d ago)')
    except (ValueError, TypeError):
        pass
if stale:
    print(', '.join(stale[:3]))
else:
    print('')
" 2>/dev/null || echo "")
  fi

  CTX="[Linear/$WS_ID] Repo: $REPO_NAME | Workspace: $WS_NAME | Project: $PROJECT | Team: $TEAM | Label: $LABEL | Branch format: $TEAM-<number>-slug | Commit format: $TEAM-<number>: description"

  if [ -n "$LAST_ISSUE" ]; then
    CTX="$CTX | last_issue: $LAST_ISSUE"
  fi

  if [ -n "$STALE_BRANCHES" ]; then
    CTX="$CTX
[STALE-BRANCHES] Stale local branches (no commits in 5+ days): $STALE_BRANCHES"
  fi

  # Digest trigger (only if not triggered in the last 4 hours)
  SHOULD_DIGEST=$(STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
from datetime import datetime, timezone, timedelta
try:
    with open(os.environ['STATE_FILE']) as f:
        data = json.load(f)
    repo = data.get('repos', {}).get(os.environ['REPO_NAME'], {})
    last = repo.get('last_digest_at', '')
    if not last:
        print('true')
    else:
        last_dt = datetime.fromisoformat(last)
        if datetime.now(timezone.utc) - last_dt > timedelta(hours=4):
            print('true')
        else:
            print('false')
except Exception:
    print('true')
" 2>/dev/null || echo "true")

  if [ "$SHOULD_DIGEST" = "true" ]; then
    STATE_FILE="$STATE_FILE" REPO_NAME="$REPO_NAME" python3 -c "
import json, os
from datetime import datetime, timezone
sf = os.environ['STATE_FILE']
with open(sf) as f:
    data = json.load(f)
repo_name = os.environ['REPO_NAME']
repo = data.get('repos', {}).get(repo_name, None)
if repo is not None:
    repo['last_digest_at'] = datetime.now(timezone.utc).isoformat()
    data['repos'][repo_name] = repo
    with open(sf, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
" 2>/dev/null || true

    CTX="$CTX
[LINEAR-DIGEST] Delegate to linear-sync subagent (background) to fetch notification digest before asking what to work on."
  fi

  CTX="$CTX
GitHub issue sync available. Run: bash \${CLAUDE_PLUGIN_ROOT}/scripts/sync-github-issues.sh $GIT_TOP"
  CTX="$CTX
Follow the Linear Sync workflow skill instructions to ask the dev what they're working on today in $REPO_NAME."
  emit "$CTX"
  exit 0
fi

# Case 3: repo not in file — setup required
if [ "$REPO_ENTRY" = "NOT_FOUND" ] || [ -z "$REPO_ENTRY" ]; then

  # Check for .linear-sync-template.json in repo root
  TEMPLATE_CTX=""
  if [ -f "$GIT_TOP/.linear-sync-template.json" ]; then
    TEMPLATE_CTX=$(GIT_TOP="$GIT_TOP" python3 -c "
import json, os
with open(os.path.join(os.environ['GIT_TOP'], '.linear-sync-template.json')) as f:
    t = json.load(f)
parts = []
for k in ('workspace', 'project', 'team', 'label'):
    if k in t:
        parts.append(f'{k}={t[k]}')
if parts:
    print('[LINEAR-TEMPLATE] Found .linear-sync-template.json with defaults: ' + ', '.join(parts) + '. Pre-fill setup wizard with these values and ask the dev to confirm.')
else:
    print('')
" 2>/dev/null || echo "")
  fi

  # Check if org matches a known workspace
  ORG_MATCH=""
  if [ -n "$GITHUB_ORG" ] && [ -f "$STATE_FILE" ]; then
    ORG_MATCH=$(STATE_FILE="$STATE_FILE" GITHUB_ORG="$GITHUB_ORG" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
defaults = data.get('github_org_defaults', {})
ws_id = defaults.get(os.environ['GITHUB_ORG'], '')
if ws_id and ws_id in data.get('workspaces', {}):
    ws = data['workspaces'][ws_id]
    print(json.dumps({'workspace_id': ws_id, 'name': ws.get('name', ws_id)}))
else:
    print('')
" 2>/dev/null || echo "")
  fi

  if [ "$HAS_WORKSPACES" = "true" ] && [ -n "$ORG_MATCH" ]; then
    _MATCH_FIELDS=$(printf '%s' "$ORG_MATCH" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('name', ''))
print(d.get('workspace_id', ''))
" 2>/dev/null || printf '\n')
    MATCH_NAME=$(printf '%s\n' "$_MATCH_FIELDS" | sed -n '1p')
    MATCH_ID=$(printf '%s\n' "$_MATCH_FIELDS" | sed -n '2p')

    CTX="[LINEAR-SETUP] New repo \"$REPO_NAME\" (org: $GITHUB_ORG) matches workspace \"$MATCH_NAME\". Use AskUserQuestion to confirm: \"Link $REPO_NAME to $MATCH_NAME workspace? / Choose a different workspace / This repo doesn't use Linear\". If confirmed, use the linear-sync subagent (foreground) to fetch projects and teams from Linear MCP for workspace \"$MATCH_ID\", present projects as AskUserQuestion choices with \"Create a new project\" as the last option. If they pick \"Create a new project\", ask for a name, then delegate to the subagent to create it in Linear before linking. Ask for a label (suggest \"repo:$REPO_NAME\"), and persist to state file."
    if [ -n "$TEMPLATE_CTX" ]; then
      CTX="$CTX
$TEMPLATE_CTX"
    fi
    emit "$CTX"
    exit 0

  elif [ "$HAS_WORKSPACES" = "true" ]; then
    WORKSPACE_LIST=$(STATE_FILE="$STATE_FILE" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
names = [v.get('name', k) for k, v in data.get('workspaces', {}).items()]
print(', '.join(names))
" 2>/dev/null || echo "")

    CTX="[LINEAR-SETUP] New repo \"$REPO_NAME\" (org: ${GITHUB_ORG:-unknown}). Known workspaces: $WORKSPACE_LIST. Use AskUserQuestion to ask: \"Which workspace for $REPO_NAME? / $WORKSPACE_LIST / Set up a new workspace / This repo doesn't use Linear\". If an existing workspace is picked, ask if org \"$GITHUB_ORG\" should default to it. Then use the linear-sync subagent (foreground) to fetch projects/teams, present projects as choices with \"Create a new project\" as the last option. If they pick \"Create a new project\", ask for a name, then delegate to the subagent to create it in Linear before linking. Ask for a label (suggest \"repo:$REPO_NAME\"), and persist."
    if [ -n "$TEMPLATE_CTX" ]; then
      CTX="$CTX
$TEMPLATE_CTX"
    fi
    emit "$CTX"
    exit 0

  else
    CTX="[LINEAR-SETUP] First-time setup. Repo: \"$REPO_NAME\" (org: ${GITHUB_ORG:-unknown}). Use AskUserQuestion: \"Does this repo connect to Linear? Yes / No\". If yes, use the linear-sync subagent (foreground) to discover workspaces/teams/projects from Linear MCP. Walk through full setup via AskUserQuestion: pick workspace, pick team, present projects with \"Create a new project\" as the last option. If they pick \"Create a new project\", ask for a name, then delegate to the subagent to create it in Linear before linking. Choose label (suggest \"repo:$REPO_NAME\"), ask if org \"$GITHUB_ORG\" should default to this workspace. If no, subagent writes workspace:none and proceed."
    if [ -n "$TEMPLATE_CTX" ]; then
      CTX="$CTX
$TEMPLATE_CTX"
    fi
    emit "$CTX"
    exit 0
  fi
fi

exit 0
