#!/usr/bin/env bash
# sync-github-issues.sh — Sync GitHub issues to/from Linear
# Usage: sync-github-issues.sh [repo-root]
#   repo-root: Path to the git repo root (default: current directory)
#
# Reads config from .claude/linear-sync.json in the repo root.
# Reads github_org from the config file or falls back to local state file.
# Creates Linear issues for unsynced GitHub issues.
# Closes GitHub issues when their linked Linear issue is completed/canceled.
set -euo pipefail

REPO_ROOT="${1:-.}"
CONFIG_FILE="$REPO_ROOT/.claude/linear-sync.json"
STATE_FILE="$HOME/.claude/linear-sync/state.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SCRIPT="$SCRIPT_DIR/linear-api.sh"

# ---------- read config ----------
if [ ! -f "$CONFIG_FILE" ]; then
  echo '{"error": "No .claude/linear-sync.json found in repo root"}'
  exit 1
fi

CONFIG=$(CONFIG_FILE="$CONFIG_FILE" python3 -c "
import json, os
with open(os.environ['CONFIG_FILE']) as f:
    cfg = json.load(f)
for key in ('workspace', 'project', 'team', 'label', 'github_org'):
    print(cfg.get(key, ''))
")

WORKSPACE=$(echo "$CONFIG" | sed -n '1p')
PROJECT=$(echo "$CONFIG" | sed -n '2p')
TEAM=$(echo "$CONFIG" | sed -n '3p')
LABEL=$(echo "$CONFIG" | sed -n '4p')
GITHUB_ORG=$(echo "$CONFIG" | sed -n '5p')
REPO_NAME=$(basename "$REPO_ROOT")

# Fall back to state file for github_org if not in repo config
if [ -z "$GITHUB_ORG" ] && [ -f "$STATE_FILE" ]; then
  GITHUB_ORG=$(STATE_FILE="$STATE_FILE" WORKSPACE="$WORKSPACE" python3 -c "
import json, os
with open(os.environ['STATE_FILE']) as f:
    data = json.load(f)
ws = data.get('workspaces', {}).get(os.environ['WORKSPACE'], {})
print(ws.get('github_org', ''))
")
fi

if [ -z "$GITHUB_ORG" ] || [ -z "$PROJECT" ] || [ -z "$TEAM" ] || [ -z "$LABEL" ]; then
  echo '{"error": "Missing required config: github_org, project, team, or label"}'
  exit 1
fi

FULL_REPO="$GITHUB_ORG/$REPO_NAME"

# ---------- Phase 1: Gather data ----------

# Fetch open GitHub issues
GH_ISSUES=$(gh issue list --repo "$FULL_REPO" --state open --json number,title,body,url --limit 500 2>/dev/null || echo "[]")

GH_COUNT=$(echo "$GH_ISSUES" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
if [ "$GH_COUNT" = "0" ]; then
  :
fi

# Fetch Linear issues in this project with repo label
LINEAR_ISSUES=$(bash "$API_SCRIPT" "query {
  issues(filter: {
    project: { name: { eq: \"$PROJECT\" } },
    labels: { some: { name: { eq: \"$LABEL\" } } }
  }, first: 250) {
    nodes { id identifier title description state { name type } }
  }
}")

# ---------- Phase 2: GitHub -> Linear (create missing) ----------

TEAM_ID=""
PROJECT_ID=""
LABEL_ID=""
CREATED=0

if [ "$GH_COUNT" != "0" ]; then
  UNSYNCED=$(GH_ISSUES="$GH_ISSUES" LINEAR_ISSUES="$LINEAR_ISSUES" FULL_REPO="$FULL_REPO" python3 -c "
import json, os, re

gh = json.loads(os.environ['GH_ISSUES'])
linear = json.loads(os.environ['LINEAR_ISSUES'])
full_repo = os.environ['FULL_REPO']

linear_nodes = linear.get('data', {}).get('issues', {}).get('nodes', [])

synced = set()
for li in linear_nodes:
    desc = li.get('description') or ''
    m = re.search(r'<!-- gh-sync:' + re.escape(full_repo) + r'#(\d+) -->', desc)
    if m:
        synced.add(int(m.group(1)))

unsynced = [i for i in gh if i['number'] not in synced]
print(json.dumps(unsynced))
")

  UNSYNCED_COUNT=$(echo "$UNSYNCED" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

  if [ "$UNSYNCED_COUNT" != "0" ]; then
    TEAM_ID=$(bash "$API_SCRIPT" "query { teams(filter: { key: { eq: \"$TEAM\" } }) { nodes { id } } }" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['teams']['nodes'][0]['id'])")

    PROJECT_ID=$(bash "$API_SCRIPT" "query { projects(filter: { name: { eq: \"$PROJECT\" } }) { nodes { id } } }" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['projects']['nodes'][0]['id'])")

    LABEL_ID=$(bash "$API_SCRIPT" "query { issueLabels(filter: { name: { eq: \"$LABEL\" } }) { nodes { id } } }" | python3 -c "
import json, sys
nodes = json.load(sys.stdin)['data']['issueLabels']['nodes']
print(nodes[0]['id'] if nodes else '')
")

    if [ -z "$LABEL_ID" ]; then
      LABEL_ID=$(bash "$API_SCRIPT" "mutation { issueLabelCreate(input: { teamId: \"$TEAM_ID\", name: \"$LABEL\" }) { issueLabel { id } } }" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['issueLabelCreate']['issueLabel']['id'])")
    fi

    CREATED_FILE=$(mktemp)
    echo "0" > "$CREATED_FILE"

    echo "$UNSYNCED" | python3 -c "
import json, sys
issues = json.load(sys.stdin)
for i in issues:
    print(json.dumps(i))
" | while IFS= read -r ISSUE_JSON; do
      NUMBER=$(echo "$ISSUE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['number'])")
      TITLE=$(echo "$ISSUE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['title'])")
      BODY=$(echo "$ISSUE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('body') or '')")
      URL=$(echo "$ISSUE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")

      VARS=$(TEAM_ID="$TEAM_ID" PROJECT_ID="$PROJECT_ID" LABEL_ID="$LABEL_ID" \
             NUMBER="$NUMBER" TITLE="$TITLE" BODY="$BODY" URL="$URL" FULL_REPO="$FULL_REPO" \
             python3 -c "
import json, os
body = os.environ['BODY']
url = os.environ['URL']
full_repo = os.environ['FULL_REPO']
number = os.environ['NUMBER']

if body.strip():
    desc = body + '\n\n---\n[GitHub Issue](' + url + ')\n<!-- gh-sync:' + full_repo + '#' + number + ' -->'
else:
    desc = '---\n[GitHub Issue](' + url + ')\n<!-- gh-sync:' + full_repo + '#' + number + ' -->'

print(json.dumps({'input': {
    'teamId': os.environ['TEAM_ID'],
    'title': 'GH#' + number + ': ' + os.environ['TITLE'],
    'description': desc,
    'projectId': os.environ['PROJECT_ID'],
    'labelIds': [os.environ['LABEL_ID']]
}}))
")

      RESULT=$(bash "$API_SCRIPT" \
        'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { issue { identifier title } } }' \
        "$VARS" 2>&1)

      IDENTIFIER=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('issueCreate',{}).get('issue',{}).get('identifier','FAILED'))" 2>/dev/null || echo "FAILED")

      if [ "$IDENTIFIER" != "FAILED" ]; then
        echo "$(( $(cat "$CREATED_FILE") + 1 ))" > "$CREATED_FILE"
        echo "  Created $IDENTIFIER from GH#$NUMBER" >&2
      else
        echo "  Failed to create from GH#$NUMBER: $RESULT" >&2
      fi
    done

    CREATED=$(cat "$CREATED_FILE")
    rm -f "$CREATED_FILE"
  fi
fi

# ---------- Phase 3: Linear -> GitHub (close resolved) ----------
CLOSED=0

CLOSABLE=$(LINEAR_ISSUES="$LINEAR_ISSUES" FULL_REPO="$FULL_REPO" python3 -c "
import json, os, re

linear = json.loads(os.environ['LINEAR_ISSUES'])
full_repo = os.environ['FULL_REPO']
nodes = linear.get('data', {}).get('issues', {}).get('nodes', [])

closable = []
for li in nodes:
    state_type = li.get('state', {}).get('type', '')
    if state_type not in ('completed', 'canceled'):
        continue
    desc = li.get('description') or ''
    m = re.search(r'<!-- gh-sync:' + re.escape(full_repo) + r'#(\d+) -->', desc)
    if m:
        closable.append({'number': int(m.group(1)), 'identifier': li['identifier']})

print(json.dumps(closable))
")

CLOSABLE_COUNT=$(echo "$CLOSABLE" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

if [ "$CLOSABLE_COUNT" != "0" ]; then
  CLOSED_FILE=$(mktemp)
  echo "0" > "$CLOSED_FILE"

  echo "$CLOSABLE" | python3 -c "
import json, sys
for item in json.load(sys.stdin):
    print(json.dumps(item))
" | while IFS= read -r ITEM_JSON; do
    NUMBER=$(echo "$ITEM_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['number'])")
    IDENTIFIER=$(echo "$ITEM_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['identifier'])")

    GH_STATE=$(gh issue view "$NUMBER" --repo "$FULL_REPO" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")

    if [ "$GH_STATE" = "OPEN" ]; then
      gh issue close "$NUMBER" --repo "$FULL_REPO" --comment "Closed via Linear ($IDENTIFIER)." 2>/dev/null && {
        echo "$(( $(cat "$CLOSED_FILE") + 1 ))" > "$CLOSED_FILE"
        echo "  Closed GH#$NUMBER via $IDENTIFIER" >&2
      }
    fi
  done

  CLOSED=$(cat "$CLOSED_FILE")
  rm -f "$CLOSED_FILE"
fi

# ---------- Phase 4: Summary ----------
if [ "$CREATED" = "0" ] && [ "$CLOSED" = "0" ]; then
  echo "GitHub sync for $REPO_NAME: everything in sync."
else
  echo "GitHub sync for $REPO_NAME: created $CREATED Linear issues, closed $CLOSED GitHub issues."
fi
