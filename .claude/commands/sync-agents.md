---
allowed-tools: Bash(find:*), Bash(diff:*), Bash(cp:*), Bash(ls:*), Read, Write, Grep
description: Sync agents between local and prompts repository
argument-hint: [--pull] [--push] [--status]
---

## Your Task

If the arguments contain "--help", show this help:

```
sync-agents - Synchronize agents between local and repository

Usage: /sync-agents [OPTIONS]

Description:
Compare and synchronize agents between your local ~/.claude/agents/
and the prompts repository user/.claude/agents/. Helps you get updates
and contribute improvements back to the community.

Options:
  --status  Show sync status (default)
  --pull    Update local agents from repository
  --push    Copy local agents to repository for contribution
  --help    Show this help message

Examples:
  /sync-agents           Check sync status
  /sync-agents --pull    Get latest agent updates
  /sync-agents --push    Contribute your improvements

Note: Use /init-agents first if you haven't copied agents yet.
```

Then stop.

Otherwise, synchronize agents:

### 1. Find Agents to Compare
!`find user/.claude/agents -name "*.md" -type f 2>/dev/null | sort`
!`find ~/.claude/agents -name "*.md" -type f 2>/dev/null | sort`

### 2. Analyze Differences

Compare the lists and use diff to find:
- 📤 **Local agents to contribute**: Agents only in ~/.claude/agents/
- 📥 **Repo agents to pull**: Agents only in user/.claude/agents/
- 🔄 **Agents with differences**: Exist in both but differ
- ✅ **Agents in sync**: Identical in both locations

For agents that exist in both locations, check if they differ:
!`diff -q ~/.claude/agents/[agent-name].md user/.claude/agents/[agent-name].md`

### 3. Process Based on Arguments

If `--status` or no arguments:
- Display the analysis from step 2
- Show counts for each category
- List agent names in each category
- Suggest next actions

If `--pull`:
- Show what will be updated
- Ask for confirmation (unless --force)
- Copy agents from repo to local:
  - New agents (not in local)
  - Updated agents (different content)
- Show summary of changes

If `--push`:
- Show what will be contributed
- Ask for confirmation
- Copy agents from local to repo:
  - New agents (not in repo)
  - Updated agents (you've improved)
- Remind to commit and push changes:
  ```
  📝 Next steps to share your agents:
  1. Review changes: git diff user/.claude/agents/
  2. Commit: git add user/.claude/agents/ && git commit -m "Update agents"
  3. Push: git push
  ```

### 4. Detailed Diff Option

For agents with differences, offer to show detailed diff:
```
Agent 'bitcoin-specialist' has differences.
Show detailed diff? (y/n)
```

If yes, display the diff with context.

### 5. Final Summary

Show results:
```
✅ Sync Summary:
- Agents pulled: X
- Agents pushed: Y
- Agents skipped: Z
- Total agents in sync: N

[Any additional instructions based on action taken]
```

### Important Notes
- Never overwrite without confirmation
- Preserve local customizations when pulling
- Check for syntax errors in agent files
- Validate YAML frontmatter