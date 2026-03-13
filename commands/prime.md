---
allowed-tools: Agent
description: Context warm-up — loads git state, plugin inventory, and project conventions before starting work
argument-hint: [--help]
---

## Your Task

If the arguments contain "--help", show this help and exit:

**prime** - Context warm-up for the bopen-tools plugin

**Usage:** `/prime`

**Description:**
Front-loads current git state, plugin inventory (agents/skills/commands), and project conventions into context before starting work. Run this at the start of a session to avoid duplicating existing work or using stale naming conventions.

**What it loads:**
- Git status, recent commits, current branch
- Recent diff to surface work in progress
- Full inventory of agents, skills, and commands
- CLAUDE.md project conventions

Then stop.

Otherwise, delegate ALL context gathering to a subagent. Do not read files or run commands in the main context.

Use the Agent tool with this prompt:

```
Agent(prompt: "Gather project context for the bopen-tools plugin and return a formatted priming report.

Step 1 — Git state:
Run: git branch --show-current, git status --short, git log --oneline -5, git diff --stat HEAD~1 (ignore errors if no previous commit)

Step 2 — Plugin inventory:
Run: ls agents/ | sort, ls skills/ | sort, find commands -name '*.md' | sort

Step 3 — Read project conventions:
Read CLAUDE.md in the project root. Extract the 5-8 most relevant bullet points for day-to-day editing of agents/skills/commands (version policy, naming conventions, directory rules, etc.)

Step 4 — Return ONLY this formatted report:

## Plugin Context: bopen-tools

### Git State
- Branch: <current branch>
- Uncommitted changes: <none | list of files>
- Last 5 commits: <one-line each>
- Recently modified: <files from diff stat, or none>

### Work in Progress
<Any uncommitted or recently touched files that suggest active work — call these out explicitly so they are not accidentally overwritten>

### Inventory
- Agents (<count>): <comma-separated names without .md>
- Skills (<count>): <comma-separated directory names>
- Commands (<count>): <relative paths from commands/ root>

### Project Conventions
<5-8 bullet points from CLAUDE.md>

### Ready
Context loaded. What would you like to work on?

Keep the report tight — no padding.",
subagent_type: "general-purpose")
```

Print the subagent's response directly to the user.
