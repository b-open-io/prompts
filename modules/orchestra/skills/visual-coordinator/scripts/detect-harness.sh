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
if [[ -n "$grok_models$grok_default" && -f "$grok_config" ]]; then
  # The default is resolved too: a qualified default (xai/grok-4.6) is an alias like any other.
  grok_alias_json=$(python3 - "$grok_config" "$grok_models,$grok_default" <<'PY_GROK_PROVIDERS' 2>/dev/null || printf '{}\n{}\n'
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
# OpenCode reads opencode.json or opencode.jsonc (fresh installs write JSONC) from the project,
# its .opencode/ directory, and the global config. Each provider that overrides its endpoint
# (`options.baseURL`, `api`) or its SDK package (`npm`) is reported with the host it really
# reaches, so the canvas can refuse an openai/… or anthropic/… id served somewhere else. A
# config that does not parse is reported as the `*` provider, which makes every host unverified.
opencode_config_info() {
  python3 - "$@" <<'PY_OPENCODE_CONFIG'
import json, os, re, sys
from urllib.parse import urlparse

HOSTS = {"openai": "openai.com", "anthropic": "anthropic.com", "openrouter": "openrouter.ai", "xai": "x.ai"}
PACKAGES = {"openai": "@ai-sdk/openai", "anthropic": "@ai-sdk/anthropic", "openrouter": "@openrouter/ai-sdk-provider", "xai": "@ai-sdk/xai"}


def jsonc(text):
    """Parse JSON with // and /* */ comments and trailing commas, as OpenCode accepts."""
    out, i, n = [], 0, len(text)
    while i < n:
        if text[i] == '"':
            j = i + 1
            while j < n and text[j] != '"':
                j += 2 if text[j] == "\\" else 1
            if j >= n:
                raise ValueError("unterminated string")
            out.append(text[i:j + 1])
            i = j + 1
        elif text.startswith("//", i):
            j = text.find("\n", i)
            i = n if j < 0 else j
        elif text.startswith("/*", i):
            j = text.find("*/", i + 2)
            if j < 0:
                raise ValueError("unterminated comment")
            i = j + 2
        elif text[i] == ",":
            rest = re.match(r"\s*", text[i + 1:])
            k = i + 1 + rest.end()
            if k < n and text[k] in "}]":
                i += 1
                continue
            out.append(",")
            i += 1
        else:
            out.append(text[i])
            i += 1
    return json.loads("".join(out))


def official(provider, host):
    base = HOSTS.get(provider)
    return base is not None and (host == base or host.endswith("." + base))


hosts = {}
for path in sys.argv[1:]:
    if not os.path.isfile(path):
        continue
    try:
        with open(path, encoding="utf-8") as handle:
            data = jsonc(handle.read())
    except (OSError, ValueError):
        hosts["*"] = "unparseable " + path
        continue
    if not isinstance(data, dict):
        hosts["*"] = "unparseable " + path
        continue
    model = data.get("model")
    if isinstance(model, str) and model:
        print("model\t" + model)
    providers = data.get("provider")
    if not isinstance(providers, dict):
        continue
    for provider, entry in providers.items():
        if not isinstance(provider, str) or not re.fullmatch(r"[A-Za-z0-9._-]+", provider):
            continue
        print("provider\t" + provider)
        if not isinstance(entry, dict):
            continue
        options = entry.get("options") if isinstance(entry.get("options"), dict) else {}
        found = []
        for url in (options.get("baseURL"), entry.get("api")):
            if url is not None:
                found.append((urlparse(url).hostname or "").lower() if isinstance(url, str) else "")
        if entry.get("npm") is not None and entry.get("npm") != PACKAGES.get(provider):
            found.append("npm:" + str(entry.get("npm")))
        for host in found:
            host = host if re.fullmatch(r"[A-Za-z0-9.:@/_-]+", host or "") else "unverified"
            if provider not in hosts or official(provider, hosts[provider]):
                hosts[provider] = host
for provider, host in hosts.items():
    print("host\t%s\t%s" % (provider, host))
PY_OPENCODE_CONFIG
}
opencode_hosts=""
_oc_global="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
while IFS=$'\t' read -r _kind _value _extra; do
  case "$_kind" in
    model) [[ -n "$opencode_model" ]] && continue; opencode_model="$_value" ;;
    provider) opencode_providers=$(printf '%s\n%s' "$opencode_providers" "$_value") ;;
    host) opencode_hosts=$(printf '%s\n%s\t%s' "$opencode_hosts" "$_value" "$_extra") ;;
  esac
