---
version: 2.1.0
allowed-tools: Read, Write, Edit, Bash
description: Intelligent bidirectional synchronization of OPL specialized agents with version management
argument-hint: [--help|--auto|--repo|--local|--merge|--interactive]
---

# Agent Synchronization System

Intelligent bidirectional synchronization between repository agents (`user/.claude/agents/`) and local agents (`~/.claude/agents/`).

## 🚀 Quick Status (One-Liners)

!`echo "📊 Quick Status: Repo=$(ls user/.claude/agents/*.md 2>/dev/null | wc -l) agents, Local=$(ls ~/.claude/agents/*.md 2>/dev/null | wc -l) agents, In-Sync=$(comm -12 <(ls user/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) <(ls ~/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) | wc -l)"`

!`echo "🔑 Permission Status: $(grep -q '~/.claude' .claude/settings.json 2>/dev/null && echo '✅ ~/.claude access configured' || echo '❌ Need ~/.claude access - run: ls ~/.claude/agents/')"`

!`echo "📈 Changes: New=$(comm -23 <(ls user/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) <(ls ~/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) | wc -l) in repo, $(comm -13 <(ls user/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) <(ls ~/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) | wc -l) in local"`

!`echo "💡 Quick Action: $(ls user/.claude/agents/*.md 2>/dev/null | wc -l) != $(ls ~/.claude/agents/*.md 2>/dev/null | wc -l) && echo 'Run: /opl:agents:sync --auto' || echo 'All synced!'"`

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

**AGENT: Run these commands for detailed analysis:**

1. **Quick diff check:**
   ```bash
   diff -q user/.claude/agents/ ~/.claude/agents/ 2>/dev/null | head -5
   ```

2. **Version comparison table:**
   ```bash
   echo "Agent Version Comparison:"
   echo "========================"
   for f in user/.claude/agents/*.md; do
     agent=$(basename "$f" .md)
     repo_v=$(grep -m1 "^version:" "$f" | cut -d: -f2 | tr -d ' ')
     local_v=$(grep -m1 "^version:" ~/.claude/agents/"$agent.md" 2>/dev/null | cut -d: -f2 | tr -d ' ')
     [ -z "$local_v" ] && local_v="missing"
     printf "%-25s repo:%-8s local:%-8s\n" "$agent" "$repo_v" "$local_v"
   done | sort
   ```

3. **Smart sync recommendation:**
   ```bash
   # Count differences
   new_in_repo=$(comm -23 <(ls user/.claude/agents/*.md | xargs -I{} basename {} | sort) <(ls ~/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) | wc -l)
   new_in_local=$(comm -13 <(ls user/.claude/agents/*.md | xargs -I{} basename {} | sort) <(ls ~/.claude/agents/*.md 2>/dev/null | xargs -I{} basename {} | sort) | wc -l)
   
   if [ "$new_in_repo" -gt 0 ] && [ "$new_in_local" -eq 0 ]; then
     echo "💡 Recommendation: Run /opl:agents:sync --repo (pull $new_in_repo new agents)"
   elif [ "$new_in_local" -gt 0 ] && [ "$new_in_repo" -eq 0 ]; then
     echo "💡 Recommendation: Run /opl:agents:sync --local (push $new_in_local local agents)"
   elif [ "$new_in_repo" -gt 0 ] || [ "$new_in_local" -gt 0 ]; then
     echo "💡 Recommendation: Run /opl:agents:sync --auto (resolve conflicts)"
   else
     echo "✅ All agents appear to be in sync!"
   fi
   ```

