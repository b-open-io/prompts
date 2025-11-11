---
version: 3.0.0
allowed-tools: Read, Write, Glob, Bash(diff:*), Bash(cp:*), Bash(git:*), Bash(test:*), Bash(find:*), Bash(grep:*), Bash(stat:*)
description: Intelligent bidirectional synchronization of OPL specialized agents with version management
argument-hint: [--auto] [--repo] [--local] [--merge] [--interactive] [--help]
---

# Agent Sync - Intelligent Version Management

## Your Task

Parse the arguments to determine the action:

### If `--help` is present:
Show this comprehensive help:

```
opl:agents:sync - Intelligent Agent Synchronization

Usage: /opl:agents:sync [OPTIONS]

Description:
Advanced synchronization of agents between ~/.claude/agents/ and the
prompts repository user/.claude/agents/. Features version-aware comparison,
smart conflict resolution, and multiple sync strategies.

Options:
  --auto         Auto-resolve to newest versions (by version or date)
  --repo         Take all agents from repository
  --local        Take all agents from local
  --merge        Merge changes (combine unique sections)
  --interactive  Choose per agent (default)
  --help         Show this help message

Examples:
  /opl:agents:sync                 Interactive mode with analysis
  /opl:agents:sync --auto          Auto-sync to newest versions
  /opl:agents:sync --repo          Pull all from repository
  /opl:agents:sync --local         Push all to repository
  /opl:agents:sync --merge         Merge all changes

Version Detection:
- Reads version from agent YAML frontmatter (version: x.y.z)
- Falls back to file modification time if no version
- Uses semantic versioning rules for comparison

Status Indicators:
  🟢 In sync      - Identical versions
  🔵 Repo newer   - Repository has newer version
  🟡 Local newer  - Local has newer version
  🔴 Conflict     - Different content, same version
  ⚪ New          - Exists only in one location
```

Then stop processing.

### Main Sync Logic:

1. **First-Time Setup Check**
   Check if this is the first time running sync:
   ```bash
   # Ensure Claude directories exist
   if [ ! -d "$HOME/.claude/agents" ]; then
       echo "🔧 First-time setup detected. Creating Claude directories..."
       mkdir -p "$HOME/.claude/agents"
       echo "✅ Claude directories created"
       echo ""
   fi
   ```

2. **Gather Information**
   - Find all agents in repository: `find user/.claude/agents -name "*.md" -type f`
   - Find all agents in local: `find ~/.claude/agents -name "*.md" -type f`
   - For each agent, extract version from YAML frontmatter
   - Get file modification timestamps as fallback

3. **Version Extraction Function**
   Use bash to extract version from agent file:
   ```bash
   # Extract version from agent file
   grep -m 1 "^version:" "$file" 2>/dev/null | sed 's/version: *//'
   ```
   If no version, get modification time:
   ```bash
   stat -f "%m" "$file" 2>/dev/null || stat -c "%Y" "$file" 2>/dev/null
   ```

4. **Compare Versions**
   Use semantic versioning comparison:
   - Split version by dots (major.minor.patch)
   - Compare numerically: major first, then minor, then patch
   - If versions equal, compare file content with diff

5. **Build Analysis Table**
   Create a comprehensive status table showing agent sync status with version comparison.

6. **Handle Sync Strategy**

   **--auto (Auto-resolve to newest):**
   - For each agent, compare versions
   - Pull if repo is newer
   - Push if local is newer
   - Skip if in sync
   - Execute sync without user interaction

   **--repo (Pull all from repository):**
   ```bash
   # Copy all agents from repository
   for agent_file in user/.claude/agents/*.md; do
       if [ -f "$agent_file" ]; then
           agent_name=$(basename "$agent_file")
           echo "Pulling $agent_name..."
           cp "$agent_file" ~/.claude/agents/
       fi
   done
   ```

   **--local (Push all to repository):**
   ```bash
   # Copy all agents to repository
   for agent_file in ~/.claude/agents/*.md; do
       if [ -f "$agent_file" ]; then
           agent_name=$(basename "$agent_file")
           echo "Pushing $agent_name..."
           cp "$agent_file" user/.claude/agents/
       fi
   done
   ```

   **--merge (Merge mode):**
   - For each differing agent:
     - Extract unique sections from both versions
     - Combine mission statements and capabilities
     - Preserve YAML frontmatter from newer version
     - Write merged result

   **--interactive or no args (Interactive with comparison):**
   First show the comparison table, then present options:
   ```
   Agent Sync Analysis:
   ┌─────────────────────┬──────────┬────────┬─────────┬──────────────┐
   │ Agent               │ Local    │ Repo   │ Status  │ Recommended  │
   ├─────────────────────┼──────────┼────────┼─────────┼──────────────┤
   │ prompt-engineer     │ 3.0.0    │ 3.0.1  │ 🔵 Repo │ Pull         │
   │ bitcoin-specialist  │ 1.2.0    │ 1.2.0  │ 🟢 Sync │ No Action    │
   │ design-specialist   │ 2.1.0    │ 2.0.0  │ 🟡 Local│ Push         │
   └─────────────────────┴──────────┴────────┴─────────┴──────────────┘

   Choose sync strategy:
   1. Auto-resolve to newest (recommended)
   2. Pull all from repository
   3. Push all to repository
   4. Interactive selection per agent
   5. Merge mode (combine changes)
   6. Show detailed diffs
   7. Cancel

   Selection:
   ```

