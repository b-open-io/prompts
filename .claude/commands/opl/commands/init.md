---
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(ls:*), Bash(test:*), Bash(echo:*), Bash(wc:*), Read, Glob, Grep
description: Initialize new user-level Claude commands (won't overwrite existing)
argument-hint: [--list-only] [--describe] [--help]
---

## Your Task

If the arguments contain "--help", show this help:

```
opl:commands:init - Initialize new user-level Claude commands

Usage: /opl:commands:init [--list-only] [--describe] [--help]

Description:
Copies NEW commands from the commands repository to your local ~/.claude/commands/ directory.
This command will NEVER overwrite existing files.

Options:
  --list-only  Preview what would be copied without actually copying
  --describe   Show detailed descriptions of each command
  --help       Show this help message

Examples:
  /opl:commands:init              Copy all new commands
  /opl:commands:init --list-only  See what would be copied
  /opl:commands:init --describe   See what each command does

⚠️  IMPORTANT: After copying commands, you must restart Claude Code:
   1. Press Ctrl+C to exit
   2. Run 'claude -c' to resume

Note: Use /opl:commands:sync to update existing commands.

For more help: /opl:commands:help
```

Then stop.

Otherwise, initialize NEW user commands by copying ONLY non-existing commands from this repository's `user/.claude/commands/` to `~/.claude/commands/`.

**IMPORTANT**: This command will NOT overwrite any existing files. Use `/opl:commands:sync` to update existing commands.

### Process:

1. **Initial Summary**:
   - Count total available commands in repo
   - Count existing local commands
   - Show how many new commands can be installed

2. **Create user directory if needed**:
   - Use Bash to create ~/.claude/commands/ if it doesn't exist
   - Verify directory was created successfully

3. **Find and analyze commands**:
   - Use Glob to find all .md files in user/.claude/commands/ including subdirectories
   - Preserve namespace structure (e.g., utils/find.md, dev/lint.md)
   - Use Bash test to check if each file exists in ~/.claude/commands/ with full path
   - For --describe option: Use Grep to extract descriptions from frontmatter

4. **Copy new commands** (unless --list-only):
   - Create namespace directories as needed (mkdir -p)
   - Copy only files that don't already exist
   - Preserve directory structure (e.g., copy user/.claude/commands/dev/lint.md to ~/.claude/commands/dev/lint.md)
   - Verify each file was copied successfully
   - Track success/failure counts

5. **Report results**:
   - List newly copied commands with namespace prefixes (e.g., /dev:lint, /utils:find)
   - List skipped commands (if any already exist)
   - Show restart instructions prominently
   - Remind user about /opl:commands:sync for updates if needed

### Arguments:
- `--list-only`: Just show what would be copied without doing it
- `--describe`: Show detailed descriptions of each command

### Example Usage:
```bash
# Initialize new commands only
/opl:commands:init

# Preview what would be copied
/opl:commands:init --list-only
```

### Success Message Template:
```
📊 Command Summary:
- Available in repo: [total count]
- Already installed: [existing count]
- New to install: [new count]

✅ Initialized new Claude commands:
[For each copied command, show]:
- /command-name - Brief description

⏭️  Skipped (already exist): 
[List of skipped commands]

[If any commands were skipped, also show:]
📝 To update existing commands, use: /opl:commands:sync

After restart, try your new commands:
- /command-name - What it does
- /command-name --help - See detailed help

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Commands won't work until you:
   1. Press Ctrl+C to exit Claude Code
   2. Run 'claude -c' to resume your conversation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Important Notes:
- This command is safe - it will NEVER overwrite your existing commands
- Local customizations are always preserved
- Use `/opl:commands:sync` to update or merge changes from upstream