done < <(opencode_config_info "$PWD/opencode.jsonc" "$PWD/opencode.json" "$PWD/.opencode/opencode.jsonc" "$PWD/.opencode/opencode.json" \
  "$_oc_global/opencode.jsonc" "$_oc_global/opencode.json" "$_oc_global/config.json")
unset _oc_global _extra
opencode_hosts_json=$(printf '%s\n' "$opencode_hosts" | python3 -c '
import json, sys
out = {}
for line in sys.stdin:
    parts = line.rstrip("\n").split("\t")
    if len(parts) == 2 and parts[0] not in out:
        out[parts[0]] = parts[1]
print(json.dumps(out))')
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

# OpenCode has no read-only CLI flag, and `opencode run --dir <worktree>` loads that worktree's
# own config, so an OpenCode review exports only through run-opencode-review.sh. At dispatch it
# turns project config and plugins off, pins its reviewer agent inline, and checks the agent
# OpenCode resolves inside the worktree before it runs. Here it is checked once against the
# current directory, so a host whose OpenCode cannot prove a read-only primary agent reports the
# problem instead of staffing the reviewer.
opencode_reviewer_json="null"
opencode_read_only_problem_json="null"
opencode_reviewer="${BOPEN_OPENCODE_REVIEWER:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../coordinator/scripts" 2>/dev/null && pwd -P)/run-opencode-review.sh}"
if [[ "$opencode_bin" != "available" ]]; then
  :
elif [[ ! -f "$opencode_reviewer" || "$opencode_reviewer" != /* ]]; then
  opencode_read_only_problem_json="\"run-opencode-review.sh was not found beside the orchestra coordinator\""
elif _ro=$(bash "$opencode_reviewer" --check --dir "$PWD" 2>&1); then
  opencode_reviewer_json="\"$(json_escape "$opencode_reviewer")\""
else
  opencode_read_only_problem_json="\"$(json_escape "$(printf '%s\n' "$_ro" | head -n 1)")\""
fi
unset _ro

# The Claude list is the CLI's static alias set, not an account check: the claude CLI has no
# offline way to prove the signed-in account can run claude-opus-5-5, and a probe call would
# spend a network request on every detect. lane_access marks it unverified; a failed Opus
# dispatch is the evidence, reported as an unavailable lane. The graph treats a lane missing
# from lane_access as unverified, so every lane is reported: Codex is verified only by
# `codex login status`, Grok only by a signed-in listing, OpenCode only by a provider listing.
codex_access="unverified"
[[ "$codex_bin" == "available" ]] && codex login status >/dev/null 2>&1 && codex_access="verified"
grok_access="unverified"
[[ -n "$grok_auth" ]] && grok_access="verified"
opencode_access="unverified"
[[ -n "$opencode_models_json" ]] && opencode_access="verified"
cat <<JSON
{
  "harness": "$harness",
  "native_workflow": $native_workflow,
  "credit_pressure": $credit_pressure,
  "grok_worker": $grok_worker_json,
  "grok_auth": $grok_auth_json,
  "grok_model_providers": $grok_model_providers_json,
  "grok_model_targets": $grok_model_targets_json,
  "opencode_reviewer": $opencode_reviewer_json,
  "opencode_provider_hosts": $opencode_hosts_json,
  "opencode_read_only_problem": $opencode_read_only_problem_json,
  "caps": {
    "live_children": $live_children,
    "agent_budget_default": $agent_budget
  },
  "lane_access": {
    "claude": "unverified",
    "codex": "$codex_access",
    "grok": "$grok_access",
    "opencode": "$opencode_access"
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
