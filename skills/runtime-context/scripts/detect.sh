#!/usr/bin/env bash
# Detect the invoking host and report capabilities observed by this process.
# Host identity comes from an explicit harness marker or host-owned signals;
# command and filesystem checks describe what this process can actually use.

set -uo pipefail

working_dir="$(pwd)"
sandbox_id="${VERCEL_SANDBOX_ID:-}"

# The visual coordinator passes this marker because installed CLIs do not prove
# which host owns the current session. Keep an explicit unknown marker unknown.
runtime=""
if [[ -n "${BOPEN_HOST_HARNESS:-}" ]]; then
  case "$BOPEN_HOST_HARNESS" in
    claude-code|codex|grok|opencode|local|unknown) runtime="$BOPEN_HOST_HARNESS" ;;
    *) runtime="unknown" ;;
  esac
fi

# Vercel's sandbox marker identifies the execution host. Do not infer a
# sandbox from generic command availability or from the installed filesystem.
if [[ -z "$runtime" && ( -d "/vercel/sandbox" || -n "${VERCEL_SANDBOX_ID:-}" ) ]]; then
  runtime="sandbox"
  if [[ -z "$sandbox_id" ]]; then
    sandbox_id="$(basename /vercel/sandbox 2>/dev/null || true)"
  fi
fi

# These session markers identify a host without treating installed commands or
# configuration directories as proof. Conflicting host markers stay unknown.
if [[ -z "$runtime" ]]; then
  host_hits=()
  [[ -n "${CLAUDE_CODE:-}" || -n "${CLAUDE_SESSION_ID:-}" || -n "${CLAUDECODE:-}" ]] && host_hits+=(claude-code)
  [[ -n "${CODEX_THREAD_ID:-}" || -n "${CODEX_SESSION_ID:-}" ]] && host_hits+=(codex)
  if [[ "${#host_hits[@]}" -eq 1 ]]; then
    runtime="${host_hits[0]}"
  else
    runtime="unknown"
  fi
fi

has_bash=true
has_bun=false
has_node=false
bun_version=""
node_version=""
if command -v bun >/dev/null 2>&1; then
  has_bun=true
  bun_version="$(bun --version 2>/dev/null || true)"
fi
if command -v node >/dev/null 2>&1; then
  has_node=true
  node_version="$(node --version 2>/dev/null || true)"
fi

has_skills=false
skills_count=0
if [[ -d "$working_dir/skills" ]]; then
  has_skills=true
  if command -v find >/dev/null 2>&1 && command -v wc >/dev/null 2>&1 && command -v tr >/dev/null 2>&1; then
    skills_count="$(find "$working_dir/skills" -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')"
  fi
fi

# Report only observed capabilities. In particular, this shell process cannot
# see whether its parent exposed Skill(), browser, or visualization tools.
has_claude=false
has_codex=false
has_grok=false
has_opencode=false
command -v claude >/dev/null 2>&1 && has_claude=true
command -v codex >/dev/null 2>&1 && has_codex=true
command -v grok >/dev/null 2>&1 && has_grok=true
command -v opencode >/dev/null 2>&1 && has_opencode=true

json_escape() {
  local value="${1:-}"
  local escaped="" char code i
  local LC_ALL=C
  for ((i = 0; i < ${#value}; i++)); do
    char="${value:i:1}"
    case "$char" in
      $'\\') escaped+="\\\\" ;;
      '"') escaped+="\\\"" ;;
      $'\b') escaped+="\\b" ;;
      $'\f') escaped+="\\f" ;;
      $'\n') escaped+="\\n" ;;
      $'\r') escaped+="\\r" ;;
      $'\t') escaped+="\\t" ;;
      *)
        printf -v code '%d' "'$char"
        if ((code < 0x20)); then
          printf -v char '\\u%04x' "$code"
        fi
        escaped+="$char"
        ;;
    esac
  done
  printf '%s' "$escaped"
}

skills_count="${skills_count//[[:space:]]/}"
skills_count="${skills_count:-0}"
printf '{\n'
printf '  "runtime": "%s",\n' "$(json_escape "$runtime")"
printf '  "has_bash": %s,\n' "$has_bash"
printf '  "has_bun": %s,\n' "$has_bun"
printf '  "has_node": %s,\n' "$has_node"
printf '  "has_skills": %s,\n' "$has_skills"
printf '  "skills_count": %s,\n' "$skills_count"
printf '  "sandbox_id": "%s",\n' "$(json_escape "$sandbox_id")"
printf '  "working_dir": "%s",\n' "$(json_escape "$working_dir")"
printf '  "bun_version": "%s",\n' "$(json_escape "$bun_version")"
printf '  "node_version": "%s",\n' "$(json_escape "$node_version")"
printf '  "capabilities": {\n'
printf '    "bash": %s,\n' "$has_bash"
printf '    "bun": %s,\n' "$has_bun"
printf '    "node": %s,\n' "$has_node"
printf '    "skills_directory": %s,\n' "$has_skills"
printf '    "claude_cli": %s,\n' "$has_claude"
printf '    "codex_cli": %s,\n' "$has_codex"
printf '    "grok_cli": %s,\n' "$has_grok"
printf '    "opencode_cli": %s\n' "$has_opencode"
printf '  }\n}\n'
