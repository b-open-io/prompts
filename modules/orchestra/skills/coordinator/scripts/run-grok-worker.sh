#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  echo "usage: $0 --auth grok.com|api --model ID --mode read|write --cwd DIR --prompt-file FILE --log FILE [--branch NAME --base-ref REF --ownership TEXT] [--clean-home] [--disable-subagents] [--tools CSV] [--max-turns N]" >&2
}

auth=""
model=""
mode=""
worker_cwd=""
prompt_file=""
log_file=""
clean_home=0
disable_subagents=0
tools=""
max_turns=20
branch=""
base_ref=""
ownership=""

while (($#)); do
  case "$1" in
    --auth) auth="$2"; shift 2 ;;
    --model) model="$2"; shift 2 ;;
    --mode) mode="$2"; shift 2 ;;
    --cwd) worker_cwd="$2"; shift 2 ;;
    --prompt-file) prompt_file="$2"; shift 2 ;;
    --log) log_file="$2"; shift 2 ;;
    --clean-home) clean_home=1; shift ;;
    --disable-subagents) disable_subagents=1; shift ;;
    --tools) tools="$2"; shift 2 ;;
    --max-turns) max_turns="$2"; shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    --base-ref) base_ref="$2"; shift 2 ;;
    --ownership) ownership="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac
done

[[ "$auth" == "grok.com" || "$auth" == "api" ]] || { usage; exit 2; }
[[ "$mode" == "read" || "$mode" == "write" ]] || { usage; exit 2; }
[[ -n "$model" && -d "$worker_cwd" && -r "$prompt_file" && -n "$log_file" ]] || { usage; exit 2; }
[[ "$max_turns" =~ ^[1-9][0-9]*$ ]] || { echo "--max-turns must be positive" >&2; exit 2; }
if [[ "$mode" == "write" ]]; then
  [[ -n "$branch" && -n "$base_ref" && -n "$ownership" ]] || { echo "write mode requires --branch, --base-ref, and --ownership" >&2; exit 2; }
fi
worker_cwd=$(cd "$worker_cwd" && pwd -P)
if [[ "$mode" == "write" ]]; then
  repo_root=$(git -C "$worker_cwd" rev-parse --show-toplevel 2>/dev/null) || { echo "write cwd is not a git worktree" >&2; exit 2; }
  repo_root=$(cd "$repo_root" && pwd -P)
  [[ "$worker_cwd" == "$repo_root" ]] || { echo "write cwd must be the prepared worktree root: $repo_root" >&2; exit 2; }
  actual_branch=$(git -C "$worker_cwd" symbolic-ref --quiet --short HEAD 2>/dev/null) || { echo "write worktree must be on a named branch" >&2; exit 2; }
  [[ "$actual_branch" == "$branch" ]] || { echo "prepared worktree branch mismatch: expected $branch, found $actual_branch" >&2; exit 2; }
  git -C "$worker_cwd" rev-parse --verify --quiet "${base_ref}^{commit}" >/dev/null || { echo "base ref does not resolve: $base_ref" >&2; exit 2; }
  git -C "$worker_cwd" merge-base --is-ancestor "$base_ref" HEAD || { echo "base ref is not an ancestor of the prepared worktree HEAD: $base_ref" >&2; exit 2; }
fi
command -v grok >/dev/null || { echo "grok is not installed" >&2; exit 1; }

real_grok_home="${GROK_HOME:-$HOME/.grok}"
grok_run_home="$real_grok_home"
grok_temp_home=""
dispatch_prompt=""
raw_inspect=""
raw_inspect_err=""
cleanup() {
  if [[ -n "$dispatch_prompt" && "$dispatch_prompt" != "$prompt_file" ]]; then
    rm -f -- "$dispatch_prompt"
  fi
  [[ -z "$raw_inspect" ]] || rm -f -- "$raw_inspect"
  [[ -z "$raw_inspect_err" ]] || rm -f -- "$raw_inspect_err"
  if [[ -n "$grok_temp_home" && -d "$grok_temp_home" && ! -L "$grok_temp_home" ]]; then
    case "$(basename "$grok_temp_home")" in
      grok-worker.*) rm -rf -- "$grok_temp_home" ;;
      *) echo "refusing to clean unexpected Grok temp path: $grok_temp_home" >&2 ;;
    esac
  fi
}
trap cleanup EXIT
if ((clean_home)); then
  grok_temp_home=$(mktemp -d -t grok-worker.XXXXXX)
  [[ -n "$grok_temp_home" && -d "$grok_temp_home" && ! -L "$grok_temp_home" ]] || { echo "could not create isolated Grok home" >&2; exit 1; }
  grok_run_home="$grok_temp_home"
  if [[ "$auth" == "grok.com" ]]; then
    [[ -r "$HOME/.grok/auth.json" ]] || { echo "grok.com auth file is unavailable" >&2; exit 1; }
    ln -s "$HOME/.grok/auth.json" "$grok_run_home/auth.json"
  fi
fi