7. **Execute Sync Operations**
   Based on chosen strategy:
   - Copy agent files as needed
   - Track all changes made
   - Preserve file permissions
   - Validate YAML frontmatter after copy

8. **Git Integration**
   After push operations:
   ```bash
   # Stage changes if in git repository
   if [ -d .git ]; then
       git add user/.claude/agents/
       echo "Changes staged for commit"
   fi
   ```

9. **Generate Summary Report**
   ```
   ✅ Sync Complete!

   Summary:
   • Pulled: 2 agents (newer versions from repo)
   • Pushed: 1 agent (newer version from local)
   • Merged: 0 agents
   • Skipped: 5 agents (already in sync)

   Details:
   Pulled:
     - prompt-engineer (3.0.0 → 3.0.1)
     - mcp-specialist (2.1.0 → 2.1.1)

   Pushed:
     - design-specialist (2.0.0 → 2.1.0)

   In Sync:
     - bitcoin-specialist (1.2.0)
     - auth-specialist (1.1.0)
     - integration-expert (1.0.5)
     - code-auditor (2.0.0)
     - optimizer (1.0.2)

   Repository changes staged for commit (if applicable).
   ```

### Implementation Details

#### Semantic Version Comparison
Compare versions properly:
```bash
# Function to compare semantic versions
# Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
compare_versions() {
    local v1="$1"
    local v2="$2"

    # Split into components
    IFS='.' read -r maj1 min1 pat1 <<< "$v1"
    IFS='.' read -r maj2 min2 pat2 <<< "$v2"

    # Compare major
    if [ "${maj1:-0}" -gt "${maj2:-0}" ]; then echo 1; return; fi
    if [ "${maj1:-0}" -lt "${maj2:-0}" ]; then echo -1; return; fi

    # Compare minor
    if [ "${min1:-0}" -gt "${min2:-0}" ]; then echo 1; return; fi
    if [ "${min1:-0}" -lt "${min2:-0}" ]; then echo -1; return; fi

    # Compare patch
    if [ "${pat1:-0}" -gt "${pat2:-0}" ]; then echo 1; return; fi
    if [ "${pat1:-0}" -lt "${pat2:-0}" ]; then echo -1; return; fi

    echo 0
}
```

#### Merge Algorithm
For merging agent files:
1. Parse both versions' YAML metadata
2. Use newer version's metadata
3. Identify unique sections in mission and capabilities
4. Combine sections intelligently
5. Remove duplicate content
6. Preserve markdown structure and formatting

### Safety Features
- Never delete files, only overwrite
- Show preview before destructive operations
- Validate YAML frontmatter after operations
- Check file permissions before operations

## Default Behavior (No Arguments)

**AGENT: Perform intelligent comparison and show status:**

1. **Check if local directory is accessible:**
   ```bash
   if [ ! -d "$HOME/.claude/agents" ]; then
       echo "⚠️  Local agents directory not found"
       echo "Creating: $HOME/.claude/agents"
       mkdir -p "$HOME/.claude/agents"
   fi
   ```

2. **Build agent comparison table:**
   ```bash
   # This is a simplified example - implement full comparison logic
   echo "Agent Sync Status:"
   echo "=================="
   echo ""

   # Get all unique agent names from both sides
   all_agents=$(
       { find user/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null;
         find ~/.claude/agents -name "*.md" -exec basename {} .md \; 2>/dev/null; } | sort -u
   )

   # Compare each agent
   for agent in $all_agents; do
       local_ver=""
       repo_ver=""
       indicator=""

       # Get local version
       if [ -f "$HOME/.claude/agents/$agent.md" ]; then
           local_ver=$(grep -m1 "^version:" "$HOME/.claude/agents/$agent.md" 2>/dev/null | cut -d: -f2 | tr -d " ")
       fi

       # Get repo version
       if [ -f "user/.claude/agents/$agent.md" ]; then
           repo_ver=$(grep -m1 "^version:" "user/.claude/agents/$agent.md" 2>/dev/null | cut -d: -f2 | tr -d " ")
       fi

       # Determine status indicator
       if [ -z "$local_ver" ] && [ -n "$repo_ver" ]; then
           indicator="⚪ New in repo"
       elif [ -n "$local_ver" ] && [ -z "$repo_ver" ]; then
           indicator="🟡 Local only"
       elif [ "$local_ver" = "$repo_ver" ]; then
           indicator="🟢 In sync"
       else
           # Compare versions (simplified - implement proper semantic comparison)
           indicator="🔵 Needs sync"
       fi

       printf "%-25s  Local: %-8s  Repo: %-8s  %s\n" "$agent" "${local_ver:--}" "${repo_ver:--}" "$indicator"
   done
   ```

3. **Show sync recommendations:**
   ```bash
   echo ""
   echo "💡 Sync Options:"
   echo "  /opl:agents:sync --auto    - Auto-sync to newest versions"
   echo "  /opl:agents:sync --repo    - Pull all from repository"
   echo "  /opl:agents:sync --local   - Push all to repository"
   echo "  /opl:agents:sync --help    - Show detailed help"
   ```

This advanced sync command provides intelligent version management, multiple sync strategies, and comprehensive conflict resolution for agent synchronization.
