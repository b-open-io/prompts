#!/usr/bin/env bash
# Report the runtime facts a workflow canvas must not guess at: which harness is
# hosting this session, which other CLIs are reachable as shell-out lanes, which
# models each one actually offers, and which roster agents are installed.
#
# Emits JSON on stdout. Never fails the caller — an unreachable lane is reported
# as unavailable rather than raised, because "unavailable" is a fact the canvas
# needs to render, not an error to handle.
set -uo pipefail

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n'; }

# --- Top-level harness -------------------------------------------------------
# The host cannot be chosen; it is decided by how this session was invoked.
# Check Grok first: a Grok Build session exports GROK_AGENT=1 and may also
# inherit leftover CLAUDE_CODE_* variables from the user's shell.
harness="unknown"
if [[ -n "${GROK_AGENT:-}" || -n "${GROK_SANDBOX:-}" || -n "${GROK_HOME:-}" ]]; then
  harness="grok"
elif [[ -n "${CLAUDECODE:-}" || -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  harness="claude-code"
elif [[ -n "${CODEX_HOME:-}" || -n "${CODEX_SANDBOX:-}" ]]; then
  harness="codex"
fi

# --- Lane availability -------------------------------------------------------
lane_status() {
  local bin="$1"
  if ! command -v "$bin" >/dev/null 2>&1; then printf 'unavailable'; return; fi
  printf 'available'
}

claude_bin=$(lane_status claude)
codex_bin=$(lane_status codex)
grok_bin=$(lane_status grok)

# --- Models actually offered, not models we assume ---------------------------
# grok enumerates per authenticated account. Lines look like
# "  * grok-4.6 (default)" and "  - grok-4.5".
grok_models=""
if [[ "$grok_bin" == "available" ]]; then
  grok_models=$(grok models 2>/dev/null \
    | sed -n 's/^[[:space:]]*[*+-][[:space:]]*\([A-Za-z0-9._-]*\).*/\1/p' \
    | awk 'NF && !seen[$0]++' \
    | head -20 \
    | paste -sd, -)
fi

# codex has no enumeration command; the configured model is the truth on disk.
codex_model=""
if [[ -f "${CODEX_HOME:-$HOME/.codex}/config.toml" ]]; then
  codex_model=$(grep -m1 '^model *=' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null | sed 's/.*= *//; s/"//g')
fi
codex_effort=""
if [[ -f "${CODEX_HOME:-$HOME/.codex}/config.toml" ]]; then
  codex_effort=$(grep -m1 '^model_reasoning_effort *=' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null | sed 's/.*= *//; s/"//g')
fi

# --- Caps the canvas must honour --------------------------------------------
native_workflow="false"
live_children=6
agent_budget=0
case "$harness" in
  claude-code) native_workflow="true"; live_children=16; agent_budget=1000 ;;
  grok)        native_workflow="true"; live_children=32; agent_budget=128 ;;
  codex)       native_workflow="false"; live_children=6; agent_budget=0 ;;
esac

# --- Installed roster --------------------------------------------------------
# Agents are the palette. Read display_name so the canvas can show a person
# rather than a filename, and skip legacy caches so retired ids never appear.
roster_json="[]"
roster_json=$(
  python3 - "$HOME/.claude/plugins/cache" "$HOME/.grok/installed-plugins" <<'PY_INNER'
import json, os, re, sys

claude_cache = sys.argv[1]
grok_plugins = sys.argv[2]
latest = {}

def field(text, name):
    m = re.search(rf"^{name}:\s*(.+)$", text, re.M)
    return m.group(1).strip().strip('"') if m else ""

def add_agents(plugin_name, agents_dir):
    if not os.path.isdir(agents_dir):
        return
    for f in sorted(os.listdir(agents_dir)):
        if not f.endswith(".md"):
            continue
        path = os.path.join(agents_dir, f)
        try:
            text = open(path, encoding="utf-8").read(4000)
        except OSError:
            continue
        agent_id = f[:-3]
        key = f"{plugin_name}:{agent_id}"
        latest[key] = {
            "id": key,
            "display_name": field(text, "display_name") or agent_id,
            "summary": field(text, "description")[:110],
        }

if os.path.isdir(claude_cache):
    for owner in sorted(os.listdir(claude_cache)):
        owner_dir = os.path.join(claude_cache, owner)
        if not os.path.isdir(owner_dir):
            continue
        for plugin in sorted(os.listdir(owner_dir)):
            if plugin.startswith("bopen-"):
                continue
            plugin_dir = os.path.join(owner_dir, plugin)
            if not os.path.isdir(plugin_dir):
                continue
            versions = [v for v in os.listdir(plugin_dir)
                        if os.path.isdir(os.path.join(plugin_dir, v, "agents"))]
            if not versions:
                continue
            def key(v):
                return [int(n) for n in re.findall(r"\d+", v)] or [0]
            add_agents(plugin, os.path.join(plugin_dir, max(versions, key=key), "agents"))

if os.path.isdir(grok_plugins):
    for entry in sorted(os.listdir(grok_plugins)):
        root = os.path.join(grok_plugins, entry)
        if not os.path.isdir(root):
            continue
        name = entry
        manifest = os.path.join(root, ".claude-plugin", "plugin.json")
        if os.path.isfile(manifest):
            try:
                name = json.load(open(manifest, encoding="utf-8")).get("name") or entry
            except (OSError, json.JSONDecodeError):
                pass
        add_agents(name, os.path.join(root, "agents"))

print(json.dumps(list(latest.values())))
PY_INNER
)
[[ -z "$roster_json" ]] && roster_json="[]"

grok_models_json=$(printf '%s' "$grok_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')

cat <<JSON
{
  "harness": "$harness",
  "native_workflow": $native_workflow,
  "caps": {
    "live_children": $live_children,
    "agent_budget_default": $agent_budget
  },
  "lanes": {
    "claude": "$claude_bin",
    "codex": "$codex_bin",
    "grok": "$grok_bin"
  },
  "models": {
    "claude": ["opus", "sonnet", "haiku", "fable", "inherit"],
    "claude_effort": ["low", "medium", "high", "xhigh", "max"],
    "grok": [${grok_models_json}],
    "grok_effort": ["none", "minimal", "low", "medium", "high", "xhigh"],
    "codex": ["${codex_model:-unknown}"],
    "codex_effort": ["${codex_effort:-unknown}"]
  },
  "roster": $roster_json
}
JSON
