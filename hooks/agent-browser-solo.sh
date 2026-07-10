#!/bin/bash
# agent-browser-solo.sh — Claude PreToolUse for WebFetch (browser-oriented work).
#
# Policy:
#   - Do NOT execute a browser and then allow the original tool (that duplicates
#     requests and elevates raw page content into privileged/system context).
#   - Keep ordinary textual WebSearch available (this hook should not match it,
#     but if invoked, allow through immediately).
#   - For WebFetch: deny with a static, actionable redirect to use agent-browser
#     via an ordinary Bash tool call. Never place raw web page content in
#     systemMessage / developer context.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

input=$(cat)
tool_name=$(extract_tool_name "$input")
tool_lower=$(printf '%s' "$tool_name" | tr '[:upper:]' '[:lower:]')

# Ordinary textual WebSearch stays available.
if [[ "$tool_lower" == "websearch" ]]; then
  exit 0
fi

# Only handle WebFetch / browser-oriented fetch tools.
if [[ "$tool_lower" != "webfetch" && "$tool_lower" != "web_fetch" ]]; then
  exit 0
fi

url=$(printf '%s' "$input" | jq -r '.tool_input.url // empty' 2>/dev/null || true)

# Detect whether agent-browser is installed (for guidance only — do not run it).
find_agent_browser() {
  local path
  path=$(bash -lc 'command -v agent-browser 2>/dev/null' 2>/dev/null || true)
  if [[ -n "$path" && -x "$path" ]]; then
    printf '%s' "$path"
    return 0
  fi
  local candidate
  for candidate in \
    "/usr/local/bin/agent-browser" \
    "/opt/homebrew/bin/agent-browser" \
    "${HOME}/.local/bin/agent-browser"
  do
    if [[ -x "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  if [[ -d "${HOME}/.nvm/versions/node" ]]; then
    local latest nvm_path
    latest=$(ls "${HOME}/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)
    nvm_path="${HOME}/.nvm/versions/node/${latest}/bin/agent-browser"
    if [[ -x "$nvm_path" ]]; then
      printf '%s' "$nvm_path"
      return 0
    fi
  fi
  return 1
}

AGENT_BROWSER=$(find_agent_browser 2>/dev/null || true)

url_note=""
if [[ -n "$url" ]]; then
  url_note=" Target URL was: ${url}."
fi

if [[ -n "$AGENT_BROWSER" ]]; then
  msg="WebFetch is redirected: do not use WebFetch for browser-oriented work. agent-browser is installed at ${AGENT_BROWSER}. Use an ordinary Bash tool call instead, for example:
  agent-browser open '<url>'
  agent-browser snapshot -i
  agent-browser close
Summarize findings in your own words. Never paste raw page HTML into privileged context.${url_note}"
else
  msg="WebFetch is redirected: do not use WebFetch for browser-oriented work. Install agent-browser, then use an ordinary Bash tool call:
  npm install -g agent-browser
  # or: npx skills add vercel-labs/agent-browser@agent-browser
  agent-browser open '<url>'
  agent-browser snapshot -i
  agent-browser close
Ordinary textual WebSearch remains available for simple queries. Never place raw page content into system/developer context.${url_note}"
fi

# Deny WebFetch with static guidance only — this surfaces as a normal tool
# failure / decision to the model, not as injected page content.
deny_permission "$msg"
