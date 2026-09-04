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
elif [[ -n "${OPENCODE:-}" || -n "${OPENCODE_PID:-}" ]]; then
  harness="opencode"
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
opencode_bin=$(lane_status opencode)

# --- Models actually offered, not models we assume ---------------------------
# grok enumerates per authenticated account plus quoted [model."id"] blocks.
# Lines look like "  * grok-4.6 (default)" and "  - gpt-5.6-sol".
grok_models=""
if [[ "$grok_bin" == "available" ]]; then
  grok_models=$(grok models 2>/dev/null \
    | sed -n 's/^[[:space:]]*[*+-][[:space:]]*\([A-Za-z0-9._-]*\).*/\1/p' \
    | awk 'NF && !seen[$0]++' \
    | head -40 \
    | paste -sd, -)
fi
# Merge quoted custom ids from config in case this process's grok models is stale.
if [[ -f "$HOME/.grok/config.toml" ]]; then
  extra=$(sed -n 's/^\[model\."\([^"]*\)"\].*/\1/p' "$HOME/.grok/config.toml" | tr '\n' ',')
  if [[ -n "$extra" ]]; then
    grok_models=$(printf '%s,%s' "$grok_models" "$extra" | tr ',' '\n' | awk 'NF && !seen[$0]++' | paste -sd, -)
  fi
fi

# codex has no enumeration command; the configured model is the truth on disk.
codex_model=""
if [[ -f "${CODEX_HOME:-$HOME/.codex}/config.toml" ]]; then
  codex_model=$(grep -m1 '^model *=' "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null | sed 's/.*= *//; s/"//g')
fi

# opencode enumerates per configured provider: `opencode models <provider>`.
# Without a provider arg the output shape varies, so report the configured
# default model from opencode.json plus a best-effort id list. Never fail.
opencode_model=""
for _cfg in "$PWD/opencode.json" "$HOME/.config/opencode/opencode.json"; do
  if [[ -f "$_cfg" ]]; then
    _m=$(grep -m1 '"model"' "$_cfg" 2>/dev/null | sed 's/.*: *//; s/"//g; s/,//g; s/ //g')
    if [[ -n "$_m" ]]; then opencode_model="$_m"; break; fi
  fi
done
unset _cfg _m
opencode_models=""
if [[ "$opencode_bin" == "available" ]]; then
  opencode_models=$(opencode models 2>/dev/null \
    | sed -n 's/^[[:space:]]*\([A-Za-z0-9._:\/-]*\).*/\1/p' \
    | awk 'NF && !seen[$0]++' \
    | head -40 \
    | paste -sd, -)
fi

# --- Caps the canvas must honour --------------------------------------------
native_workflow="false"
live_children=6
agent_budget=0
case "$harness" in
  claude-code) native_workflow="true"; live_children=16; agent_budget=1000 ;;
  grok)        native_workflow="true"; live_children=32; agent_budget=128 ;;
  codex)       native_workflow="false"; live_children=6; agent_budget=0 ;;
  opencode)    native_workflow="false"; live_children=6; agent_budget=0 ;;
esac

# --- Installed roster --------------------------------------------------------
# Agents are the palette. Read display_name so the canvas can show a person
# rather than a filename, and skip legacy caches so retired ids never appear.
roster_json="[]"
roster_json=$(
  python3 - "$HOME/.claude/plugins/cache" "$HOME/.grok/installed-plugins" \
    "${CODEX_HOME:-$HOME/.codex}/agents" "$PWD/.opencode/agents" \
    "$PWD/.opencode/agent" "$HOME/.config/opencode/agents" \
    "$HOME/.config/opencode/agent" <<'PY_INNER'
import json, os, re, sys

claude_cache = sys.argv[1]
grok_plugins = sys.argv[2]
codex_agents = sys.argv[3]
opencode_dirs = sys.argv[4:]
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

def add_flat_agents(prefix, agents_dir):
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
        key = f"{prefix}:{agent_id}"
        latest[key] = {
            "id": key,
            "display_name": field(text, "display_name") or field(text, "name") or agent_id,
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

add_flat_agents("codex", codex_agents)
for directory in opencode_dirs:
    add_flat_agents("opencode", directory)

print(json.dumps(list(latest.values())))
PY_INNER
)
[[ -z "$roster_json" ]] && roster_json="[]"

grok_models_json=$(printf '%s' "$grok_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')
codex_models_json=""
if [[ -n "$codex_model" ]]; then
  codex_models_json="\"$(json_escape "$codex_model")\""
fi
opencode_models_json=$(printf '%s' "$opencode_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')
opencode_default_json=""
if [[ -n "$opencode_model" ]]; then
  opencode_default_json="\"$(json_escape "$opencode_model")\""
else
  opencode_default_json="null"
fi

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
    "grok": "$grok_bin",
    "opencode": "$opencode_bin"
  },
  "models": {
    "claude": ["opus", "sonnet", "haiku", "fable", "inherit"],
    "claude_effort": ["low", "medium", "high", "xhigh", "max"],
    "grok": [${grok_models_json}],
    "grok_effort": ["none", "minimal", "low", "medium", "high", "xhigh"],
    "codex": [${codex_models_json}],
    "codex_effort": ["minimal", "low", "medium", "high", "xhigh"],
    "opencode": [${opencode_models_json}],
    "opencode_default": ${opencode_default_json}
  },
  "roster": $roster_json
}
JSON
