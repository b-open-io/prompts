---
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(ls:*), Bash(test:*), Bash(echo:*), Read, Glob
description: Initialize new user-level Claude commands (won't overwrite existing)
argument-hint: [--list-only] [--help]
---

## Your Task

If the arguments contain "--help", show this help:

```
init-prompts - Initialize new user-level Claude commands

Usage: /init-prompts [--list-only] [--help]

Description:
Copies NEW commands from the prompts repository to your local ~/.claude/commands/ directory.
This command will NEVER overwrite existing files.

Options:
  --list-only  Preview what would be copied without actually copying
  --help       Show this help message

Examples:
  /init-prompts             Copy all new commands
  /init-prompts --list-only  See what would be copied

Note: Use /sync-prompts to update existing commands.

For more help: /help-prompts
```

Then stop.

Otherwise, initialize NEW user commands by copying ONLY non-existing commands from this repository's `user/.claude/commands/` to `~/.claude/commands/`.

**IMPORTANT**: This command will NOT overwrite any existing files. Use `/sync-prompts` to update existing commands.

### Process:

1. **Create user directory if needed**:
   - Use Bash to create ~/.claude/commands/ if it doesn't exist

2. **Find and copy new commands**:
   - Use Glob to find all .md files in user/.claude/commands/
   - Use Bash test to check if each file exists in ~/.claude/commands/
   - Copy only files that don't already exist

3. **Report results**:
   - List newly copied commands
   - List skipped commands (if any already exist)
   - Remind user about /sync-prompts for updates if needed

### Arguments:
- `--list-only`: Just show what would be copied without doing it

### Example Usage:
```bash
# Initialize new commands only
/init-prompts

# Preview what would be copied
/init-prompts --list-only
```

### Success Message Template:
```
✅ Initialized new Claude commands:
- Copied: [list of new commands]
- Skipped (already exist): [list]

$IF_SKIPPED:
📝 To update existing commands, use: /sync-prompts

Try your new commands:
- /[new command names]
```

### Important Notes:
- This command is safe - it will NEVER overwrite your existing commands
- Local customizations are always preserved
- Use `/sync-prompts` to update or merge changes from upstream