---
allowed-tools: Read, Write, Glob, Bash(diff:*), Bash(cp:*)
description: Sync hooks between repository and local installation
argument-hint: [--status] [--update]
---

## Your Task

If the arguments contain "--help", show this help:

```
sync-hooks - Synchronize Claude Code hooks with the prompts repository

Usage: /sync-hooks [OPTIONS]

Description:
Check for updates to installed hooks and sync new hooks from the repository.
Helps you keep your hooks up to date with the latest improvements.

Options:
  --status   Show which hooks have updates available (default)
  --update   Update all outdated hooks
  --help     Show this help message

Examples:
  /sync-hooks           Check for hook updates
  /sync-hooks --update  Update all hooks to latest versions

Note: This updates hook definitions, not your settings.json configuration.
```

Then stop.

Otherwise, sync hook definitions:

### 1. Find Repository Hooks
!`find user/.claude/hooks -name "*.json" -type f | sort`

### 2. Find Installed Hook References

Check both locations for installed hooks:
- Project: `.claude/settings.json`  
- User: `~/.claude/settings.json`

For each settings file that exists:
1. Read the file
2. Extract which hooks are configured
3. Note the location (project/user)

### 3. Compare Versions

For each installed hook:
1. Check if the source hook file still exists in repo
2. Compare versions between repo and what user has
3. Note any new hooks available in repo but not installed

### 4. Process Based on Arguments

If `--status` or no arguments:
```
📊 Hook Sync Status:

✅ Up to date (X hooks):
- hook-name (v1.0.0)

🔄 Updates available (Y hooks):
- hook-name (v1.0.0 → v1.1.0)

🆕 New hooks available (Z hooks):
- new-hook-name - Description

Use /sync-hooks --update to update outdated hooks
Use /init-hooks to install new hooks
```

If `--update`:
1. For each hook with updates:
   - Show what changed (if description available)
   - Copy new version from repo to local cache
   - Note: This updates the hook definition only
   
2. Show summary:
```
✅ Updated X hook definitions

Note: Hook configurations in settings.json were not changed.
To apply updates, you may need to:
1. Review changes in the hook files
2. Manually update settings.json if needed
3. Restart Claude Code for changes to take effect
```

### 5. Important Notes

- Only update hook definition files, not user's settings.json
- Preserve user's hook customizations in settings.json
- Clearly indicate what was updated
- Remind about new hooks that could be installed