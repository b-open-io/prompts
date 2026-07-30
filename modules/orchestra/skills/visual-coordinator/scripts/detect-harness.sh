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
# The host cannot be chosen; it is decided by how this session was invoked. Each
# harness exports a different marker.
harness="unknown"
if [[ -n "${CLAUDECODE:-}" || -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  harness="claude-code"
elif [[ -n "${CODEX_HOME:-}" || -n "${CODEX_SANDBOX:-}" ]]; then
  harness="codex"
elif [[ -n "${GROK_SANDBOX:-}" || -n "${GROK_HOME:-}" ]]; then
  harness="grok"
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
# grok enumerates per authenticated account, so ask rather than hardcode.
grok_models=""
if [[ "$grok_bin" == "available" ]]; then
  grok_models=$(grok models 2>/dev/null | sed -n 's/^[[:space:]]*\*[[:space:]]*\([a-zA-Z0-9._-]*\).*/\1/p' | head -20 | tr '\n' ',' | sed 's/,$//')
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

# --- Installed roster --------------------------------------------------------
# Agents are the palette. Read display_name so the canvas can show a person
# rather than a filename, and skip legacy caches so retired ids never appear.
roster_json="[]"
if [[ -d "$HOME/.claude/plugins/cache" ]]; then
  # Several versions of each plugin stay cached, so a naive scan lists every
  # agent once per installed version. Keep only the newest version per plugin,
  # and drop the pre-rename bopen-* caches whose ids no longer resolve.
  roster_json=$(
    python3 - "$HOME/.claude/plugins/cache" <<'PY_INNER'
import json, os, re, sys

root = sys.argv[1]
latest = {}
for owner in sorted(os.listdir(root)):
    owner_dir = os.path.join(root, owner)
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
        latest[plugin] = os.path.join(plugin_dir, max(versions, key=key), "agents")

def field(text, name):
    m = re.search(rf"^{name}:\s*(.+)$", text, re.M)
    return m.group(1).strip().strip('"') if m else ""

roster = []
for plugin, agents_dir in sorted(latest.items()):
    for f in sorted(os.listdir(agents_dir)):
        if not f.endswith(".md"):
            continue
        try:
            text = open(os.path.join(agents_dir, f), encoding="utf-8").read(4000)
        except OSError:
            continue
        agent_id = f[:-3]
        roster.append({
            "id": f"{plugin}:{agent_id}",
            "display_name": field(text, "display_name") or agent_id,
            "summary": field(text, "description")[:110],
        })
print(json.dumps(roster))
PY_INNER
  )
  [[ -z "$roster_json" ]] && roster_json="[]"
fi

cat <<JSON
{
  "harness": "$harness",
  "lanes": {
    "claude": "$claude_bin",
    "codex": "$codex_bin",
    "grok": "$grok_bin"
  },
  "models": {
    "claude": ["opus", "sonnet", "haiku", "fable", "inherit"],
    "claude_effort": ["low", "medium", "high", "xhigh", "max"],
    "grok": [$(printf '%s' "$grok_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')],
    "grok_effort": ["none", "minimal", "low", "medium", "high", "xhigh"],
    "codex": ["${codex_model:-unknown}"],
    "codex_effort": ["${codex_effort:-unknown}"]
  },
  "roster": $roster_json
}
JSON
