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
# The invoking host supplies this value. Do not scan every system process: an
# unrelated CLI is not evidence about this session, and process listing may be
# forbidden by the outer sandbox.
harness="${BOPEN_HOST_HARNESS:-unknown}"
case "$harness" in
  claude-code|grok|codex|opencode|unknown) ;;
  *) harness="unknown" ;;
esac

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
# grok enumerates per authenticated account plus registered quoted [model."id"]
# blocks. Lines look like "  * grok-4.7 (default)" and "  - gpt-6-sol".
# The listing is taken under the same auth lane run-grok-worker.sh will use
# (signed-in grok.com first, then XAI_API_KEY), and config.toml is never merged
# in: the wrapper's preflight accepts only ids this listing shows.
grok_models=""
grok_default=""
grok_auth=""
if [[ "$grok_bin" == "available" ]]; then
  grok_listing=$(env -u XAI_API_KEY -u GROK_API_KEY grok models 2>/dev/null || true)
  if grep -Fq "You are logged in with grok.com." <<<"$grok_listing"; then
    grok_auth="grok.com"
  else
    grok_listing=$(grok models 2>/dev/null || true)
    grep -Fq "You are using XAI_API_KEY" <<<"$grok_listing" && grok_auth="api"
  fi
  grok_models=$(printf '%s\n' "$grok_listing" \
    | sed -n 's/^[[:space:]]*[*+-][[:space:]]*\([A-Za-z0-9._/:@-]*\).*/\1/p' \
    | awk 'NF { id = tolower($0) } NF && (id !~ /(^|\/)grok-/ || id ~ /(^|\/)grok-4\.7$/) && !seen[$0]++' \
    | head -40 \
    | paste -sd, -)
  grok_default=$(printf '%s\n' "$grok_listing" \
    | sed -n 's/^[[:space:]]*[*+-][[:space:]]*\([A-Za-z0-9._/:@-]*\).*(default).*/\1/p' \
    | head -1)
fi
# A custom Grok id (for example gpt-6-sol) is served from its [model."id"] base_url, not
# necessarily by xAI. Map each listed custom id to the provider behind that URL so exports
# report where content goes; ids without a recognizable base_url stay unresolved. Each id's
# explicit `model = "..."` is reported too, so an xAI-backed alias is held to the grok-4.7 pin;
# an entry without one is never assumed to serve its own id.
grok_model_providers_json="{}"
grok_model_targets_json="{}"
grok_config="${GROK_HOME:-$HOME/.grok}/config.toml"
if [[ -n "$grok_models" && -f "$grok_config" ]]; then
  grok_alias_json=$(python3 - "$grok_config" "$grok_models" <<'PY_GROK_PROVIDERS' 2>/dev/null || printf '{}\n{}\n'
import json, re, sys
from urllib.parse import urlparse
try:
    import tomllib
except ModuleNotFoundError:
    try:
        import tomli as tomllib
    except ModuleNotFoundError:
        # Without a real TOML parser no alias is resolved, so validation rejects every custom id.
        print("{}\n{}")
        sys.exit(0)
path, listed = sys.argv[1], [item for item in sys.argv[2].split(",") if item]
known = (("openai.com", "openai"), ("x.ai", "xai"), ("anthropic.com", "anthropic"), ("openrouter.ai", "openrouter"))
try:
    with open(path, "rb") as handle:
        tables = tomllib.load(handle).get("model", {})
except (OSError, ValueError):
    tables = {}
entries = {key.lower(): value for key, value in tables.items() if isinstance(value, dict)} if isinstance(tables, dict) else {}
providers, targets = {}, {}
for model_id in listed:
    entry = entries.get(model_id.lower())
    if entry is None:
        continue
    target = entry.get("model")
    if isinstance(target, str) and re.fullmatch(r"[A-Za-z0-9._/:@-]+", target):
        targets[model_id] = target
    base_url = entry.get("base_url")
    if isinstance(base_url, str):
        host = (urlparse(base_url).hostname or "").lower()
        label = next((name for suffix, name in known if host == suffix or host.endswith("." + suffix)), host)
        if re.fullmatch(r"[a-z0-9.-]+", label or ""):
            providers[model_id] = label
print(json.dumps(providers))
print(json.dumps(targets))
PY_GROK_PROVIDERS
)
  grok_model_providers_json=$(printf '%s\n' "$grok_alias_json" | sed -n 1p)
  grok_model_targets_json=$(printf '%s\n' "$grok_alias_json" | sed -n 2p)
  [[ -n "$grok_model_providers_json" ]] || grok_model_providers_json="{}"
  [[ -n "$grok_model_targets_json" ]] || grok_model_targets_json="{}"
