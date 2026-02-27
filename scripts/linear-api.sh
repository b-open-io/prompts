#!/usr/bin/env bash
# linear-api.sh — Wrapper for Linear GraphQL API calls
# Reads API key from ~/.claude/mcp.json so it never appears in Claude transcripts.
#
# Usage:
#   linear-api.sh [server-name] 'query { ... }'
#   linear-api.sh [server-name] 'mutation { ... }'
#   linear-api.sh [server-name] 'mutation($input: IssueCreateInput!) { ... }' '{"input": {...}}'
#
# server-name: Name of the MCP server entry in mcp.json (default: "linear")
#              For multi-workspace setups, use the workspace-specific server name
#              (e.g., "linear-opl", "linear-crystalpeak")
#
# When a variables JSON object is provided as the last argument, it is included
# in the request body alongside the query. This avoids inline string interpolation
# and handles escaping of special characters (quotes, newlines, backslashes)
# automatically. Use this for any mutation that includes user-provided text.
set -euo pipefail

MCP_CONFIG="$HOME/.claude/mcp.json"

# ---------- parse args ----------
VARIABLES=""
if [ $# -eq 1 ]; then
  SERVER="linear"
  QUERY="$1"
elif [ $# -eq 2 ]; then
  if printf '%s' "$1" | python3 -c "
import sys
a = sys.stdin.read().strip()
sys.exit(0 if a.startswith('query') or a.startswith('mutation') or a.startswith('{') else 1)
" 2>/dev/null; then
    SERVER="linear"
    QUERY="$1"
    VARIABLES="$2"
  else
    SERVER="$1"
    QUERY="$2"
  fi
elif [ $# -eq 3 ]; then
  SERVER="$1"
  QUERY="$2"
  VARIABLES="$3"
else
  echo '{"error": "Usage: linear-api.sh [server-name] query [variables]"}' >&2
  exit 1
fi

# ---------- read API key from mcp.json ----------
if [ ! -f "$MCP_CONFIG" ]; then
  echo '{"error": "MCP config not found at ~/.claude/mcp.json"}' >&2
  exit 1
fi

API_KEY=$(MCP_CONFIG="$MCP_CONFIG" SERVER="$SERVER" python3 -c '
import json, os
with open(os.environ["MCP_CONFIG"]) as f:
    config = json.load(f)
servers = config.get("mcpServers", {})
server = servers.get(os.environ["SERVER"], {})
env = server.get("env", {})
key = env.get("LINEAR_API_KEY", "")
if not key:
    for k, v in env.items():
        if "KEY" in k.upper() or "TOKEN" in k.upper():
            key = v
            break
# Resolve env var references
if key and key.startswith("$"):
    if key.startswith("${") and key.endswith("}"):
        var_name = key[2:-1]
    else:
        var_name = key[1:]
    key = os.environ.get(var_name, "")
print(key)
' 2>/dev/null)

if [ -z "$API_KEY" ]; then
  echo "{\"error\": \"No API key found for server '$SERVER' in mcp.json\"}" >&2
  exit 1
fi

# ---------- build JSON payload ----------
PAYLOAD=$(QUERY="$QUERY" VARIABLES="$VARIABLES" python3 -c "
import json, os
# Strip \! → ! (Bash tool escapes ! even in single quotes due to history expansion)
query = os.environ['QUERY'].replace(chr(92) + '!', '!')
payload = {'query': query}
variables = os.environ.get('VARIABLES', '')
if variables:
    payload['variables'] = json.loads(variables)
print(json.dumps(payload))
" 2>/dev/null)

# ---------- make the request ----------
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
