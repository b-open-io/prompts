---
allowed-tools: Bash(diff:*), Bash(git:*), Bash(cp:*), Bash(test:*), Bash(echo:*), Read, Write, Edit, Grep, Glob
description: Intelligent command synchronization with version management
argument-hint: [--auto] [--repo] [--local] [--merge] [--interactive] [--help]
---

# Command Sync - Intelligent Version Management

## Your Task

Parse the arguments to determine the action:

### If `--help` is present:
Show this comprehensive help:

```
opl:commands:sync - Intelligent Command Synchronization

Usage: /opl:commands:sync [OPTIONS]

Description:
Advanced synchronization of commands between ~/.claude/commands/ and the
prompts repository user/.claude/commands/. Features version-aware comparison,
smart conflict resolution, and multiple sync strategies.

Options:
  --auto         Auto-resolve to newest versions (by version or date)
  --repo         Take all commands from repository
  --local        Take all commands from local
  --merge        Merge changes (combine unique sections)
  --interactive  Choose per command (default)
  --help         Show this help message

Examples:
  /opl:commands:sync                 Interactive mode with analysis
  /opl:commands:sync --auto          Auto-sync to newest versions
  /opl:commands:sync --repo          Pull all from repository
  /opl:commands:sync --local         Push all to repository
  /opl:commands:sync --merge         Merge all changes

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

1. **First-Time Setup Check**
   Check if this is the first time running sync:
   ```bash
   # Ensure Claude directories exist
   if [ ! -d "$HOME/.claude/commands" ]; then
       echo "🔧 First-time setup detected. Creating Claude directories..."
       mkdir -p "$HOME/.claude/commands"
       echo "✅ Claude directories created"
       echo ""
   fi
   ```

2. **Gather Information**
   - Find all commands in repository: `find user/.claude/commands -name "*.md" -type f`
   - Find all commands in local: `find ~/.claude/commands -name "*.md" -type f`
   - For each command, extract version from YAML frontmatter, and the last modified timestamp
   - Even if the version is found, still consider the file modification time

3. **Version Extraction Function**
   Use bash to extract version from YAML frontmatter:
   ```bash
   # Extract version from command file
   grep -m 1 "^version:" "$file" | sed 's/version: *//'
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
   Create a comprehensive status table showing:
   ```
   Command Sync Analysis:
   ┌─────────────────────┬──────────┬────────┬─────────┬──────────────┐
   │ Command             │ Local    │ Repo   │ Status  │ Recommended  │
   ├─────────────────────┼──────────┼────────┼─────────┼──────────────┤
   │ opl/dev/lint        │ 1.2.0    │ 1.3.0  │ 🔵 Repo │ Pull         │
   │ opl/utils/find      │ 2.0.0    │ 1.5.0  │ 🟡 Local│ Push         │
   │ opl/mcp/install     │ -        │ 1.0.0  │ ⚪ New  │ Pull         │
   │ opl/design/setup    │ 1.0.0    │ 1.0.0  │ 🟢 Sync │ No Action    │
   └─────────────────────┴──────────┴────────┴─────────┴──────────────┘
   ```

6. **Handle Sync Strategy**

   **--auto (Auto-resolve to newest):**
   - Automatically choose newer version for each command
   - Use version number if available, else modification time
   - Execute sync without user interaction
   
   **--repo (Pull all from repository):**
   ```bash
   cp -rf user/.claude/commands/* ~/.claude/commands/
   ```
   
   **--local (Push all to repository):**
   ```bash
   cp -rf ~/.claude/commands/* user/.claude/commands/
   ```
   
   **--merge (Merge mode):**
   - For each differing command:
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
   4. Interactive selection per command
   5. Merge mode (combine changes)
   6. Show detailed diffs
   7. Cancel
   
   Selection: 
   ```
   
   For option 4 (Interactive per command):
   ```
   opl/utils/find.md:
     Local:  v2.0.0 (modified: 2024-01-20 14:23:05)
     Repo:   v1.5.0 (modified: 2024-01-15 09:15:32)
     
     Diff preview (first 5 lines):
     < Local has enhanced search capabilities
     > Repository version with basic features
     
     [L]ocal | [R]epo | [M]erge | [D]iff (full) | [S]kip: 
   ```

7. **Execute Sync Operations**
   Based on chosen strategy:
   - Copy files as needed
   - Track all changes made
   - Preserve file permissions
   - Validate YAML frontmatter after copy

8. **Git Integration**
   After push operations:
   ```bash
   # Stage changes if in git repository
   if [ -d .git ]; then
       git add user/.claude/commands/
       echo "Changes staged for commit"
   fi
   ```

9. **Generate Summary Report**
   ```
   ✅ Sync Complete!
   
   Summary:
   • Pulled: 5 commands (newer versions from repo)
   • Pushed: 2 commands (newer versions from local)
   • Merged: 1 command (combined changes)
   • Skipped: 3 commands (already in sync)
   • Conflicts resolved: 1
   
   Details:
   Pulled:
     - opl/dev/lint (1.2.0 → 1.3.0)
     - opl/mcp/install (new → 1.0.0)
     - opl/utils/search (1.0.0 → 1.1.0)
   
   Pushed:
     - opl/utils/find (1.5.0 → 2.0.0)
     - opl/design/setup (1.0.0 → 1.2.0)
   
   Merged:
     - opl/integrations/stripe (combined v1.0.0 changes)
   
   Repository changes staged for commit.
   Run: git commit -m "Sync commands: 5 pulled, 2 pushed, 1 merged"
   ```

For Pull/Push operations, show this reminder at the END:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  RESTART REQUIRED - Updated commands won't work until you:
   1. Press Ctrl+C to exit Claude Code
   2. Run 'claude -c' to resume your conversation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Important Notes
- Default behavior is fast with simple menu
- --pull and --push execute immediately without confirmation
- --status provides detailed analysis for power users
- Preserve directory structure when syncing