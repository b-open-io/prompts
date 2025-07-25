---
allowed-tools: Bash(find:*), Bash(cp:*), Bash(mkdir:*), Bash(ls:*), Read, Write
description: Initialize or update local agents from the prompts repository
argument-hint: [--list] [--force]
---

## Your Task

If the arguments contain "--help", show this help:

```
init-agents - Initialize or update agents from prompts repository to local

Usage: /init-agents [OPTIONS]

Description:
Copies agents from the prompts repository (user/.claude/agents/) to your 
local user agents directory (~/.claude/agents/). This makes the
specialized agents available across all your projects.

Options:
  --list   Show available agents without copying
  --force  Overwrite existing agents without prompting
  --help   Show this help message

Examples:
  /init-agents           Copy all new agents (skip existing)
  /init-agents --list    See what agents are available
  /init-agents --force   Update all agents (overwrite)

Note: Project agents (.claude/agents/) take precedence over user agents.
Use /sync-agents to manage updates and contributions.
```

Then stop.

Otherwise, initialize agents from the repository:

### 1. Check Directories
- Verify `user/.claude/agents/` exists and contains agents
- Create `~/.claude/agents/` if it doesn't exist

### 2. Find Available Agents
!`find user/.claude/agents -name "*.md" -type f | sort`

### 3. Process Based on Arguments

If `--list` is specified:
- Show all available agents with descriptions
- Read each agent file to extract name and description
- Display in a formatted list
- Stop after listing

If `--force` is specified:
- Copy all agents from repo to user directory
- Overwrite any existing agents
- Show progress for each agent copied

Otherwise (default behavior):
- For each agent in the repository:
  - Check if it exists in user directory
  - If not, copy it
  - If it exists, skip it (note which were skipped)
- Report summary of actions taken

### 4. Summary Report
After processing, show:
- Number of agents copied
- Number of agents skipped (already exist)
- Number of agents updated (if --force)
- Total agents now available

### 5. Usage Instructions
Remind the user:
```
✅ Agents initialized successfully!

The following specialized agents are now available:
[List the agents that were copied]

Claude Code will automatically use these agents when appropriate,
or you can request them explicitly:
  "Use the bitcoin-specialist agent to..."
  "Have the code-auditor review..."

For more agent management options, see:
  /sync-agents - Sync and update agents
  /agents - Interactive agent management

**Important:** You must exit Claude Code and resume your session
before the /agents command will work with the newly installed agents.
```