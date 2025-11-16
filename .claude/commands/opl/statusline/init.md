---
allowed-tools: Bash(cp:*), Bash(chmod:*), Bash(test:*), Bash(diff:*), Read, Edit
description: Install and configure Claude Code status line for project tracking
argument-hint: [--check] [--help]
---

## Your Task

If the arguments contain "--help", show this help:

```
opl:statusline:init - Install project-tracking status line

Usage: /opl:statusline:init [OPTIONS]

Description:
Installs a custom status line that shows which project Claude is currently
working on. Parses the session transcript to find recent file operations
and displays the project directory (under ~/code/).

Options:
  --check   Check status without installing
  --help    Show this help message

Requirements:
  - jq (JSON processor)
  - Bash 4.0+

The status line:
  - Shows 📁 project-name when Claude edits files in ~/code/project-name/
  - Updates automatically as Claude works
  - Session-specific (won't show other sessions' activity)
  - Falls back to current working directory if no recent file ops
```

Then stop.

### 1. Check Prerequisites

```bash
# Check for jq
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is required but not installed"
    echo "Install with: brew install jq"
    exit 1
fi
```

### 2. If --check is specified

Compare local version with repo version:
```bash
if [ -f ~/.claude/statusline.sh ]; then
    echo "✅ Status line installed at ~/.claude/statusline.sh"
    if diff -q user/.claude/statusline.sh ~/.claude/statusline.sh > /dev/null 2>&1; then
        echo "   Version: In sync with repository"
    else
        echo "   Version: Differs from repository (run without --check to update)"
    fi
else
    echo "❌ Status line not installed"
fi

# Check settings.json
if [ -f ~/.claude/settings.json ]; then
    if grep -q '"statusLine"' ~/.claude/settings.json; then
        echo "✅ Status line configured in settings.json"
    else
        echo "❌ Status line not configured in settings.json"
    fi
else
    echo "❌ No ~/.claude/settings.json found"
fi
```

Then stop.

### 3. Install Status Line Script

```bash
# Copy the script
cp user/.claude/statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
echo "✅ Installed ~/.claude/statusline.sh"
```

### 4. Configure settings.json

Check if ~/.claude/settings.json exists:

If it doesn't exist:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

If it exists but doesn't have statusLine:
- Read the existing JSON
- Add the statusLine configuration
- Preserve all existing settings
- Write back

If it exists and already has statusLine:
- Ask user: "Status line already configured. Overwrite? (yes/no)"
- If yes, update the configuration
- If no, skip

### 5. Final Summary

```
✅ Status Line Installation Complete!

Installed:
  📁 ~/.claude/statusline.sh

Configuration:
  📝 ~/.claude/settings.json (statusLine added)

Features:
  - Shows current project: 📁 project-name
  - Parses recent file operations from transcript
  - Session-specific (isolated per Claude session)
  - Configurable code directory (default: ~/code)

To customize:
  - Set CODE_DIR environment variable for different base path
  - Edit ~/.claude/statusline.sh for custom formatting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Start a new Claude session to see the status line
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
