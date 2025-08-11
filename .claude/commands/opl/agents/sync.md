---
version: 2.0.0
allowed-tools: Read, Write, Edit, Bash
description: Intelligent bidirectional synchronization of OPL specialized agents with version management
argument-hint: [--help|--auto|--repo|--local|--merge|--interactive]
---

# Agent Synchronization System

Intelligent bidirectional synchronization between repository agents (`user/.claude/agents/`) and local agents (`~/.claude/agents/`).

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

1. **First, add ~/.claude as working directory if needed:**
   ```bash
   ls ~/.claude/agents/
   ```
   (If this fails, Claude will prompt to add ~/.claude as working directory - approve it)

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

2. **List local agents (requires ~/.claude access):**
   ```bash
   echo "Local agents:"
   find ~/.claude/agents -name "*.md" -exec basename {} .md \; | sort
   ```

**Quick Version Check:**
For detailed analysis with status indicators (🟢🔵🟡🔴⚪), run these manual commands:

```bash
# Check versions for each agent
for agent in $(find user/.claude/agents -name "*.md" -exec basename {} .md \; | sort); do
  repo_version=$(grep -m 1 "^version:" "user/.claude/agents/$agent.md" 2>/dev/null | sed 's/version: *//')
  local_version=$(grep -m 1 "^version:" "$HOME/.claude/agents/$agent.md" 2>/dev/null | sed 's/version: *//')
  
  if [ ! -f "$HOME/.claude/agents/$agent.md" ]; then
    echo "⚪ $agent: repo=$repo_version, local=missing → Pull to local"
  elif [ ! -f "user/.claude/agents/$agent.md" ]; then
    echo "⚪ $agent: repo=missing, local=$local_version → Push to repo"
  elif [ "$repo_version" = "$local_version" ]; then
    if cmp -s "user/.claude/agents/$agent.md" "$HOME/.claude/agents/$agent.md"; then
      echo "🟢 $agent: versions match ($repo_version) → In sync"
    else
      echo "🔴 $agent: same version ($repo_version) but different content → Conflict"
    fi
  else
    echo "🔵🟡 $agent: repo=$repo_version, local=$local_version → Version diff"
  fi
done
```

🎯 **Sync Options:**
- `/opl:agents:sync --auto` - Auto-resolve conflicts
- `/opl:agents:sync --repo` - Pull all from repository  
- `/opl:agents:sync --local` - Push all to repository
- `/opl:agents:sync --help` - Show detailed help

## Default Status Analysis (No Arguments)

For detailed sync analysis with status indicators (🟢🔵🟡🔴⚪), run this analysis:

```bash
# Get all unique agent names from both locations
echo "📊 Agent Synchronization Analysis"
echo "================================="
echo ""

# List repository agents
echo "Repository agents:"
find user/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null | sort

echo ""
echo "Local agents:"
find ~/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null | sort || echo "No local agents found"

echo ""
echo "Version Analysis:"
echo "----------------"

# Check each agent
for agent in $(find user/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null | sort); do
  repo_file="user/.claude/agents/$agent.md"
  local_file="$HOME/.claude/agents/$agent.md"
  
  repo_version=$(grep -m 1 "^version:" "$repo_file" 2>/dev/null | sed 's/version: *//')
  local_version=$(grep -m 1 "^version:" "$local_file" 2>/dev/null | sed 's/version: *//')
  
  if [ ! -f "$local_file" ]; then
    echo "⚪ $agent: repo=$repo_version, local=missing → Use /opl:agents:sync --repo"
  elif [ "$repo_version" = "$local_version" ]; then
    if cmp -s "$repo_file" "$local_file" 2>/dev/null; then
      echo "🟢 $agent: $repo_version → In sync"
    else
      echo "🔴 $agent: $repo_version → Same version but content differs"
    fi
  else
    echo "🔵🟡 $agent: repo=$repo_version, local=$local_version → Version mismatch"
  fi
done

# Check for local-only agents
for local_agent in $(find ~/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null | sort); do
  if [ ! -f "user/.claude/agents/$local_agent.md" ]; then
    local_version=$(grep -m 1 "^version:" "$HOME/.claude/agents/$local_agent.md" 2>/dev/null | sed 's/version: *//')
    echo "⚪ $local_agent: repo=missing, local=$local_version → Use /opl:agents:sync --local"
  fi
done
```

This analysis will show you exactly which agents need syncing and the recommended action.

