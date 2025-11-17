---
allowed-tools: Read, Write, Edit, Bash(cp:*), Bash(chmod:*), Bash(mkdir:*), Bash(test:*), AskUserQuestion
description: Interactive setup wizard for OPL prompts ecosystem
argument-hint: [--help]
---

## Your Task

If arguments contain "--help", show this help and stop:

```
opl:init - Complete OPL ecosystem setup wizard

Usage: /opl:init [OPTIONS]

Description:
Interactive wizard that configures your Claude Code environment with:
- Specialized AI agents (21 domain experts)
- Automation hooks (lint-on-save, etc.)
- Custom statusline (project tracking, git, lint status)
- Recommended settings (includeCoAuthoredBy: false, etc.)

NOTE: OPL slash commands are project-level and automatically available
when working in the prompts repo. They are NOT installed to user level.

Options:
  --help    Show this help message

Requirements:
  - Must be run from within the prompts repository
  - jq (for settings.json manipulation)

After setup:
  - Restart Claude Code to activate all features
  - Use /opl:commands:help for available commands
  - Agents are automatically available via Task tool
```

Otherwise, proceed with the interactive setup wizard:

### 1. Welcome Message

```
╔══════════════════════════════════════════════════════════════╗
║                    OPL Ecosystem Setup                       ║
║         Supercharge Claude Code with AI agents & tools       ║
╚══════════════════════════════════════════════════════════════╝

This wizard will help you configure:
• 21 specialized AI agents
• Automation hooks
• Custom statusline
• Recommended settings

Note: OPL slash commands (/opl:*) are project-level and work
automatically when you're in the prompts repo directory.
```

### 2. Check Prerequisites

Verify we're in the prompts repository:
```bash
if [[ ! -f "user/.claude/agents/prompt-engineer.md" ]]; then
  echo "❌ Error: Must run from prompts repository root"
  exit 1
fi
```

Check for jq:
```bash
if ! command -v jq &> /dev/null; then
  echo "⚠️  jq is recommended but not installed"
  echo "   Install with: brew install jq"
fi
```

### 3. Ask What to Install

Use AskUserQuestion tool with multi-select:

**Question 1: Components to Install**
- Header: "Install"
- Question: "Which components would you like to install?"
- multiSelect: true
- Options:
  - `Agents` - 21 specialized AI sub-agents (prompt-engineer, bitcoin-specialist, etc.)
  - `Hooks` - Automation (lint-on-save, lint-on-start)
  - `Statusline` - Project tracking with git/lint status

Note: OPL commands are project-level and automatically available when working in the prompts repo. They should NOT be installed to user level.

### 4. Configure Settings

**Question 2: Recommended Settings**
- Header: "Settings"
- Question: "Enable recommended Claude Code settings?"
- multiSelect: true
- Options:
  - `Disable Co-Author` - Remove "Co-Authored-By: Claude" from commits
  - `Always Thinking` - Enable extended thinking mode

### 5. Statusline Configuration (if selected)

If user selected Statusline, ask:

**Question 3: Code Directory**
- Header: "Code dir"
- Question: "Where are your code projects located?"
- Options:
  - `~/code` - Standard location
  - `~/projects` - Alternative location
  - `~/dev` - Developer folder

**Question 4: Editor**
- Header: "Editor"
- Question: "Which editor should open when you click file paths?"
- Options:
  - `cursor` - Cursor editor
  - `vscode` - Visual Studio Code
  - `sublime` - Sublime Text
  - `file` - System default

### 6. Install Selected Components

For each selected component:

**Agents:**
```bash
mkdir -p ~/.claude/agents
cp user/.claude/agents/*.md ~/.claude/agents/
echo "✅ Installed $(ls user/.claude/agents/*.md | wc -l | tr -d ' ') agents"
```

**Hooks:**
```bash
mkdir -p ~/.claude/hooks ~/.claude/lint-state
cp user/.claude/hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
echo "✅ Installed hooks"
```

**Statusline:**
```bash
cp user/.claude/statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
echo "✅ Installed statusline"
```

If user configured non-default CODE_DIR:
```bash
sed -i '' 's|CODE_DIR="${CODE_DIR:-$HOME/code}"|CODE_DIR="${CODE_DIR:-'"$USER_CODE_DIR"'}"|' ~/.claude/statusline.sh
```

If user configured non-default EDITOR_SCHEME:
```bash
sed -i '' 's|EDITOR_SCHEME="${EDITOR_SCHEME:-cursor}"|EDITOR_SCHEME="${EDITOR_SCHEME:-'"$USER_EDITOR"'}"|' ~/.claude/statusline.sh
```

### 7. Update settings.json

Read existing ~/.claude/settings.json or create new one.

Add selected components:

**If Hooks selected:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/lint-on-save.sh"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/lint-on-start.sh"
          }
        ]
      }
    ]
  }
}
```

**If Statusline selected:**
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

**If Disable Co-Author selected:**
```json
{
  "includeCoAuthoredBy": false
}
```

**If Always Thinking selected:**
```json
{
  "alwaysThinkingEnabled": true
}
```

Merge these into existing settings, preserving user's other configurations.

### 8. Final Summary

```
╔══════════════════════════════════════════════════════════════╗
║                   Setup Complete! 🎉                         ║
╚══════════════════════════════════════════════════════════════╝

Installed:
  ✅ [List each installed component]

Configuration:
  Settings: ~/.claude/settings.json
  [If statusline] Code directory: $USER_CODE_DIR
  [If statusline] Editor scheme: $USER_EDITOR

Next Steps:
  1. RESTART Claude Code to activate all features
  2. Try: /opl:dev:lint to run linting (when in prompts repo)
  3. Try: /opl:docs:prd "project name" to create PRD
  4. Agents are automatically available (no action needed)

Note: OPL commands (/opl:*) are project-level and only work
when you're in the prompts repository directory.

Sync Commands (run from prompts repo):
  /opl:agents:sync - Update agents
  /opl:hooks:sync  - Update hooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Start a new Claude session to activate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
