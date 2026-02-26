#!/bin/bash
# agent-browser-solo hook
# Intercepts WebSearch/WebFetch, executes agent-browser automatically, and returns
# the result to Claude as context. Falls back gracefully if agent-browser is missing.

set -uo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

if [[ "$tool_name" != "WebSearch" && "$tool_name" != "WebFetch" ]]; then
  exit 0
fi

# Find agent-browser across common install locations.
# Claude Code hooks run in a restricted shell without nvm/pyenv on PATH,
# so we probe common locations rather than relying on PATH alone.
find_agent_browser() {
  # 1. Try login shell (loads nvm, homebrew, etc.)
  local path
  path=$(bash -lc 'which agent-browser 2>/dev/null' 2>/dev/null || true)
  if [[ -n "$path" && -x "$path" ]]; then
    echo "$path"; return 0
  fi

  # 2. Common static locations
  for candidate in \
    "/usr/local/bin/agent-browser" \
    "/opt/homebrew/bin/agent-browser" \
    "$HOME/.local/bin/agent-browser"
  do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"; return 0
    fi
  done

  # 3. Latest nvm node version
  if [[ -d "$HOME/.nvm/versions/node" ]]; then
    local latest
    latest=$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)
    local nvm_path="$HOME/.nvm/versions/node/$latest/bin/agent-browser"
    if [[ -x "$nvm_path" ]]; then
      echo "$nvm_path"; return 0
    fi
  fi

  return 1
}

AGENT_BROWSER=$(find_agent_browser 2>/dev/null || true)

if [[ -z "$AGENT_BROWSER" ]]; then
  # Not installed — allow the tool through but warn clearly
  cat <<'EOF'
⚠️  agent-browser is not installed. WebFetch/WebSearch proceeding as fallback.

agent-browser is strongly preferred: it runs a real browser with JavaScript,
handles SPAs, dynamic content, auth, and lets you click/fill/screenshot.

Install it:
  npm install -g agent-browser
  npx skills add vercel-labs/agent-browser@agent-browser

EOF
  exit 0
fi

# agent-browser found — intercept, execute, and return results directly.
if [[ "$tool_name" == "WebFetch" ]]; then
  url=$(echo "$input" | jq -r '.tool_input.url // empty')
  prompt=$(echo "$input" | jq -r '.tool_input.prompt // empty')

  result=$(
    "$AGENT_BROWSER" open "$url" 2>&1 &&
    "$AGENT_BROWSER" snapshot 2>&1
  ) || result="agent-browser error (exit $?): $result"

  message="[agent-browser intercepted WebFetch]
URL: $url${prompt:+
Prompt hint: $prompt}

$result"

elif [[ "$tool_name" == "WebSearch" ]]; then
  query=$(echo "$input" | jq -r '.tool_input.query // empty')
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query" 2>/dev/null || echo "$query")

  result=$(
    "$AGENT_BROWSER" open "https://www.google.com/search?q=${encoded}" 2>&1 &&
    "$AGENT_BROWSER" snapshot 2>&1
  ) || result="agent-browser error (exit $?): $result"

  message="[agent-browser intercepted WebSearch]
Query: $query

$result"
fi

# Inject agent-browser result as context and allow the tool to proceed normally.
printf '%s' "$message" | jq -Rs '{systemMessage: .}'
exit 0
