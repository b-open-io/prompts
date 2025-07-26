---
allowed-tools: Bash(diff:*), Bash(git:*), Bash(cp:*), Bash(test:*), Bash(echo:*), Read, Write, Edit, Grep, Glob
description: Sync and update user commands between local and prompts repo
argument-hint: [--status] [--pull] [--push] [--help]
---

# Sync User Commands with Prompts Repository

This command compares and synchronizes your local `~/.claude/commands/` with the prompts repository's `user/.claude/commands/`. It can update existing commands, pull new versions from the repo, and help you contribute improvements back to the community.

**Note**: Use `/opl:prompts:init` first to copy new commands. This command handles updates and synchronization of existing commands.

## Your Task

If the arguments contain "--help", show this help:

```
opl:prompts:sync - Sync and update user commands between local and prompts repo

Usage: /opl:prompts:sync [OPTIONS]

Description:
Compares and synchronizes your local ~/.claude/commands/ with the prompts repository.
Handles updates, merging, and contributions of existing commands.

Options:
  --status  Show detailed sync status report
  --pull    Pull latest from repository (no prompt)
  --push    Push local to repository (no prompt)
  --help    Show this help message

Examples:
  /opl:prompts:sync           Show quick menu
  /opl:prompts:sync --status  See detailed status
  /opl:prompts:sync --pull    Update from repo
  /opl:prompts:sync --push    Share your improvements

Note: Use /opl:prompts:init first to copy new commands.

For more help: /opl:prompts:help
```

Then stop.

Otherwise, synchronize commands:

### 1. Quick Analysis
First, get lists of commands in both locations:
- Use Glob to find all .md files in user/.claude/commands/
- Use Glob to find all .md files in ~/.claude/commands/

### 2. Process Based on Arguments

**If no arguments (default):**
Show simple numbered menu:
```
Prompt Sync Options:
1. Pull latest from repository (replace local)
2. Push local to repository
3. Review differences

Choose an option (1-3):
```

Wait for user input and execute the chosen action.

**If `--status`:**
Perform detailed analysis:
- 📤 **Local commands to contribute**: Commands only in ~/.claude/commands/
- 📥 **Repo commands to pull**: Commands only in user/.claude/commands/
- 🔄 **Commands with differences**: Files that differ between locations
- ✅ **Commands in sync**: Files that are identical

Show counts and list command names in each category.

**If `--pull`:**
Immediately execute pull without prompts:
- Copy all commands from repo to local (recursive with subdirectories)
- Show summary of changes

**If `--push`:**
Immediately execute push without prompts:
- Copy all commands from local to repo (recursive with subdirectories)
- Show reminder to commit and push git changes

**If option 3 (Review differences) is chosen:**
Show a concise diff summary:
- List commands that differ
- Group by subdirectory
- Show first few lines of differences for key files
- Ask if user wants to see full diff for any specific command

### 3. Execute Actions

For Pull operations:
```bash
# Copy all commands from repo to local, preserving directory structure
cp -rf user/.claude/commands/* ~/.claude/commands/
```

For Push operations:
```bash
# Copy all commands from local to repo, preserving directory structure
cp -rf ~/.claude/commands/* user/.claude/commands/
```

For Review:
Show organized diff output grouped by category/subdirectory.

### 4. Final Summary

Show results:
```
✅ Sync Complete:
- Commands synced: X
- Action taken: [Pull/Push/Review]

[Any additional instructions based on action taken]
```

For Pull/Push operations, show this reminder at the END:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Updated commands won't work until you:
   1. Press Ctrl+C to exit Claude Code
   2. Run 'claude -c' to resume your conversation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Important Notes
- Default behavior is fast with simple menu
- --pull and --push execute immediately without confirmation
- --status provides detailed analysis for power users
- Preserve directory structure when syncing