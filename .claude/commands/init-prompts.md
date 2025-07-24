---
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(ls:*), Bash(find:*), Bash(test:*), Bash(echo:*), Bash(basename:*), Bash(while:*), Bash(read:*), Bash(grep:*), Read
description: Initialize new user-level Claude commands (won't overwrite existing)
argument-hint: [--list-only] [--help]
---

## Help Check
!`echo "$ARGUMENTS" | grep -q -- "--help" && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**init-prompts** - Initialize new user-level Claude commands

**Usage:** `/init-prompts [--list-only]`

**Description:**
Copies NEW commands from the prompts repository to your local ~/.claude/commands/ directory. This command will NEVER overwrite existing files.

**Options:**
- `--list-only` : Preview what would be copied without actually copying
- `--help`      : Show this help message

**Examples:**
- `/init-prompts`           : Copy all new commands
- `/init-prompts --list-only` : See what would be copied

**Note:** Use `/sync-prompts` to update existing commands.

$STOP_EXECUTION_IF_HELP

## Context

- Project commands directory: !`ls -la $WORKING_DIR/user/.claude/commands/ 2>/dev/null || echo "No user commands found in repo"`
- User's Claude commands: !`ls -la ~/.claude/commands/ 2>/dev/null || echo "User commands directory does not exist"`
- Existing files (will skip): !`find $WORKING_DIR/user/.claude/commands -name "*.md" -exec basename {} \; 2>/dev/null | while read f; do [ -f ~/.claude/commands/"$f" ] && echo "- $f (exists)"; done`
- New files to copy: !`find $WORKING_DIR/user/.claude/commands -name "*.md" -exec basename {} \; 2>/dev/null | while read f; do [ ! -f ~/.claude/commands/"$f" ] && echo "- $f (new)"; done`

## Your Task

Initialize NEW user commands by copying ONLY non-existing commands from this repository's `user/.claude/commands/` to `~/.claude/commands/`.

**IMPORTANT**: This command will NOT overwrite any existing files. Use `/sync-prompts` to update existing commands.

### Process:

1. **Create user directory if needed**:
   - Check if `~/.claude/commands/` exists
   - Create it if missing with proper permissions

2. **Copy ONLY new commands**:
   - List all `.md` files in `user/.claude/commands/`
   - Skip any that already exist in user's directory
   - Copy only new commands

3. **Report results**:
   - List newly copied commands
   - List skipped commands (already exist)
   - If any were skipped, remind user to use `/sync-prompts` for updates

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