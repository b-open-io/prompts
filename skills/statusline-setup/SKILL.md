---
name: statusline-setup
description: This skill should be used when the user asks to "create a status line", "customize status line", "set up statusline", "configure Claude Code status bar", "install ccstatusline", "add project colors to status line", "show git branch in status", "display token usage", or mentions Peacock colors, powerline, or status line configuration.
version: 0.0.1
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

# Status Line Setup

Create and customize Claude Code status lines to display contextual information like model name, git branch, token usage, project colors, and more.

## Overview

Claude Code supports custom status lines displayed at the bottom of the interface. Status lines update when conversation messages change, running at most every 300ms.

## Interactive Setup Flow

When setting up a status line, first check for existing configuration and use AskUserQuestion to gather preferences.

### Pre-Check: Existing Status Line

```bash
# Check for existing configuration
if [[ -f ~/.claude/settings.json ]]; then
    EXISTING=$(jq -r '.statusLine // empty' ~/.claude/settings.json)
    if [[ -n "$EXISTING" ]]; then
        # User has existing status line - ask about backup
    fi
fi
```

### Setup Questions

1. **Approach**: Custom script (full control), ccstatusline (widget-based TUI), or Simple inline
2. **Features**: Git branch, project colors, token usage, session cost
3. **Style**: Powerline, Minimal, or Match terminal
4. **Editor**: Cursor, VS Code, Sublime, or None (for clickable links)

## Two Approaches

### 1. Manual Script (Full Control)

Create a shell script that receives JSON data via stdin and outputs a single line with ANSI colors.

**Quick setup:**
```bash
cat > ~/.claude/statusline.sh << 'EOF'
#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name')
DIR=$(basename "$(echo "$input" | jq -r '.workspace.current_dir')")
echo "[$MODEL] $DIR"
EOF
chmod +x ~/.claude/statusline.sh
```

**Configure in settings:**
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

### 2. ccstatusline (Widget-Based)

Use the third-party [ccstatusline](https://github.com/sirmalloc/ccstatusline) for a widget-based approach with TUI configuration.

**Quick setup:**
```bash
bunx ccstatusline@latest
```

**Configure in settings:**
```json
{
  "statusLine": "bunx ccstatusline@latest"
}
```

## JSON Input Structure

The status line command receives structured JSON via stdin:

| Field | Description |
|-------|-------------|
| `model.id` | Model identifier (e.g., "claude-opus-4-1") |
| `model.display_name` | Human-readable name (e.g., "Opus") |
| `workspace.current_dir` | Current working directory |
| `workspace.project_dir` | Original project directory |
| `cost.total_cost_usd` | Session cost in USD |
| `cost.total_duration_ms` | Total session duration |
| `context_window.context_window_size` | Max context size |
| `context_window.current_usage` | Current token usage object |
| `transcript_path` | Path to session transcript JSON |
| `session_id` | Unique session identifier |

## Common Patterns

### Git Branch Display

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    DIRTY=""
    git diff --quiet HEAD 2>/dev/null || DIRTY="*"
    echo "[$MODEL] $BRANCH$DIRTY"
fi
```

### Context Usage Percentage

```bash
USAGE=$(echo "$input" | jq '.context_window.current_usage')
if [ "$USAGE" != "null" ]; then
    TOKENS=$(echo "$USAGE" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
    SIZE=$(echo "$input" | jq -r '.context_window.context_window_size')
    PERCENT=$((TOKENS * 100 / SIZE))
    echo "Context: ${PERCENT}%"
fi
```

### Peacock Project Colors

```bash
SETTINGS=".vscode/settings.json"
if [[ -f "$SETTINGS" ]]; then
    COLOR=$(jq -r '.["peacock.color"] // empty' "$SETTINGS")
fi
```

### Clickable File Links (OSC 8)

```bash
FILE_URL="vscode://file${LAST_FILE}"
echo -e "\033]8;;${FILE_URL}\a${FILENAME}\033]8;;\a"
```

## Best Practices

1. **Keep it concise** - Status line should fit on one line
2. **Use colors sparingly** - Make information scannable, not overwhelming
3. **Cache expensive operations** - Git status can be slow on large repos
4. **Test manually first** - Pipe mock JSON to script before configuring
5. **Use jq for parsing** - Reliable JSON extraction in bash
6. **Handle missing data** - Fields may be null or missing
7. **Output to stdout only** - Status line reads first line of stdout

## Testing

Test scripts with mock JSON:

```bash
echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"/test"}}' | ./statusline.sh
```

## Installation Script

Use `scripts/install-statusline.sh` to:
- Copy status line script to `~/.claude/`
- Update settings.json
- Create backup of existing configuration

## Restore Previous Configuration

Backups are created with timestamps in `~/.claude/`:

```bash
# List available backups
ls -la ~/.claude/*.backup.*

# Restore using restore script
~/.claude/plugins/cache/.../scripts/restore-statusline.sh

# Or manually
LATEST=$(ls -t ~/.claude/settings.json.backup.* 2>/dev/null | head -1)
if [[ -n "$LATEST" ]]; then
    cp "$LATEST" ~/.claude/settings.json
fi
```

## Additional Resources

For detailed implementation guidance, see the references directory:

- **`references/json-input-schema.md`** - Complete JSON input documentation with all fields, extraction examples in Bash/Python/Node.js, and handling null values
- **`references/scripting-patterns.md`** - ANSI color codes (256-color and true color), Powerline separators, Git integration patterns, project detection, clickable links (OSC 8), terminal integration, and formatting helpers
- **`references/ccstatusline-guide.md`** - Complete widget documentation, installation, configuration options, available widgets, multi-line setup, and troubleshooting

## External Links

- [Claude Code Status Line Docs](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [ccstatusline GitHub](https://github.com/sirmalloc/ccstatusline)
- [Powerline Fonts](https://github.com/powerline/fonts)