fi

# Codex has no enumeration command. Its account-scoped model cache is the best
# local source of truth, with the configured model kept first as a fallback.
codex_model=""
codex_root="${CODEX_HOME:-$HOME/.codex}"
if [[ -f "$codex_root/config.toml" ]]; then
  codex_model=$(grep -m1 '^model *=' "$codex_root/config.toml" 2>/dev/null | sed 's/.*= *//; s/"//g')
fi
codex_models="$codex_model"
if [[ -f "$codex_root/models_cache.json" ]]; then
  cached_codex_models=$(python3 - "$codex_root/models_cache.json" <<'PY_CODEX_MODELS'
import json, sys
try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
except (OSError, json.JSONDecodeError, TypeError):
    data = {}
for model in data.get("models", []):
    if isinstance(model, dict) and model.get("visibility") != "hide":
        slug = model.get("slug")
        if isinstance(slug, str) and slug:
            print(slug)
PY_CODEX_MODELS
)
  codex_models=$(printf '%s\n%s\n' "$codex_models" "$cached_codex_models" \
    | awk 'NF && !seen[$0]++' | head -40 | paste -sd, -)
fi

# opencode enumerates per configured provider: `opencode models <provider>`.
# Provider IDs come from the config's provider map and the configured model;
# only use the unscoped command when no provider can be discovered.
opencode_model=""
opencode_providers=""
rank_opencode_models() {
  python3 -c '
import re, sys
default = sys.argv[1]
preferred = {
    "claude-opus-5-5": 1,
    "gpt-6-sol": 1,
    "muse-spark-1.3-contributor-free": 2,
    "grok-4.7": 3,
}
seen = set()
models = []
for index, raw in enumerate(sys.stdin):
    model = raw.strip()
    if not re.fullmatch(r"[A-Za-z0-9._-]+/[A-Za-z0-9._:@/-]+", model) or model in seen:
        continue
    seen.add(model)
    suffix = model.rsplit("/", 1)[-1]
    rank = 0 if model == default else preferred.get(suffix, 10 if suffix.endswith("-free") else 20)
    models.append((rank, index, model))
for _, _, model in sorted(models)[:80]:
    print(model)
' "$1"
}
opencode_config_info() {
  python3 - "$1" <<'PY_OPENCODE_CONFIG'
import json, re, sys

try:
    data = json.load(open(sys.argv[1], encoding="utf-8"))
except (OSError, TypeError, ValueError):
    data = {}

if isinstance(data, dict):
    model = data.get("model")
    if isinstance(model, str) and model:
        print("model\t" + model)
    providers = data.get("provider")
    if isinstance(providers, dict):
        for provider in providers:
            if isinstance(provider, str) and re.fullmatch(r"[A-Za-z0-9._-]+", provider):
                print("provider\t" + provider)
PY_OPENCODE_CONFIG
}
for _cfg in "$PWD/opencode.json" "$HOME/.config/opencode/opencode.json"; do
  if [[ -f "$_cfg" ]]; then
    while IFS=$'\t' read -r _kind _value; do
      case "$_kind" in
        model) [[ -n "$opencode_model" ]] && continue; opencode_model="$_value" ;;
        provider) opencode_providers=$(printf '%s\n%s' "$opencode_providers" "$_value") ;;
      esac
    done < <(opencode_config_info "$_cfg")
  fi
