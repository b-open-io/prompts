---
allowed-tools: Bash(find:*), Bash(diff:*), Bash(cp:*), Bash(ls:*), Read, Write, Grep
description: Sync agents between local and prompts repository
argument-hint: [--status] [--pull] [--push] [--help]
---

## Your Task

If the arguments contain "--help", show this help:

```
opl:agents:sync - Synchronize agents between local and repository

Usage: /opl:agents:sync [OPTIONS]

Description:
Compare and synchronize agents between your local ~/.claude/agents/
and the prompts repository user/.claude/agents/. Helps you get updates
and contribute improvements back to the community.

Options:
  --status  Show detailed sync status report
  --pull    Pull latest from repository (no prompt)
  --push    Push local to repository (no prompt)
  --help    Show this help message

Examples:
  /opl:agents:sync           Show quick menu
  /opl:agents:sync --status  See detailed status
  /opl:agents:sync --pull    Get latest agent updates
  /opl:agents:sync --push    Contribute your improvements

Note: Use /opl:agents:init first if you haven't copied agents yet.
```

Then stop.

Otherwise, synchronize agents:

### 1. Quick Analysis
First, do a quick comparison to determine if there are any differences:
!`find user/.claude/agents -name "*.md" -type f 2>/dev/null | sort > /tmp/repo_agents.txt`
!`find ~/.claude/agents -name "*.md" -type f 2>/dev/null | sort > /tmp/local_agents.txt`

### 2. Process Based on Arguments

**If no arguments (default):**
Show simple numbered menu:
```
Agent Sync Options:
1. Pull latest from repository (replace local)
2. Push local to repository
3. Review differences

Choose an option (1-3):
```

Wait for user input and execute the chosen action.

**If `--status`:**
Perform detailed analysis:
- 📤 **Local agents to contribute**: Agents only in ~/.claude/agents/
- 📥 **Repo agents to pull**: Agents only in user/.claude/agents/
- 🔄 **Agents with differences**: Exist in both but differ
- ✅ **Agents in sync**: Identical in both locations

Show counts and list agent names in each category.

**If `--pull`:**
Immediately execute pull without prompts:
- Copy all agents from repo to local
- Show summary of changes

**If `--push`:**
Immediately execute push without prompts:
- Copy all agents from local to repo
- Show reminder to commit and push git changes

**If option 3 (Review differences) is chosen:**
Show a concise diff summary:
- List agents that differ
- Show first few lines of differences for each
- Ask if user wants to see full diff for any specific agent

### 3. Execute Actions

For Pull operations:
```bash
# Copy all agents from repo to local
cp -f user/.claude/agents/*.md ~/.claude/agents/
```

For Push operations:
```bash
# Copy all agents from local to repo
cp -f ~/.claude/agents/*.md user/.claude/agents/
```

For Review:
Show condensed diff output for agents that differ.

### 4. Final Summary

Show results:
```
✅ Sync Complete:
- Agents synced: X
- Action taken: [Pull/Push/Review]

[Any additional instructions based on action taken]
```

### Important Notes
- Default behavior is fast with simple menu
- --pull and --push execute immediately without confirmation
- --status provides detailed analysis for power users
- Validate YAML frontmatter in agent files