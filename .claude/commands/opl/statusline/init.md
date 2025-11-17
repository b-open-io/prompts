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
Installs a powerline-style status line with project tracking, lint status,
git branch info, and clickable file paths.

Options:
  --check   Check status without installing
  --help    Show this help message

Requirements:
  - jq (JSON processor)
  - Bash 4.0+
  - git (for branch detection)

Features:
  - Color families with linear RGB progression (purple for edited, cyan for CWD)
  - ⌂ CWD project (where Claude started)
  - ✎ Last edited project (what you touched)
  - Lint status with yellow ✗ errors, △ warnings, ✓ clean
  - Git branch name with * for uncommitted changes
  - Clickable file paths (OSC 8 hyperlinks) - open in editor
  - Configurable editor scheme (cursor, vscode, sublime, file)

Environment Variables:
  - CODE_DIR: Base code directory (default: ~/code)
  - EDITOR_SCHEME: Editor for clickable links (default: cursor)
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
  ~/.claude/statusline.sh

Configuration:
  ~/.claude/settings.json (statusLine added)

Features:
  - ⌂ CWD project (cyan family) - where Claude started
  - ✎ Edited project (purple family) - last file you touched
  - Lint status: ✗ errors, △ warnings, ✓ clean (yellow text)
  - Git branch with * for uncommitted changes
  - Clickable file paths (cmd+click to open in editor)
  - Color families with linear RGB progression

To customize:
  - CODE_DIR: Set base code directory (default: ~/code)
  - EDITOR_SCHEME: Set editor for links (cursor, vscode, sublime, file)

Example:
  export CODE_DIR="$HOME/projects"
  export EDITOR_SCHEME="vscode"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESTART REQUIRED - Start a new Claude session to see the status line
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
