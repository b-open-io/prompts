#!/usr/bin/env bash
# Emit a persona-prefixed prompt for grok dispatches: strips an agent's
# frontmatter, keeps its system-prompt body, then appends the task text.
#
# Usage:
#   bash scripts/grok-persona.sh <agent-name> "task text"
#   bash scripts/grok-persona.sh <agent-name> <<< "task text"
#   echo "task text" | bash scripts/grok-persona.sh <agent-name>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/agents"

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <agent-name> [task text]" >&2
  echo "  (task text may also be piped or heredoc'd via stdin)" >&2
  exit 1
fi

AGENT_NAME="${1%.md}"
AGENT_FILE="$AGENTS_DIR/$AGENT_NAME.md"

if [ ! -f "$AGENT_FILE" ]; then
  echo "error: no agent named '$AGENT_NAME' at $AGENT_FILE" >&2
  echo "available agents:" >&2
  for f in "$AGENTS_DIR"/*.md; do
    name="$(basename "$f" .md)"
    echo "  $name" >&2
  done
  exit 1
fi

if [ $# -ge 2 ]; then
  TASK="$2"
else
  TASK="$(cat)"
fi

# Strip the first --- fence pair (YAML frontmatter); keep everything after
# the closing fence as the persona system prompt body.
PERSONA_BODY="$(awk '
  /^---$/ { fence++; next }
  fence >= 2 { print }
' "$AGENT_FILE")"

printf '%s\n' "$PERSONA_BODY"
printf '%s\n' "--- TASK (execute as the persona above) ---"
printf '%s\n' "$TASK"
