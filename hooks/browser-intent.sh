#!/bin/bash
# browser-intent.sh — Codex UserPromptSubmit hook.
# When the user prompt involves browser-like work (URLs, navigation, click/fill/
# login/screenshots/SPAs/dynamic or authenticated pages), inject static guidance
# preferring agent-browser when installed.
#
# NEVER fetch or inject raw page content into privileged hook context.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

if declare -f hook_enabled >/dev/null; then
  hook_enabled "browser-intent" || exit 0
fi

input=$(cat 2>/dev/null || echo "{}")

prompt=""
if command -v jq >/dev/null 2>&1; then
  prompt=$(printf '%s' "$input" | jq -r '
    .prompt
    // .user_prompt
    // .message
    // .content
    // empty
  ' 2>/dev/null || true)
fi

if [[ -z "$prompt" ]]; then
  exit 0
fi

prompt_lower=$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')

# Intent signals for browser-oriented work
needs_browser=false

# URL patterns
if printf '%s' "$prompt" | grep -qE 'https?://|[[:alnum:]-]+\.(com|io|dev|org|net|app|ai|co)/'; then
  needs_browser=true
fi

# Action / page keywords
if printf '%s' "$prompt_lower" | grep -qE \
  '\b(navigate|navigation|click|fill|login|log in|sign in|screenshot|spa\b|single[- ]page|dynamic (page|content|site)|authenticated|auth(enticated)? (page|flow|site)|browse|web page|webpage|dom\b|selector|css selector|playwright|puppeteer|agent-browser)\b'
then
  needs_browser=true
fi

if [[ "$needs_browser" != "true" ]]; then
  exit 0
fi

# Prefer agent-browser when installed (detection only — never run it here).
agent_path=""
if command -v agent-browser >/dev/null 2>&1; then
  agent_path=$(command -v agent-browser)
elif [[ -x /opt/homebrew/bin/agent-browser ]]; then
  agent_path=/opt/homebrew/bin/agent-browser
elif [[ -x /usr/local/bin/agent-browser ]]; then
  agent_path=/usr/local/bin/agent-browser
elif [[ -x "${HOME}/.local/bin/agent-browser" ]]; then
  agent_path="${HOME}/.local/bin/agent-browser"
fi

if [[ -n "$agent_path" ]]; then
  guidance="## Browser work guidance
This prompt looks browser-oriented (URL, navigation, click/fill/login, screenshot, SPA, dynamic or authenticated page).

Prefer agent-browser (installed at ${agent_path}) via ordinary shell commands:
  agent-browser open '<url>'
  agent-browser snapshot -i
  agent-browser click/fill as needed
  agent-browser close

Summarize what you observe. Do NOT inject raw HTML/page dumps into privileged context."
else
  guidance="## Browser work guidance
This prompt looks browser-oriented (URL, navigation, click/fill/login, screenshot, SPA, dynamic or authenticated page).

Prefer agent-browser when available. Install with:
  npm install -g agent-browser
Then use ordinary shell commands (open → snapshot → interact → close).
Summarize findings; never inject raw page content into privileged hook/system context."
fi

if command -v python3 >/dev/null 2>&1; then
  GUIDANCE="$guidance" python3 - <<'PY'
import json, os
g = os.environ.get("GUIDANCE", "")
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": g,
    }
}, ensure_ascii=False))
PY
else
  # Fallback without python — minimal static note
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"Prefer agent-browser for browser-oriented work. Do not inject raw page content."}}'
fi