done
if [[ "$opencode_model" == */* ]]; then
  opencode_providers=$(printf '%s\n%s' "$opencode_providers" "${opencode_model%%/*}")
fi
opencode_providers=$(printf '%s\n' "$opencode_providers" \
  | sed -n '/^[A-Za-z0-9._-]*$/p' \
  | awk 'NF && !seen[$0]++' \
  | head -24)
unset _cfg _kind _value
opencode_models=""
# OpenCode writes its runtime database and logs below XDG_DATA_HOME even for a
# read-only inventory query. The host may deliberately make the user's normal
# data directory read-only (for example, a Codex worker sandbox), so give this
# short-lived probe an isolated writable data home. Leave XDG_CONFIG_HOME and
# HOME alone: OpenCode still reads the user's configured providers and models,
# while the temporary directory is removed when this detector exits.
opencode_data_home=""
if [[ "$opencode_bin" == "available" ]]; then
  opencode_data_home=$(mktemp -d "${TMPDIR:-/tmp}/bopen-opencode-data.XXXXXX" 2>/dev/null || true)
  if [[ -n "$opencode_data_home" ]]; then
    trap '[[ -n "${opencode_data_home:-}" ]] && rm -rf -- "$opencode_data_home"' EXIT
  fi
fi
run_opencode_models() {
  if [[ -n "$opencode_data_home" ]]; then
    XDG_DATA_HOME="$opencode_data_home" opencode models "$@"
  else
    opencode models "$@"
  fi
}
if [[ "$opencode_bin" == "available" ]]; then
  if [[ -n "$opencode_providers" ]]; then
    while IFS= read -r _provider; do
      [[ -n "$_provider" ]] || continue
      opencode_models=$(printf '%s\n%s' "$opencode_models" \
        "$(run_opencode_models "$_provider" 2>/dev/null \
          | awk -v provider="$_provider" '
            {
              token = $1
              if (token ~ /^[*+-]$/) token = $2
              sub(/^[*+-][[:space:]]*/, "", token)
              if (token ~ /^[A-Za-z0-9._-]+\/[A-Za-z0-9._:@\/-]+$/) print token
              else if (token ~ /^[A-Za-z0-9._:@-]+$/ && token !~ /^(Error|Unknown|Unexpected|Models|model)$/) print provider "/" token
            }' \
          | head -200)")
    done <<< "$opencode_providers"
  else
    # No local provider IDs: retain a bounded compatibility fallback for older
    # CLIs whose unscoped command is the only available inventory source.
    opencode_models=$(run_opencode_models 2>/dev/null \
      | awk '{ token=$1; if (token ~ /^[A-Za-z0-9._-]+\/[A-Za-z0-9._:@\/-]+$/) print token }' \
      | head -1200)
  fi
  opencode_models=$(printf '%s\n' "$opencode_models" \
    | rank_opencode_models "$opencode_model" \
    | paste -sd, -)
fi

# --- Caps the canvas must honour --------------------------------------------
native_workflow="false"
live_children="null"
agent_budget=0
case "$harness" in
  claude-code) native_workflow="true"; live_children=16; agent_budget=1000 ;;
  grok)        native_workflow="true"; live_children=32; agent_budget=128 ;;
  codex)       native_workflow="false"; live_children="null"; agent_budget=0 ;;
  opencode)    native_workflow="false"; live_children="null"; agent_budget=0 ;;
esac

# Grok workers are allowed only when the operator declares usage-credit pressure.
credit_pressure="false"
case "${BOPEN_USAGE_CREDIT_PRESSURE:-}" in
  1|true|TRUE|yes|YES) credit_pressure="true" ;;
esac