preflight_log="${log_file}.preflight"
inspect_log="${log_file}.inspect.json"
if [[ "$auth" == "grok.com" ]]; then
  run=(env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$grok_run_home" GROK_SANDBOX=workspace)
  expected_auth="You are logged in with grok.com."
else
  run=(env GROK_HOME="$grok_run_home" GROK_SANDBOX=workspace)
  expected_auth="You are using XAI_API_KEY"
fi

"${run[@]}" grok models >"$preflight_log" 2>&1
grep -Fq "$expected_auth" "$preflight_log" || { echo "requested Grok auth lane was not confirmed; see $preflight_log" >&2; exit 1; }
awk -v wanted="$model" '{ for (i=1; i<=NF; i++) { token=$i; gsub(/[()*,]/, "", token); if (token==wanted) found=1 } } END { exit !found }' "$preflight_log" || { echo "model $model was not listed exactly; see $preflight_log" >&2; exit 1; }
raw_inspect=$(mktemp -t grok-inspect.XXXXXX)
raw_inspect_err=$(mktemp -t grok-inspect-error.XXXXXX)
if ! (cd "$worker_cwd" && "${run[@]}" grok --sandbox workspace inspect --json >"$raw_inspect" 2>"$raw_inspect_err"); then
  echo "Grok startup sandbox probe failed; raw output was discarded" >&2
  exit 1
fi
python3 - "$raw_inspect" "$inspect_log" "$worker_cwd" <<'PY'
import json
import os
import re
import sys

source, destination, expected_cwd = sys.argv[1:]
sensitive = re.compile(r"(?:api.?key|token|secret|password|credential|authorization|private.?key|wif|cookie)", re.I)

def clean(value):
    if isinstance(value, dict):
        secret_env = sensitive.search(str(value.get("name", ""))) is not None
        result = {}
        for key, item in value.items():
            if sensitive.search(str(key)) or (key == "value" and secret_env):
                result[key] = "<redacted>"
            else:
                result[key] = clean(item)
        return result
    if isinstance(value, list):
        return [clean(item) for item in value]
    if isinstance(value, str):
        value = re.sub(r"\b(?:gh[pousr]_[A-Za-z0-9_]+|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})\b", "<redacted>", value)
    return value

with open(source, encoding="utf-8") as handle:
    data = json.load(handle)
reported_cwd = data.get("cwd")
if not isinstance(reported_cwd, str) or os.path.realpath(reported_cwd) != os.path.realpath(expected_cwd):
    raise SystemExit(
        "Grok inspect cwd mismatch; refusing to dispatch outside the inspected worker directory"
    )
version = tuple(int(part) for part in str(data.get("grokVersion", "0.0.0")).split(".")[:3])
if version < (1, 0, 13):
    raise SystemExit("Grok 1.0.13 or newer is required for the workspace sandbox startup probe")
cleaned = clean(data)
cleaned["bopenSandboxProbe"] = {
    "requestedProfile": "workspace",
    "result": "grok inspect started successfully with --sandbox workspace",
    "effectiveContainment": "not exposed by Grok inspect; dispatch repeats the explicit profile",
}
with open(destination, "w", encoding="utf-8") as handle:
    json.dump(cleaned, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
rm -f -- "$raw_inspect"
raw_inspect=""
rm -f -- "$raw_inspect_err"
raw_inspect_err=""

dispatch_prompt="$prompt_file"
if [[ "$mode" == "write" ]]; then
  dispatch_prompt=$(mktemp -t grok-dispatch.XXXXXX)
  {
    printf '%s\n' "WORKTREE HANDOFF (mandatory):"
    printf '%s\n' "- You are already running inside a prepared isolated worktree."
    printf '%s\n' "- Worktree/repository root: $worker_cwd"
    printf '%s\n' "- Expected feature branch: $branch"
    printf '%s\n' "- Base ref: $base_ref"
    printf '%s\n' "- Your exclusive ownership: $ownership"
    printf '%s\n' "- Before editing, verify the current directory and branch. Stop and report if either differs."
    printf '%s\n' "- Treat the supplied cwd as the repository root for this bounded task."
    printf '%s\n' "- Do not create another worktree or invoke any harness --worktree option."
    printf '%s\n' "- Do not switch, create, or delete branches."
    printf '%s\n' "- Do not commit, push, merge, or clean up the worktree."
    printf '\n%s\n' "TASK SPECIFICATION:"
    sed -n '1,$p' "$prompt_file"
  } >"$dispatch_prompt"
fi

permission=plan
[[ "$mode" == "write" ]] && permission=acceptEdits
args=(grok --prompt-file "$dispatch_prompt" -m "$model" --permission-mode "$permission" --sandbox workspace --max-turns "$max_turns" --output-format plain --cwd "$worker_cwd")
((disable_subagents)) && args+=(--no-subagents)
[[ -n "$tools" ]] && args+=(--tools "$tools")

echo "Grok auth and model verified; workspace sandbox startup probe passed. Logs: $preflight_log, $inspect_log, $log_file" >&2
"${run[@]}" "${args[@]}" >"$log_file" 2>&1
