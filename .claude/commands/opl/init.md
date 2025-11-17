---
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
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
- Specialized AI agents (22 domain experts)
- User-level commands (/prd, etc.)
- Automation hooks (lint-on-save, etc.)
- Custom statusline (project tracking, git, lint status)
- Recommended settings (includeCoAuthoredBy: false, etc.)

Features:
- Detects existing installations and pre-checks those options
- Granular selection (pick specific agents, hooks, commands)
- Non-destructive (won't overwrite unless you select to update)

Options:
  --help    Show this help message

Requirements:
  - Must be run from within the prompts repository
  - jq (for settings.json manipulation)
```

Otherwise, proceed with the interactive setup wizard:

### 1. Welcome Message

```
╔══════════════════════════════════════════════════════════════╗
║                    OPL Ecosystem Setup                       ║
║         Supercharge Claude Code with AI agents & tools       ║
╚══════════════════════════════════════════════════════════════╝

This wizard will help you configure:
• 22 specialized AI agents
• User-level commands (/prd, etc.)
• Automation hooks
• Custom statusline
• Recommended settings

Note: OPL slash commands (/opl:*) are project-level and work
automatically when you're in the prompts repo directory.
```

### 2. Check Prerequisites and Detect Existing Installation

Verify we're in the prompts repository:
```bash
if [[ ! -f "user/.claude/agents/prompt-engineer.md" ]]; then
  echo "❌ Error: Must run from prompts repository root"
  exit 1
fi
```

Detect what's already installed:
```bash
# Check for existing agents
INSTALLED_AGENTS=()
if [[ -d ~/.claude/agents ]]; then
  for agent in ~/.claude/agents/*.md; do
    [[ -f "$agent" ]] && INSTALLED_AGENTS+=($(basename "$agent" .md))
  done
fi

# Check for existing hooks
HAS_LINT_ON_SAVE=false
HAS_LINT_ON_START=false
[[ -f ~/.claude/hooks/lint-on-save.sh ]] && HAS_LINT_ON_SAVE=true
[[ -f ~/.claude/hooks/lint-on-start.sh ]] && HAS_LINT_ON_START=true

# Check for existing statusline
HAS_STATUSLINE=false
[[ -f ~/.claude/statusline.sh ]] && HAS_STATUSLINE=true

# Check for existing user commands
INSTALLED_COMMANDS=()
if [[ -d ~/.claude/commands ]]; then
  for cmd in ~/.claude/commands/*.md; do
    [[ -f "$cmd" ]] && INSTALLED_COMMANDS+=($(basename "$cmd" .md))
  done
fi

# Check settings.json using jq for reliable detection
HAS_COAUTHOR_DISABLED=false
HAS_ALWAYS_THINKING=false
if [[ -f ~/.claude/settings.json ]]; then
  # Use jq for reliable JSON parsing
  if command -v jq &> /dev/null; then
    [[ "$(jq -r '.includeCoAuthoredBy // "null"' ~/.claude/settings.json)" == "false" ]] && HAS_COAUTHOR_DISABLED=true
    [[ "$(jq -r '.alwaysThinkingEnabled // "null"' ~/.claude/settings.json)" == "true" ]] && HAS_ALWAYS_THINKING=true
  else
    # Fallback to grep with flexible whitespace
    grep -qE '"includeCoAuthoredBy"\s*:\s*false' ~/.claude/settings.json && HAS_COAUTHOR_DISABLED=true
    grep -qE '"alwaysThinkingEnabled"\s*:\s*true' ~/.claude/settings.json && HAS_ALWAYS_THINKING=true
  fi
fi

echo "Current installation status:"
echo "  Agents: ${#INSTALLED_AGENTS[@]} installed"
echo "  Hooks: lint-on-save=$HAS_LINT_ON_SAVE, lint-on-start=$HAS_LINT_ON_START"
echo "  Statusline: $HAS_STATUSLINE"
echo "  Commands: ${#INSTALLED_COMMANDS[@]} installed"
echo "  Co-Author disabled: $HAS_COAUTHOR_DISABLED"
echo "  Always Thinking: $HAS_ALWAYS_THINKING"
```

Check for jq:
```bash
if ! command -v jq &> /dev/null; then
  echo "⚠️  jq is recommended but not installed"
  echo "   Install with: brew install jq"
fi
```

### 3. Ask What Categories to Configure

Use AskUserQuestion tool with multi-select. **Pre-check options based on detected installation.**

**Question 1: Components to Configure**
- Header: "Configure"
- Question: "Which components would you like to configure? (Pre-checked items are already installed)"
- multiSelect: true
- Options (pre-check if already installed):
  - `Agents` - 22 specialized AI sub-agents (pre-check if ANY agents installed)
  - `Commands` - User-level commands like /prd (pre-check if ANY commands installed)
  - `Hooks` - Automation (lint-on-save, lint-on-start) (pre-check if ANY hooks installed)
  - `Statusline` - Project tracking with git/lint status (pre-check if statusline exists)

### 4. Granular Agent Selection (if Agents selected)

List all available agents and let user pick which ones:

```bash
AVAILABLE_AGENTS=$(ls user/.claude/agents/*.md | xargs -I {} basename {} .md | sort)
```

**Question 2: Select Agents**
- Header: "Agents"
- Question: "Select which agents to install/update: (already installed are pre-checked)"
- multiSelect: true
- Options: List each agent with description. Pre-check if in INSTALLED_AGENTS.
  - `prompt-engineer` - Slash command creation, Claude Code settings
  - `bitcoin-specialist` - BSV SDK, transactions, 1Sat Ordinals
  - `auth-specialist` - OAuth 2.1, WebAuthn, Better Auth plugins
  - `code-auditor` - Security audits, vulnerability detection
  - `design-specialist` - UI/UX, component libraries
  - ... (list all 22)

### 5. Granular Command Selection (if Commands selected)

List available user-level commands:
```bash
# User-level commands are in user/.claude/commands/ (NOT opl subdirectory)
AVAILABLE_COMMANDS=$(ls user/.claude/commands/*.md 2>/dev/null | xargs -I {} basename {} .md | sort)
```

**Question 3: Select Commands**
- Header: "Commands"
- Question: "Select which commands to install/update:"
- multiSelect: true
- Options: List each command. Pre-check if already installed.
  - `pdr-enhanced` - Create comprehensive PRDs with Shape Up & Working Backwards

### 6. Granular Hook Selection (if Hooks selected)

**Question 4: Select Hooks**
- Header: "Hooks"
- Question: "Select which hooks to install/update:"
- multiSelect: true
- Options (pre-check if already installed):
  - `lint-on-save` - Run linting after file edits (Node.js + Go support)
  - `lint-on-start` - Check lint status when session starts

### 7. Configure Settings

**Question 5: Recommended Settings**
- Header: "Settings"
- Question: "Configure Claude Code settings: (enabled settings are pre-checked)"
- multiSelect: true
- Options (pre-check based on current settings):
  - `Disable Co-Author` - Remove "Co-Authored-By: Claude" from commits
  - `Always Thinking` - Enable extended thinking mode

### 8. Statusline Configuration (if selected)

If user selected Statusline, ask:

**Question 6: Code Directory**
- Header: "Code dir"
- Question: "Where are your code projects located?"
- Options:
  - `~/code` - Standard location
  - `~/projects` - Alternative location
  - `~/dev` - Developer folder

**Question 7: Editor**
- Header: "Editor"
- Question: "Which editor should open when you click file paths?"
- Options:
  - `cursor` - Cursor editor
  - `vscode` - Visual Studio Code
  - `sublime` - Sublime Text
  - `file` - System default

### 9. Install Selected Components

For each selected component:

**Selected Agents:**
```bash
mkdir -p ~/.claude/agents
for agent in $SELECTED_AGENTS; do
  cp "user/.claude/agents/${agent}.md" ~/.claude/agents/
  echo "  ✓ $agent"
done
echo "✅ Installed/updated ${#SELECTED_AGENTS[@]} agents"
```

**Selected Commands:**
```bash
mkdir -p ~/.claude/commands
for cmd in $SELECTED_COMMANDS; do
  cp "user/.claude/commands/${cmd}.md" ~/.claude/commands/
  echo "  ✓ /$cmd"
done
echo "✅ Installed/updated ${#SELECTED_COMMANDS[@]} commands"
```

**Selected Hooks:**
```bash
mkdir -p ~/.claude/hooks ~/.claude/lint-state
for hook in $SELECTED_HOOKS; do
  cp "user/.claude/hooks/${hook}.sh" ~/.claude/hooks/
  chmod +x ~/.claude/hooks/${hook}.sh
  echo "  ✓ $hook"
done
echo "✅ Installed/updated ${#SELECTED_HOOKS[@]} hooks"
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

### 10. Update settings.json

Read existing ~/.claude/settings.json or create new one.

**CRITICAL: Preserve all existing settings. Only add/modify requested settings.**

Add selected components:

**If Hooks selected:**
Add to hooks configuration (merge with existing hooks, don't overwrite):
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

### 11. Final Summary

```
╔══════════════════════════════════════════════════════════════╗
║                   Setup Complete! 🎉                         ║
╚══════════════════════════════════════════════════════════════╝

Installed/Updated:
  ✅ [List each installed component with count]
  ✅ Agents: X installed/updated
  ✅ Commands: X installed/updated
  ✅ Hooks: X installed/updated
  ✅ Statusline: configured
  ✅ Settings: updated

Configuration:
  Settings: ~/.claude/settings.json
  [If statusline] Code directory: $USER_CODE_DIR
  [If statusline] Editor scheme: $USER_EDITOR

Next Steps:
  1. RESTART Claude Code to activate all features
  2. Try: /pdr-enhanced "project name" to create PRD
  3. Agents are automatically available via Task tool
  4. OPL commands work when in prompts repo directory

Available Commands (user-level):
  [List installed commands]

Sync Commands (run from prompts repo):
  /opl:agents:sync - Update agents
  /opl:hooks:sync  - Update hooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Start a new Claude session to activate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