# --- Installed roster --------------------------------------------------------
# Agents are the palette. Read display_name so the canvas can show a person
# rather than a filename, and skip legacy caches so retired ids never appear.
roster_json="[]"
roster_json=$(
  python3 - "$HOME/.claude/plugins/cache" "$HOME/.grok/installed-plugins" "$PWD/.opencode/agent" "$PWD/.opencode/agents" "$HOME/.config/opencode/agent" "$HOME/.config/opencode/agents" "${CODEX_HOME:-$HOME/.codex}/agents" <<'PY_INNER'
import json, os, re, sys
try:
    import tomllib
except ImportError:
    tomllib = None

claude_cache = sys.argv[1]
grok_plugins = sys.argv[2]
opencode_dirs = sys.argv[3:7]
codex_agents = sys.argv[7]
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

def add_opencode(agents_dir):
    if not os.path.isdir(agents_dir):
        return
    for f in sorted(os.listdir(agents_dir)):
        if not f.endswith(".md"):
            continue
        path = os.path.join(agents_dir, f)
        try:
            text = open(path, encoding="utf-8").read(8000)
        except OSError:
            continue
        agent_id = f[:-3]
        front = text.split("---", 2)[1] if text.startswith("---") and "---" in text[3:] else ""
        display = field(front, "display_name") or field(front, "name") or agent_id
        latest["opencode:" + agent_id] = {"id":"opencode:" + agent_id, "display_name":display, "summary":field(front, "description")[:110]}

def add_codex(agents_dir):
    if not tomllib or not os.path.isdir(agents_dir):
        return
    for f in sorted(os.listdir(agents_dir)):
        if not f.endswith(".toml"):
            continue
        try:
            data = tomllib.loads(open(os.path.join(agents_dir, f), encoding="utf-8").read())
        except (OSError, ValueError, TypeError):
            continue
        agent_id = str(data.get("name") or f[:-5])
        latest["codex:" + agent_id] = {"id":"codex:" + agent_id, "display_name":agent_id, "summary":str(data.get("description") or "")[:110]}

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

for directory in opencode_dirs:
    add_opencode(directory)
add_codex(codex_agents)

print(json.dumps(list(latest.values())))
PY_INNER
)
[[ -z "$roster_json" ]] && roster_json="[]"

grok_models_json=$(printf '%s' "$grok_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')
codex_models_json=$(printf '%s' "$codex_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')
opencode_models_json=$(printf '%s' "$opencode_models" | awk -F, '{for(i=1;i<=NF;i++){if($i!=""){printf "%s\"%s\"", (i>1?",":""), $i}}}')
opencode_default_json=""
if [[ -n "$opencode_model" ]]; then
  opencode_default_json="\"$(json_escape "$opencode_model")\""
else
  opencode_default_json="null"
fi
codex_default_json="null"
[[ -n "$codex_model" ]] && codex_default_json="\"$(json_escape "$codex_model")\""
grok_default_json="null"
[[ -n "$grok_default" ]] && grok_default_json="\"$(json_escape "$grok_default")\""
grok_auth_json="null"
[[ -n "$grok_auth" ]] && grok_auth_json="\"$grok_auth\""

# Grok-lane exports call the orchestra wrapper by absolute path, so resolve the installed copy.
grok_worker_json="null"
grok_worker="${BOPEN_GROK_WORKER:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../coordinator/scripts" 2>/dev/null && pwd -P)/run-grok-worker.sh}"
if [[ -f "$grok_worker" && "$grok_worker" == /* ]]; then
  grok_worker_json="\"$(json_escape "$grok_worker")\""
fi

# The Claude list is the CLI's static alias set, not an account check: the claude CLI has no
# offline way to prove the signed-in account can run claude-opus-5-5, and a probe call would
# spend a network request on every detect. lane_access marks it unverified; a failed Opus
# dispatch is the evidence, reported as an unavailable lane.
cat <<JSON
{
  "harness": "$harness",
  "native_workflow": $native_workflow,
  "credit_pressure": $credit_pressure,
  "grok_worker": $grok_worker_json,
  "grok_auth": $grok_auth_json,
  "grok_model_providers": $grok_model_providers_json,
  "grok_model_targets": $grok_model_targets_json,
  "caps": {
    "live_children": $live_children,
    "agent_budget_default": $agent_budget
  },
  "lane_access": {
    "claude": "unverified"
  },
  "lanes": {
    "claude": "$claude_bin",
    "codex": "$codex_bin",
    "grok": "$grok_bin",
    "opencode": "$opencode_bin"
  },
  "models": {
    "claude": ["claude-opus-5-5", "opus", "sonnet", "haiku", "inherit"],
    "claude_effort": ["low", "medium", "high", "xhigh", "max"],
    "grok": [${grok_models_json}],
    "grok_effort": ["none", "minimal", "low", "medium", "high", "xhigh"],
    "grok_default": ${grok_default_json},
    "codex": [${codex_models_json}],
    "codex_effort": ["minimal", "low", "medium", "high", "xhigh"],
    "codex_default": ${codex_default_json},
    "opencode": [${opencode_models_json}],
    "opencode_default": ${opencode_default_json}
  },
  "roster": $roster_json
}
JSON
