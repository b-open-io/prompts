---
version: 2.0.0
allowed-tools: Read, Write, Edit, Bash(find:*), Bash(diff:*), Bash(cp:*), Bash(ls:*), Bash(sort:*), Bash(stat:*), Bash(grep:*), Bash(sed:*), Bash(awk:*), Bash(head:*), Bash(tail:*), Bash(git:*), Grep, Glob
description: Intelligent agent synchronization with version-aware conflict resolution
argument-hint: [--auto|--repo|--local|--merge|--interactive|--help]
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
- Reads version from YAML frontmatter (version: x.y.z)
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

1. **Gather Information**
   - Find all agents in repository: `find user/.claude/agents -name "*.md" -type f`
   - Find all agents in local: `find ~/.claude/agents -name "*.md" -type f`
   - For each agent, extract version from YAML frontmatter
   - If no version found, use file modification time

2. **Version Extraction Function**
   Use bash to extract version from YAML frontmatter:
   ```bash
   # Extract version from agent file
   grep -m 1 "^version:" "$file" | sed 's/version: *//'
   ```
   If no version, get modification time:
   ```bash
   stat -f "%m" "$file" 2>/dev/null || stat -c "%Y" "$file" 2>/dev/null
   ```

3. **Compare Versions**
   Use semantic versioning comparison:
   - Split version by dots (major.minor.patch)
   - Compare numerically: major first, then minor, then patch
   - If versions equal, compare file content with diff

4. **Build Analysis Table**
   Create a comprehensive status table showing:
   ```
   Agent Sync Analysis:
   ┌─────────────────────┬──────────┬────────┬─────────┬──────────────┐
   │ Agent               │ Local    │ Repo   │ Status  │ Recommended  │
   ├─────────────────────┼──────────┼────────┼─────────┼──────────────┤
   │ auth-specialist     │ 1.2.0    │ 1.3.0  │ 🔵 Repo │ Pull         │
   │ bitcoin-specialist  │ 2.0.0    │ 1.5.0  │ 🟡 Local│ Push         │
   │ code-auditor       │ -        │ 1.0.0  │ ⚪ New  │ Pull         │
   │ design-specialist   │ 1.0.0    │ 1.0.0  │ 🟢 Sync │ No Action    │
   │ prompt-engineer     │ 2.0.0    │ 2.0.0  │ 🟢 Sync │ No Action    │
   └─────────────────────┴──────────┴────────┴─────────┴──────────────┘
   ```

5. **Handle Sync Strategy**

   **--auto (Auto-resolve to newest):**
   - Automatically choose newer version for each agent
   - Use version number if available, else modification time
   - Execute sync without user interaction
   
   **--repo (Pull all from repository):**
   ```bash
   cp -f user/.claude/agents/*.md ~/.claude/agents/
   ```
   
   **--local (Push all to repository):**
   ```bash
   cp -f ~/.claude/agents/*.md user/.claude/agents/
   ```
   
   **--merge (Merge mode):**
   - For each differing agent:
     - Extract unique sections from both versions
     - Combine sections, preferring newer version for conflicts
     - Preserve YAML frontmatter from newer version
     - Write merged result
   
   **--interactive or no args (Interactive selection):**
   Show main menu:
   ```
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
   
   For option 4 (Interactive per agent):
   ```
   bitcoin-specialist.md:
     Local:  v2.0.0 (modified: 2024-01-20 14:23:05)
     Repo:   v1.5.0 (modified: 2024-01-15 09:15:32)
     
     Diff preview (first 5 lines):
     < Local has enhanced Bitcoin Script support
     > Repository version with basic features
     
     [L]ocal | [R]epo | [M]erge | [D]iff (full) | [S]kip: 
   ```

6. **Execute Sync Operations**
   Based on chosen strategy:
   - Copy files as needed
   - Track all changes made
   - Preserve file permissions
   - Validate YAML frontmatter after copy

7. **Git Integration**
   After push operations:
   ```bash
   # Stage changes if in git repository
   if [ -d .git ]; then
       git add user/.claude/agents/*.md
       echo "Changes staged for commit"
   fi
   ```

8. **Generate Summary Report**
   ```
   ✅ Sync Complete!
   
   Summary:
   • Pulled: 5 agents (newer versions from repo)
   • Pushed: 2 agents (newer versions from local)
   • Merged: 1 agent (combined changes)
   • Skipped: 3 agents (already in sync)
   • Conflicts resolved: 1
   
   Details:
   Pulled:
     - auth-specialist (1.2.0 → 1.3.0)
     - code-auditor (new → 1.0.0)
     - mcp-specialist (1.0.0 → 1.1.0)
     - payment-specialist (1.2.0 → 1.3.0)
     - test-specialist (1.0.0 → 1.1.0)
   
   Pushed:
     - bitcoin-specialist (1.5.0 → 2.0.0)
     - optimizer (1.0.0 → 1.2.0)
   
   Merged:
     - design-specialist (combined v1.0.0 changes)
   
   Repository changes staged for commit.
   Run: git commit -m "Sync agents: 5 pulled, 2 pushed, 1 merged"
   ```

9. **Error Handling**
   - Check if directories exist before operations
   - Validate YAML frontmatter format
   - Handle permission errors gracefully
   - Provide rollback information if sync fails
   - Create backup before destructive operations

10. **Version Comparison Logic**
    Implement proper semantic versioning comparison:
    - "2.0.0" > "1.9.9"
    - "1.10.0" > "1.9.0"
    - "1.0.1" > "1.0.0"
    - No version treated as "0.0.0"
    
    For same versions but different content:
    - Mark as 🔴 Conflict
    - Show byte/line differences
    - Require manual resolution

## Implementation Details

### Semantic Version Comparison
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

### Merge Algorithm
For merging agent files:
1. Parse both versions' YAML frontmatter
2. Use newer version's frontmatter
3. Identify unique sections in content
4. Combine sections intelligently
5. Remove duplicate content
6. Preserve formatting and structure

### Safety Features
- Never delete files, only overwrite
- Show preview before destructive operations
- Provide undo instructions
- Validate all YAML frontmatter
- Check file permissions before operations

This advanced sync command provides intelligent version management, multiple sync strategies, and comprehensive conflict resolution for agent synchronization.