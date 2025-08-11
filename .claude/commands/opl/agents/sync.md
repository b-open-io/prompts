---
version: 2.1.1
allowed-tools: Read, Write, Edit, Bash
description: Intelligent bidirectional synchronization of OPL specialized agents with version management
argument-hint: [--help|--auto|--repo|--local|--merge|--interactive]
---

# Agent Synchronization System

Intelligent bidirectional synchronization between repository agents (`user/.claude/agents/`) and local agents (`~/.claude/agents/`).

## 🚀 Quick Status (One-Liners)

!`echo "📊 Repository: $(ls user/.claude/agents/*.md 2>/dev/null | wc -l) agents available"`

!`echo "🔑 Permission Status: $(grep -q '~/.claude' .claude/settings.json 2>/dev/null && echo '✅ ~/.claude access configured' || echo '⚠️ ~/.claude not in additionalDirectories - sync may require permission setup')"`

!`echo "💡 Quick Sync: Run '/opl:agents:sync --repo' to pull all agents from repository"`

## Quick Usage
- `sync` - Interactive status overview and sync options
- `sync --auto` - Auto-resolve version conflicts intelligently
- `sync --repo` - Pull all agents from repository to local (overwrite)
- `sync --local` - Push all local agents to repository (overwrite)
- `sync --merge` - Attempt semantic merging of conflicted agents
- `sync --interactive` - Step-by-step interactive resolution
- `sync --help` - Show this detailed help

## Detailed Help

### Core Features
- **Version-Aware**: Compares semantic versions (2.1.0 > 2.0.9)
- **Conflict Detection**: Identifies when both sides have changes
- **Multiple Strategies**: Auto, interactive, directional, merge modes
- **Status Analysis**: Visual table with sync status indicators
- **Git Integration**: Stages repository changes after sync
- **Safe Operations**: Creates backups before destructive changes

### Status Indicators
- 🟢 **In Sync** - Versions match, no action needed
- 🔵 **Repo Newer** - Repository has newer version
- 🟡 **Local Newer** - Local has newer version  
- 🔴 **Conflict** - Both sides modified (different versions)
- ⚪ **New** - Agent exists on one side only
- ❓ **Unknown** - No version info available

### Sync Strategies

#### --auto (Smart Resolution)
- Pull newer versions automatically
- For conflicts: choose higher version number
- Skip if versions are equal but content differs
- Safe for most scenarios

#### --repo (Repository Override)
- Force pull all agents from repository
- Overwrites local versions completely
- Use when repository is authoritative

#### --local (Local Override) 
- Force push all local agents to repository
- Overwrites repository versions completely
- Use when local changes are authoritative

#### --merge (Semantic Merge)
- Attempt to merge conflicted agents intelligently
- Combines mission statements and capabilities
- Preserves unique content from both sides
- Fallback to interactive on complex conflicts

#### --interactive (Manual Resolution)
- Present each conflict individually
- Show diff and version information
- Choose action per agent: pull, push, skip, merge
- Full control over resolution

### Version Management
- Extracts versions from YAML frontmatter
- Treats missing versions as 0.0.0
- Uses proper semantic version comparison
- Updates version metadata during operations

---

Current directory: !`pwd`

!`echo "$ARGUMENTS" | grep -q -- "--help" && echo "=== HELP: Agent Sync Commands ===" && echo "/opl:agents:sync --repo = Pull all from repository" && echo "/opl:agents:sync --local = Push all to repository" && echo "/opl:agents:sync --auto = Auto-sync (same as --repo)" && echo "No args = Status analysis"`

**AGENT INSTRUCTIONS: Follow these step-by-step commands to perform sync operations**

## For --auto or --repo: Pull All Agents from Repository to Local

1. **First, ensure ~/.claude access (skip if already configured):**
   The cp command below will work if ~/.claude is accessible. If it fails with a permission error, you'll need to add ~/.claude to additionalDirectories in .claude/settings.json and restart Claude Code.

2. **Copy all agents from repository to local:**
   ```bash
   cp user/.claude/agents/*.md ~/.claude/agents/
   ```

3. **Verify the copy:**
   ```bash
   echo "✅ Sync complete: Copied $(ls user/.claude/agents/*.md | wc -l) agents to local"
   ```

## For --local: Push All Agents from Local to Repository

1. **Copy all agents from local to repository:**
   ```bash  
   cp ~/.claude/agents/*.md user/.claude/agents/
   ```

2. **Stage the changes:**
   ```bash
   git add user/.claude/agents/
   ```

3. **Confirm staging:**
   ```bash
   echo "✅ Sync complete: Pushed agents to repository and staged for commit"
   ```

## Status Analysis (No arguments)

**AGENT INSTRUCTIONS: Run these commands to analyze sync status**

1. **List repository agents:**
   ```bash
   echo "Repository agents:"
   find user/.claude/agents -name "*.md" -exec basename {} .md \; | sort
   ```

2. **Note about local agents:**
   ```bash
   echo "Note: Local agent listing requires ~/.claude in additionalDirectories"
   echo "To sync, simply run: cp user/.claude/agents/*.md ~/.claude/agents/"
   ```

**Repository Version Summary:**
```bash
echo "Repository Agent Versions:"
for agent in user/.claude/agents/*.md; do
  name=$(basename "$agent" .md)
  version=$(grep -m 1 "^version:" "$agent" 2>/dev/null | sed 's/version: *//')
  printf "  %-25s %s\n" "$name:" "$version"
done | sort
```

🎯 **Sync Options:**
- `/opl:agents:sync --auto` - Auto-resolve conflicts
- `/opl:agents:sync --repo` - Pull all from repository  
- `/opl:agents:sync --local` - Push all to repository
- `/opl:agents:sync --help` - Show detailed help

## Default Status Analysis (No Arguments)

**AGENT: Run these commands for repository analysis:**

1. **Repository agent overview:**
   ```bash
   echo "Repository Agent Status:"
   echo "======================="
   echo "Total agents: $(ls user/.claude/agents/*.md 2>/dev/null | wc -l)"
   echo ""
   echo "Agent versions:"
   for f in user/.claude/agents/*.md; do
     agent=$(basename "$f" .md)
     version=$(grep -m1 "^version:" "$f" | cut -d: -f2 | tr -d ' ')
     printf "  %-25s %s\n" "$agent:" "$version"
   done | sort
   ```

2. **Quick sync command:**
   ```bash
   echo ""
   echo "💡 To sync all agents to local ~/.claude:"
   echo "   cp user/.claude/agents/*.md ~/.claude/agents/"
   echo ""
   echo "Note: If you get a permission error, add ~/.claude to additionalDirectories"
   echo "in .claude/settings.json and restart Claude Code."
   ```

