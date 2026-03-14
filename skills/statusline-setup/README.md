# Status Line Setup Skill

Configures Claude Code status lines that display contextual information at the bottom of the interface — model name, git branch, token usage, project colors, and more.

## What This Skill Does

Claude walks you through an interactive setup to:

1. Check for and back up any existing status line configuration
2. Ask what features you want (git branch, project colors, token usage, session cost)
3. Ask about style (Powerline, Minimal, or Match terminal)
4. Ask about your editor (Cursor, VS Code, Sublime, or None — for clickable links)
5. Write the script and update `~/.claude/settings.json`

## Approaches

### Manual Script (Full Control)

Create `~/.claude/statusline.sh`:

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

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

### ccstatusline (Widget-Based)

```bash
bunx ccstatusline@latest
```

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": "bunx ccstatusline@latest"
}
```

## Installation Script

Use `scripts/install-statusline.sh` to automate setup:

- Copies the status line script to `~/.claude/`
- Updates `~/.claude/settings.json`
- Creates a timestamped backup of any existing configuration

## Backup and Restore

Backups are written to `~/.claude/` with timestamps.

```bash
# List available backups
ls -la ~/.claude/*.backup.*

# Restore using the restore script
~/.claude/plugins/cache/.../scripts/restore-statusline.sh

# Or manually restore
LATEST=$(ls -t ~/.claude/settings.json.backup.* 2>/dev/null | head -1)
if [[ -n "$LATEST" ]]; then
    cp "$LATEST" ~/.claude/settings.json
fi
```

## Testing Your Script

Before configuring, test the script by piping mock JSON directly:

```bash
echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"/test"}}' | ./statusline.sh
```

Test with fuller JSON to exercise all branches:

```bash
echo '{
  "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
  "workspace": {"current_dir": "/Users/you/project", "project_dir": "/Users/you/project"},
  "cost": {"total_cost_usd": 0.05, "total_duration_ms": 120000},
  "context_window": {"context_window_size": 200000, "current_usage": {"input_tokens": 4500, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}}
}' | ~/.claude/statusline.sh
```

## Best Practices

- **Keep it concise** — the status line must fit on one line
- **Use colors sparingly** — make information scannable, not overwhelming
- **Cache expensive operations** — git status can be slow on large repos; consider caching results
- **Use jq for JSON parsing** — more reliable than sed/grep for structured data
- **Handle missing/null fields** — not all fields are present in every invocation
- **Write to stdout only** — Claude Code reads the first line of stdout; stderr is ignored

## External Links

- [Claude Code Status Line Docs](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [ccstatusline GitHub](https://github.com/sirmalloc/ccstatusline)
- [Powerline Fonts](https://github.com/powerline/fonts)

## Reference Files

- **`references/json-input-schema.md`** — Complete JSON input documentation with all fields, extraction examples in Bash/Python/Node.js, and null-value handling
- **`references/scripting-patterns.md`** — ANSI color codes (256-color and true color), Powerline separators, Git integration patterns, project detection, clickable links (OSC 8), terminal integration, and formatting helpers
- **`references/ccstatusline-guide.md`** — Complete widget documentation, installation, configuration options, available widgets, multi-line setup, and troubleshooting
