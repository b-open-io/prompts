#!/usr/bin/env bash
# Read-only OpenCode review. OpenCode has no read-only flag, and `opencode run --dir <worktree>`
# loads that worktree's own opencode.json(c), .opencode/ agents, tools, and plugins, so a change
# under review could grant itself edit or bash. This wrapper turns project config and plugins off,
# pins the reviewer agent inline, then asks OpenCode for the agent it actually resolves in that
# directory (`opencode debug agent`) and runs the review only when that agent is a primary agent
# that denies every tool by default and, after that deny, allows or asks for nothing but read, grep,
# glob, and list (MCP and custom tools never show up in `debug agent`, so wildcard grants are refused
# by rule, not by probing tool names). Only an approved review model at xhigh runs. Anything it
# cannot verify refuses the run.
set -euo pipefail
umask 077

usage() {
  echo "usage: $0 --dir DIR --model PROVIDER/MODEL --variant xhigh -- PROMPT" >&2
  echo "       $0 --check --dir DIR [--model PROVIDER/MODEL]" >&2
}

AGENT=bopen-review
check=0
dir=""
model=""
variant=""
prompt=""
have_prompt=0
while (($#)); do
  case "$1" in
    --check) check=1; shift ;;
    --dir) dir="${2:-}"; shift 2 ;;
    --model) model="${2:-}"; shift 2 ;;
    --variant) variant="${2:-}"; shift 2 ;;
    --) prompt="${2:-}"; have_prompt=1; shift $(($# < 2 ? $# : 2)); (($# == 0)) || { usage; exit 2; } ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done

[[ -n "$dir" && -d "$dir" ]] || { usage; exit 2; }
((check)) || [[ -n "$model" && $have_prompt == 1 ]] || { usage; exit 2; }
[[ -z "$model" || "$model" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._:@/-]+$ ]] || { echo "--model must be provider/model" >&2; exit 2; }
[[ -z "$variant" || "$variant" =~ ^[a-z]+$ ]] || { echo "--variant must be a plain name" >&2; exit 2; }
if [[ -n "$model" ]]; then
  # shellcheck source=model-policy.sh
  source "$(dirname "${BASH_SOURCE[0]}")/model-policy.sh"
  if why=$(bopen_off_policy "$model"); then
    echo "model $model is not allowed; $why" >&2; exit 3
  fi
  [[ "$model" =~ ^(openai|openrouter/openai)/gpt-6-(sol|astra)$ ]] \
    || { echo "model $model is not an approved review model; use openai/gpt-6-sol or openai/gpt-6-astra (or their openrouter/openai/ ids)" >&2; exit 3; }
fi
((check)) || [[ "$variant" == xhigh ]] || { echo "code review runs at --variant xhigh, not ${variant:-the default}" >&2; exit 3; }
command -v opencode >/dev/null 2>&1 || { echo "opencode is not installed" >&2; exit 3; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required to verify the reviewer" >&2; exit 3; }

unset OPENCODE_CONFIG OPENCODE_CONFIG_DIR OPENCODE_PERMISSION OPENCODE_TUI_CONFIG
export OPENCODE_DISABLE_PROJECT_CONFIG=1 OPENCODE_PURE=1 OPENCODE_DISABLE_CLAUDE_CODE=1
export OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1
export OPENCODE_CONFIG_CONTENT='{
  "lsp": false,
  "formatter": false,
  "agent": {
    "bopen-review": {
      "mode": "primary",
      "description": "b-open read-only reviewer",
      "permission": {
        "*": "deny",
        "read": {"*": "allow", "*.env": "deny", "*.env.*": "deny", "*.env.example": "allow"},
        "grep": "allow",
        "glob": "allow",
        "list": "allow",
        "edit": "deny",
        "bash": "deny",
        "task": "deny",
        "skill": "deny",
        "todowrite": "deny",
        "webfetch": "deny",
        "websearch": "deny",
        "codesearch": "deny",
        "lsp": "deny"
      }
    }
  }
}'

tmp=$(mktemp -d "${TMPDIR:-/tmp}/opencode-review.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
( cd "$dir" && opencode debug agent "$AGENT" ) >"$tmp/agent.json" 2>"$tmp/agent.err" \
  || { echo "opencode debug agent $AGENT failed in $dir, so the reviewer cannot be verified:" >&2; tail -n 5 "$tmp/agent.err" >&2; exit 3; }
( cd "$dir" && opencode debug config ) >"$tmp/config.json" 2>"$tmp/config.err" \
  || { echo "opencode debug config failed in $dir, so the reviewer cannot be verified:" >&2; tail -n 5 "$tmp/config.err" >&2; exit 3; }

python3 - "$AGENT" "$model" "$tmp/agent.json" "$tmp/config.json" <<'PY_VERIFY' || exit 3
import json, sys
from urllib.parse import urlparse

name, model, agent_path, config_path = sys.argv[1:]
READ = {"read", "grep", "glob", "list"}
HOSTS = {"openai": "openai.com", "anthropic": "anthropic.com", "openrouter": "openrouter.ai", "xai": "x.ai"}
PACKAGES = {"openai": "@ai-sdk/openai", "anthropic": "@ai-sdk/anthropic", "openrouter": "@openrouter/ai-sdk-provider", "xai": "@ai-sdk/xai"}


def refuse(reason):
    print("OpenCode reviewer refused: " + reason, file=sys.stderr)
    sys.exit(3)


def load(path, what):
    text = open(path, encoding="utf-8").read()
    start = text.find("{")
    try:
        value = json.loads(text[start:]) if start >= 0 else None
    except ValueError:
        value = None
    if not isinstance(value, dict):
        refuse("opencode debug %s did not print a JSON object" % what)
    return value


agent = load(agent_path, "agent")
if agent.get("name") != name:
    refuse("OpenCode resolved agent %r, not %s" % (agent.get("name"), name))
if agent.get("mode") not in ("primary", "all"):
    refuse("agent %s is mode %r; `opencode run --agent` falls back to the default agent for a subagent" % (name, agent.get("mode")))
rules = agent.get("permission")
if not isinstance(rules, list) or not all(isinstance(r, dict) and {"permission", "pattern", "action"} <= r.keys() for r in rules):
    refuse("agent %s has no resolved permission ruleset" % name)
floor = max((i for i, r in enumerate(rules) if (r["permission"], r["pattern"], r["action"]) == ("*", "*", "deny")), default=None)
if floor is None:
    refuse("agent %s does not deny every tool by default" % name)
for rule in rules[floor + 1:]:
    kind, pattern, action = rule["permission"], rule["pattern"], rule["action"]
    if action == "deny" or kind in READ:
        continue
    if (kind, action) == ("external_directory", "allow") and isinstance(pattern, str) and pattern.endswith("/opencode/tool-output/*"):
        continue
    refuse("agent %s %ss %s after its deny-all rule; only read, grep, glob, and list may be allowed (%s)" % (name, action, kind, json.dumps(rule)))
tools = agent.get("tools")
if not isinstance(tools, dict):
    refuse("agent %s has no resolved tool map" % name)
enabled = sorted(k for k, v in tools.items() if v is not False)
extra = [k for k in enabled if k not in READ]
if extra:
    refuse("agent %s can use %s, which are not read-only" % (name, ", ".join(extra)))

if model:
    config = load(config_path, "config")
    provider = model.split("/", 1)[0]
    entry = (config.get("provider") or {}).get(provider) if isinstance(config.get("provider"), dict) else None
    if isinstance(entry, dict) and provider in HOSTS:
        options = entry.get("options") if isinstance(entry.get("options"), dict) else {}
        for url in (options.get("baseURL"), entry.get("api")):
            if url is None:
                continue
            host = (urlparse(url).hostname or "").lower() if isinstance(url, str) else ""
            if not (host == HOSTS[provider] or host.endswith("." + HOSTS[provider])):
                refuse("provider %s is overridden to %s, not %s" % (provider, host or repr(url), HOSTS[provider]))
        if entry.get("npm") not in (None, PACKAGES[provider]):
            refuse("provider %s is served by package %r, not %s" % (provider, entry.get("npm"), PACKAGES[provider]))
PY_VERIFY

if ((check)); then
  echo "ok: $AGENT is read-only in $dir"
  exit 0
fi
exec opencode run --pure --agent "$AGENT" --model "$model" --dir "$dir" --variant "$variant" "$prompt"
