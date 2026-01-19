#!/bin/bash
# agent-browser-solo hook
# Blocks WebSearch and WebFetch tools, directing agents to use agent-browser CLI instead
# This enforces use of full browser automation for more reliable web interaction

set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Block WebSearch and WebFetch
if [[ "$tool_name" == "WebSearch" || "$tool_name" == "WebFetch" ]]; then
  cat >&2 <<EOF
{
  "decision": "deny",
  "reason": "WebSearch/WebFetch disabled. Use agent-browser CLI instead:\n\n  agent-browser open <url>        # Navigate to page\n  agent-browser snapshot -i       # Get interactive elements\n  agent-browser get text @e1      # Extract text\n  agent-browser screenshot        # Take screenshot\n\nFor search: agent-browser open 'https://google.com/search?q=your+query'\nFor page content: agent-browser open <url> && agent-browser snapshot"
}
EOF
  exit 2
fi

# Allow other tools
exit 0
