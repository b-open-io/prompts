---
allowed-tools: Bash(diff:*), Bash(git:*), Bash(cp:*), Bash(test:*), Bash(echo:*), Read, Write, Edit, Grep, Glob
description: Sync and update user commands between local and prompts repo
argument-hint: [--full-report] [--contribute] [--pull] [--push] [--help]
---

# Sync User Commands with Prompts Repository

This command compares and synchronizes your local `~/.claude/commands/` with the prompts repository's `user/.claude/commands/`. It can update existing commands, pull new versions from the repo, and help you contribute improvements back to the community.

**Note**: Use `/init-prompts` first to copy new commands. This command handles updates and synchronization of existing commands.

## Your Task

If the arguments contain "--help", show this help:

```
sync-prompts - Sync and update user commands between local and prompts repo

Usage: /sync-prompts [OPTIONS]

Description:
Compares and synchronizes your local ~/.claude/commands/ with the prompts repository.
Handles updates, merging, and contributions of existing commands.

Options:
  --full-report  Show detailed diffs for all differing files
  --contribute   Focus on contribution workflow
  --pull         Update local commands from repo (with confirmation)
  --push         Copy local commands to repo for contribution
  --help         Show this help message

Examples:
  /sync-prompts               Show sync status
  /sync-prompts --full-report  See detailed differences
  /sync-prompts --pull         Update from repo
  /sync-prompts --contribute   Share your improvements

Note: Use /init-prompts first to copy new commands.

For more help: /help-prompts
```

Then stop.

Otherwise, provide a comprehensive sync report:

1. **Find Files to Compare**
   - Use Glob to find all .md files in user/.claude/commands/
   - Use Glob to find all .md files in ~/.claude/commands/
   - Use Bash test to check which files exist in both locations

2. **Analyze Differences**
   - Use Bash diff to compare files that exist in both locations
   - Use Read tool to examine file contents when needed
   - Identify files that exist only in one location

3. **Create Sync Report**
   Present a clear report showing:
   - 📤 **Local commands to contribute**: Commands you have that the repo doesn't
   - 📥 **Repo commands to pull**: Commands the repo has that you don't  
   - 🔄 **Commands with differences**: Files that differ between locations
   - ✅ **Commands in sync**: Files that are identical

4. **Ask User for Actions**
   After showing the report, ask which commands they want to:
   - Copy from repo to local (update their system)
   - Contribute from local to repo (share with community)
   - Skip (keep different versions)

5. **Implementation**
   - Use Bash cp to copy files as directed
   - Use Bash git commands for contribution workflow
   - Show progress for each action
   - Confirm successful sync

## Arguments

- `--full-report`: Show full diff for all differing files
- `--contribute`: Focus on contribution workflow for sharing commands
- `--pull`: Update local commands from repo (with confirmation)
- `--push`: Copy local commands to repo for contribution

## Example Workflow

```bash
# Check sync status
/sync-prompts

# See full differences
/sync-prompts --full-report

# Pull updates from repo to local
/sync-prompts --pull

# Push local changes to repo
/sync-prompts --push

# Focus on contributing
/sync-prompts --contribute
```

Remember to:
- Preserve user customizations when appropriate
- Explain benefits of each command when contributing
- Test commands work correctly after sync
- Follow repository contribution guidelines