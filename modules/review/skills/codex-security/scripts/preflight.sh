#!/usr/bin/env bash
# Report what a Codex Security scan would find on this machine before spending
# anything: the host harness, a resolved CLI command, interpreter versions,
# whether credentials exist, and an output directory that is safely outside the
# scanned worktree.
#
# Deliberately offline and read-only. It never runs `npx @openai/codex-security`
# to probe for the package, because npx would download it — a preflight that
# installs software is not a preflight. Nothing here starts a scan.
#
# Emits JSON on stdout. Never fails the caller: an unmet requirement is a fact
# the agent needs to report, not an error to raise.
#
# Usage: bash preflight.sh [repo-path]

set -uo pipefail

target="${1:-$PWD}"

json_escape() {
  printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n\r\t'
}

# --- Host harness ------------------------------------------------------------
# Same markers as orchestra:visual-coordinator/scripts/detect-harness.sh. The
# CODEX_SECURITY_* variables are NOT checked: those are set by a running scan,
# so treating them as host signals would misreport any nested invocation.
harness="unknown"
if [[ -n "${CLAUDECODE:-}" || -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  harness="claude-code"
elif [[ -n "${CODEX_HOME:-}" || -n "${CODEX_SANDBOX:-}" ]]; then
  harness="codex"
elif [[ -n "${GROK_SANDBOX:-}" || -n "${GROK_HOME:-}" ]]; then
  harness="grok"
fi

# --- Repository --------------------------------------------------------------
repo_root=""
repo_name=""
branch=""
if command -v git >/dev/null 2>&1; then
  repo_root=$(git -C "$target" rev-parse --show-toplevel 2>/dev/null || true)
  if [[ -n "$repo_root" ]]; then
    repo_name=$(basename "$repo_root")
    branch=$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  fi
fi
scan_root="${repo_root:-$target}"

# --- Node --------------------------------------------------------------------
# Supported: 22.13.0+ within 22.x, 24.x, or 26.x. Anything else is reported
# rather than judged silently, so the agent can explain the mismatch.
node_version=""
node_ok="false"
if command -v node >/dev/null 2>&1; then
  node_version=$(node --version 2>/dev/null | sed 's/^v//')
  major="${node_version%%.*}"
  rest="${node_version#*.}"
  minor="${rest%%.*}"
  case "$major" in
    22) [[ "${minor:-0}" -ge 13 ]] && node_ok="true" ;;
    24|26) node_ok="true" ;;
  esac
fi

# --- Python ------------------------------------------------------------------
# Resolution order mirrors the CLI: --python / pythonPath (not visible here),
# then PYTHON, then python3/python on PATH.
python_bin=""
python_version=""
python_ok="false"
for candidate in "${PYTHON:-}" python3 python; do
  [[ -n "$candidate" ]] || continue
  command -v "$candidate" >/dev/null 2>&1 || continue
  python_bin=$(command -v "$candidate")
  python_version=$("$python_bin" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])' 2>/dev/null || true)
  break
done
if [[ -n "$python_version" ]]; then
  py_major="${python_version%%.*}"
  py_rest="${python_version#*.}"
  py_minor="${py_rest%%.*}"
  if [[ "${py_major:-0}" -eq 3 && "${py_minor:-0}" -ge 10 ]]; then
    python_ok="true"
  fi
fi
# Python 3.10 additionally needs tomli.
tomli_required="false"
tomli_present="unknown"
if [[ "${py_major:-0}" -eq 3 && "${py_minor:-0}" -eq 10 && -n "$python_bin" ]]; then
  tomli_required="true"
  if "$python_bin" -c 'import tomli' >/dev/null 2>&1; then
    tomli_present="true"
  else
    tomli_present="false"
  fi
fi

# --- CLI ---------------------------------------------------------------------
# Prefer an installed binary; fall back to the npx form and say that it will
# download on first use, so the cost is a decision rather than a surprise.
cli_source="npx"
cli_command="npx @openai/codex-security"
cli_installed="false"
if command -v codex-security >/dev/null 2>&1; then
  cli_source="path"
  cli_command="$(command -v codex-security)"
  cli_installed="true"
