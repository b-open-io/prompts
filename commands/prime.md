---
allowed-tools: Read, Bash(git:*), Bash(ls:*), Bash(find:*), Bash(wc:*)
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

Otherwise, execute the following steps in order and produce the report:

**Step 1 — Git state**

```bash
echo "=== Branch ===" && git branch --show-current
echo "=== Status ===" && git status --short
echo "=== Recent commits ===" && git log --oneline -5
echo "=== Recent changes ===" && git diff --stat HEAD~1 2>/dev/null || echo "(no previous commit)"
```

**Step 2 — Plugin inventory**

```bash
echo "=== Agents ===" && ls agents/
echo "=== Skills ===" && ls skills/
echo "=== Commands ===" && find commands -name "*.md" | sort
```

**Step 3 — Read project conventions**

Read @CLAUDE.md.

**Step 4 — Produce the priming report**

Output a concise report with these sections:

```
## Plugin Context: bopen-tools

### Git State
- Branch: <current branch>
- Uncommitted changes: <none | list of files>
- Last 5 commits: <list>
- Recently modified: <files from diff stat, or none>

### Work in Progress
<Any uncommitted or recently touched files that suggest active work — call these out explicitly>

### Inventory
- Agents (<count>): <comma-separated list of names without .md>
- Skills (<count>): <comma-separated list of directory names>
- Commands (<count>): <relative paths from commands/ root>

### Project Conventions (key points)
<5–8 bullet points extracted from CLAUDE.md that are most relevant to day-to-day editing of agents/skills/commands — version policy, naming conventions, directory rules, etc.>

### Ready
Context loaded. What would you like to work on?
```

Keep the report tight — no padding. Surface anything that looks like active work in progress so it is not accidentally overwritten.
