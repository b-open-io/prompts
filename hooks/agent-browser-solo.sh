#!/bin/bash
# agent-browser-solo hook
# Intercepts WebSearch/WebFetch and routes to agent-browser if available.
# Falls back gracefully with install instructions if agent-browser is missing.

set -uo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

if [[ "$tool_name" != "WebSearch" && "$tool_name" != "WebFetch" ]]; then
  exit 0
fi

# Check if agent-browser is available
if ! command -v agent-browser &>/dev/null; then
  # Not installed — allow the tool but warn loudly
  cat <<'EOF'
⚠️  WARNING: agent-browser is not installed.
WebFetch/WebSearch will work but agent-browser is strongly preferred — it gives
you a full browser, JavaScript execution, interactive snapshots, screenshots,
and the ability to interact with pages (click, fill, scroll).

To install agent-browser and unlock full browser automation:

  npm install -g agent-browser

Then reinstall this skill for your project:

  npx skills add vercel-labs/agent-browser@agent-browser

Why it matters: WebFetch only retrieves raw HTML and can't handle SPAs,
logins, dynamic content, or complex interactions. agent-browser does all of
that and more.
EOF
  exit 0
fi

# agent-browser IS available — intercept and redirect
if [[ "$tool_name" == "WebFetch" ]]; then
  url=$(echo "$input" | jq -r '.tool_input.url // empty')
  prompt=$(echo "$input" | jq -r '.tool_input.prompt // empty')

  reason="agent-browser is available and preferred over WebFetch.

Use these Bash commands instead:

  agent-browser open $(printf '%q' "$url")
  agent-browser snapshot        # full page content
  # OR for just text:
  agent-browser get text

agent-browser advantages over WebFetch:
  - Executes JavaScript (works on SPAs and dynamic pages)
  - Can interact: click, fill forms, scroll, screenshot
  - Handles auth, cookies, redirects natively
  - Returns structured accessibility tree, not raw HTML"

  if [[ -n "$prompt" ]]; then
    reason="$reason

Original prompt hint: $prompt"
  fi

elif [[ "$tool_name" == "WebSearch" ]]; then
  query=$(echo "$input" | jq -r '.tool_input.query // empty')
  encoded_query=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$query" 2>/dev/null || echo "$query")

  reason="agent-browser is available and preferred over WebSearch.

Use these Bash commands instead:

  agent-browser open \"https://www.google.com/search?q=${encoded_query}\"
  agent-browser snapshot        # get search results with links
  # OR open a specific result:
  agent-browser click @eN       # click a search result by ref

agent-browser advantages over WebSearch:
  - Returns actual page structure with clickable refs
  - Can follow links and extract content from results
  - Works with any search engine (Bing, DuckDuckGo, etc.)
  - No API quota limits"
fi

printf '%s' "$reason" | jq -Rs '{decision: "deny", reason: .}' >&2
exit 2
