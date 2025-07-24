---
allowed-tools: Bash(ls:*), Bash(diff:*), Bash(cat:*), Bash(find:*), Bash(git:*), Bash(cp:*), Bash(comm:*), Bash(xargs:*), Bash(basename:*), Bash(sort:*), Bash(sed:*), Bash(test:*), Bash(echo:*), Bash(grep:*), Read, Write, Edit, Grep
description: Sync and update user commands between local and prompts repo
argument-hint: [--full-report] [--contribute] [--pull] [--push] [--help]
---

# Sync User Commands with Prompts Repository

This command compares and synchronizes your local `~/.claude/commands/` with the prompts repository's `user/.claude/commands/`. It can update existing commands, pull new versions from the repo, and help you contribute improvements back to the community.

**Note**: Use `/init-prompts` first to copy new commands. This command handles updates and synchronization of existing commands.

## Current Git Status
!`cd $WORKING_DIR && git status --porcelain`

## Step 1: Analyze Local vs Repository Commands

### Local Commands (Your System)
!`ls -la ~/.claude/commands/ | grep -E '\.md$' | awk '{print $NF}' | sort`

### Repository Commands (Upstream)
!`ls -la $WORKING_DIR/user/.claude/commands/ | grep -E '\.md$' | awk '{print $NF}' | sort`

## Step 2: Find Differences

### Commands Only in Local (Not in Repo)
!`comm -23 <(ls ~/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort) <(ls $WORKING_DIR/user/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort) | sed 's/^/- /'`

### Commands Only in Repo (Not in Local)
!`comm -13 <(ls ~/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort) <(ls $WORKING_DIR/user/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort) | sed 's/^/- /'`

### Commands in Both (Check for Updates)
!`comm -12 <(ls ~/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort) <(ls $WORKING_DIR/user/.claude/commands/*.md 2>/dev/null | xargs -n1 basename | sort)`

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

Otherwise, based on the analysis above, provide a comprehensive sync report:

1. **Analyze Differences**
   - For commands in both locations, check if they differ using `diff`
   - Identify which version is newer or more comprehensive
   - Note any local customizations that should be preserved

2. **Create Sync Report**
   Present a clear report showing:
   - 📤 **Local commands to contribute**: Commands you have that the repo doesn't
   - 📥 **Repo commands to pull**: Commands the repo has that you don't
   - 🔄 **Commands with differences**: Which version is better/newer
   - ✅ **Commands in sync**: No action needed

3. **Ask User for Actions**
   After showing the report, ask which commands they want to:
   - Copy from repo to local (update their system)
   - Contribute from local to repo (share with community)
   - Skip (keep different versions)

4. **Contribution Workflow**
   If user wants to contribute:
   - Suggest creating a feature branch
   - Copy selected commands to `user/.claude/commands/`
   - Provide clear commit message
   - Offer to create a pull request with:
     - Description of new/updated commands
     - Why they're useful
     - Any dependencies or requirements

5. **Implementation**
   - Use `cp` to copy files as directed
   - Use `git` commands for contribution workflow
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