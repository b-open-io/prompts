#!/bin/bash
# session-context.sh — SessionStart hook that injects repo context into Claude's memory.
# Based on disler's additionalContext injection pattern.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO_ROOT" || exit 0

# Git context
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
recent_commits=$(git log --oneline -3 2>/dev/null | sed 's/"/\\"/g' | awk '{printf "  - %s\\n", $0}')
dirty_count=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# Plugin inventory
agent_count=$(find agents -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
skill_count=$(find skills -maxdepth 2 -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
command_count=$(find commands -maxdepth 2 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
hook_count=$(find hooks -maxdepth 1 -name "*.sh" 2>/dev/null | wc -l | tr -d ' ')

# Recent changes (filenames only from last commit)
recent_files=$(git diff-tree --no-commit-id -r --name-only HEAD 2>/dev/null | awk '{printf "  - %s\\n", $0}')
if [ -z "$recent_files" ]; then
  recent_files="  - (no files in last commit)"
fi

dirty_note=""
if [ "$dirty_count" -gt 0 ]; then
  dirty_note=" ($dirty_count uncommitted)"
fi

context="## Session Context (bopen-tools plugin repo)
- Branch: $branch$dirty_note
- Last commits:
$recent_commits- Plugin inventory: $agent_count agents, $skill_count skills, $command_count commands, $hook_count hooks
- Files changed in last commit:
$recent_files"

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}' \
  "$(printf '%s' "$context" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])')"
