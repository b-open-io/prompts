#!/usr/bin/env bash
# Detect the current agent execution environment.
# Outputs a JSON object summarizing runtime, available tools, and key paths.

set -euo pipefail

runtime="unknown"
sandbox_id=""
has_bash=true  # If this script is running, bash exists
has_bun=false
has_node=false
working_dir="$(pwd)"

# Detect Vercel Sandbox
if [ -d "/vercel/sandbox" ] || [ -n "${VERCEL_SANDBOX_ID:-}" ]; then
  runtime="sandbox"
  sandbox_id="${VERCEL_SANDBOX_ID:-$(basename /vercel/sandbox 2>/dev/null || echo "")}"
# Detect Claude Code
elif [ -n "${CLAUDE_CODE:-}" ] || [ -n "${CLAUDE_SESSION_ID:-}" ]; then
  runtime="claude-code"
# Fallback: local dev
else
  runtime="local"
fi

# Check runtimes
if command -v bun >/dev/null 2>&1; then
  has_bun=true
  bun_version="$(bun --version 2>/dev/null || echo "unknown")"
else
  bun_version=""
fi

if command -v node >/dev/null 2>&1; then
  has_node=true
  node_version="$(node --version 2>/dev/null || echo "unknown")"
else
  node_version=""
fi

# Check for skills directory
has_skills=false
skills_count=0
if [ -d "./skills" ]; then
  has_skills=true
  skills_count=$(find ./skills -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
fi

# Output JSON
cat <<ENDJSON
{
  "runtime": "${runtime}",
  "has_bash": ${has_bash},
  "has_bun": ${has_bun},
  "has_node": ${has_node},
  "has_skills": ${has_skills},
  "skills_count": ${skills_count},
  "sandbox_id": "${sandbox_id}",
  "working_dir": "${working_dir}",
  "bun_version": "${bun_version}",
  "node_version": "${node_version}"
}
ENDJSON