elif [[ -x "${scan_root}/node_modules/.bin/codex-security" ]]; then
  cli_source="local"
  cli_command="${scan_root}/node_modules/.bin/codex-security"
  cli_installed="true"
fi

# --- Credentials -------------------------------------------------------------
# Presence only. Values are never read, printed, or length-hinted.
auth_env=""
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  auth_env="OPENAI_API_KEY"
elif [[ -n "${CODEX_API_KEY:-}" ]]; then
  auth_env="CODEX_API_KEY"
fi
codex_home="${CODEX_HOME:-$HOME/.codex}"
signin_present="false"
[[ -f "${codex_home}/auth.json" ]] && signin_present="true"

auth_recommendation="login"
if [[ -n "$auth_env" && "$signin_present" == "true" ]]; then
  # Both exist: an interactive scan would stop to ask. Deciding up front keeps
  # an unattended run from hanging on a prompt.
  auth_recommendation="ambiguous-pass---auth"
elif [[ -n "$auth_env" ]]; then
  auth_recommendation="api-key"
elif [[ "$signin_present" == "true" ]]; then
  auth_recommendation="chatgpt"
fi

# --- Output directory --------------------------------------------------------
# Must be outside the scanned directory and any enclosing worktree, and private
# to the current user on macOS/Linux. Proposed, not created: creating it here
# would leave debris behind on a machine where no scan is ever run.
results_base="${CODEX_SECURITY_STATE_DIR:-$HOME/.codex-security/results}"
slug="${repo_name:-$(basename "$scan_root")}"
branch_slug=$(printf '%s' "${branch:-nobranch}" | tr '/ ' '--')
output_dir="${results_base}/${slug}-${branch_slug}"
output_exists="false"
[[ -d "$output_dir" ]] && output_exists="true"

output_inside_repo="false"
case "$output_dir/" in
  "$scan_root"/*) output_inside_repo="true" ;;
esac

ready="true"
[[ "$node_ok" == "true" ]] || ready="false"
[[ "$python_ok" == "true" ]] || ready="false"
[[ "$tomli_required" == "true" && "$tomli_present" != "true" ]] && ready="false"
[[ "$auth_recommendation" == "login" ]] && ready="false"

cat <<JSON
{
  "harness": "$(json_escape "$harness")",
  "repository": {
    "root": "$(json_escape "$scan_root")",
    "is_git": $([[ -n "$repo_root" ]] && echo true || echo false),
    "branch": "$(json_escape "$branch")"
  },
  "node": {
    "version": "$(json_escape "$node_version")",
    "supported": $node_ok,
    "requirement": "22.13+ (22.x), 24.x, or 26.x"
  },
  "python": {
    "path": "$(json_escape "$python_bin")",
    "version": "$(json_escape "$python_version")",
    "supported": $python_ok,
    "tomli_required": $tomli_required,
    "tomli_present": "$(json_escape "$tomli_present")",
    "requirement": "3.10+ (install tomli on 3.10)"
  },
  "cli": {
    "installed": $cli_installed,
    "source": "$(json_escape "$cli_source")",
    "command": "$(json_escape "$cli_command")",
    "note": "npx source downloads the package on first run"
  },
  "auth": {
    "env_var": "$(json_escape "$auth_env")",
    "signin_present": $signin_present,
    "recommendation": "$(json_escape "$auth_recommendation")",
    "codex_home": "$(json_escape "$codex_home")"
  },
  "output": {
    "suggested_dir": "$(json_escape "$output_dir")",
    "exists": $output_exists,
    "inside_repository": $output_inside_repo,
    "note": "must be outside the repository and any enclosing git worktree; chmod 700 on macOS/Linux; add --archive-existing when it already holds results"
  },
  "ready": $ready
}
JSON
