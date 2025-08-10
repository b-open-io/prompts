---
allowed-tools: Read, Write, Glob, Bash(diff:*), Bash(cp:*), Bash(git:*), Bash(test:*)
description: Intelligent hook synchronization with version management
argument-hint: [--auto] [--repo] [--local] [--merge] [--interactive] [--help]
---

# Hook Sync - Intelligent Version Management

## Your Task

Parse the arguments to determine the action:

### If `--help` is present:
Show this comprehensive help:

```
opl:hooks:sync - Intelligent Hook Synchronization

Usage: /opl:hooks:sync [OPTIONS]

Description:
Advanced synchronization of hooks between ~/.claude/hooks/ and the
prompts repository user/.claude/hooks/. Features version-aware comparison,
smart conflict resolution, and multiple sync strategies.

Options:
  --auto         Auto-resolve to newest versions (by version or date)
  --repo         Take all hooks from repository
  --local        Take all hooks from local
  --merge        Merge changes (combine unique sections)
  --interactive  Choose per hook (default)
  --help         Show this help message

Examples:
  /opl:hooks:sync                 Interactive mode with analysis
  /opl:hooks:sync --auto          Auto-sync to newest versions
  /opl:hooks:sync --repo          Pull all from repository
  /opl:hooks:sync --local         Push all to repository
  /opl:hooks:sync --merge         Merge all changes

Version Detection:
- Reads version from JSON metadata (version: "x.y.z")
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
   if [ ! -d "$HOME/.claude/hooks" ]; then
       echo "🔧 First-time setup detected. Creating Claude directories..."
       mkdir -p "$HOME/.claude/hooks"
       echo "✅ Claude directories created"
       echo ""
   fi
   ```

2. **Gather Information**
   - Find all hooks in repository: `find user/.claude/hooks -name "*.json" -type f`
   - Find all hooks in local: `find ~/.claude/hooks -name "*.json" -type f`
   - For each hook, extract version from JSON metadata, and the last modified timestamp
   - Even if the version is found, still consider the file modification time

3. **Version Extraction Function**
   Use bash to extract version from JSON:
   ```bash
   # Extract version from hook file
   grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$file" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
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
   Hook Sync Analysis:
   ┌─────────────────────┬──────────┬────────┬─────────┬──────────────┐
   │ Hook                │ Local    │ Repo   │ Status  │ Recommended  │
   ├─────────────────────┼──────────┼────────┼─────────┼──────────────┤
   │ user-prompt-submit  │ 1.2.0    │ 1.3.0  │ 🔵 Repo │ Pull         │
   │ post-tool-use       │ 2.0.0    │ 1.5.0  │ 🟡 Local│ Push         │
   │ pre-conversation    │ -        │ 1.0.0  │ ⚪ New  │ Pull         │
   │ error-handler       │ 1.0.0    │ 1.0.0  │ 🟢 Sync │ No Action    │
   └─────────────────────┴──────────┴────────┴─────────┴──────────────┘
   ```

6. **Handle Sync Strategy**

   **--auto (Auto-resolve to newest):**
   - Automatically choose newer version for each hook
   - Use version number if available, else modification time
   - Execute sync without user interaction
   
   **--repo (Pull all from repository):**
   ```bash
   cp -rf user/.claude/hooks/* ~/.claude/hooks/
   ```
   
   **--local (Push all to repository):**
   ```bash
   cp -rf ~/.claude/hooks/* user/.claude/hooks/
   ```
   
   **--merge (Merge mode):**
   - For each differing hook:
     - Extract unique sections from both versions
     - Combine sections, preferring newer version for conflicts
     - Preserve JSON metadata from newer version
     - Write merged result
   
   **--interactive or no args (Interactive selection):**
   Show main menu:
   ```
   Choose sync strategy:
   1. Auto-resolve to newest (recommended)
   2. Pull all from repository
   3. Push all to repository  
   4. Interactive selection per hook
   5. Merge mode (combine changes)
   6. Show detailed diffs
   7. Cancel
   
   Selection: 
   ```
   
   For option 4 (Interactive per hook):
   ```
   user-prompt-submit.json:
     Local:  v2.0.0 (modified: 2024-01-20 14:23:05)
     Repo:   v1.5.0 (modified: 2024-01-15 09:15:32)
     
     Diff preview (first 5 lines):
     < Local has enhanced validation
     > Repository version with basic features
     
     [L]ocal | [R]epo | [M]erge | [D]iff (full) | [S]kip: 
   ```

7. **Execute Sync Operations**
   Based on chosen strategy:
   - Copy files as needed
   - Track all changes made
   - Preserve file permissions
   - Validate JSON syntax after copy

8. **Git Integration**
   After push operations:
   ```bash
   # Stage changes if in git repository
   if [ -d .git ]; then
       git add user/.claude/hooks/
       echo "Changes staged for commit"
   fi
   ```

9. **Generate Summary Report**
   ```
   ✅ Sync Complete!
   
   Summary:
   • Pulled: 3 hooks (newer versions from repo)
   • Pushed: 1 hook (newer versions from local)
   • Merged: 1 hook (combined changes)
   • Skipped: 2 hooks (already in sync)
   • Conflicts resolved: 1
   
   Details:
   Pulled:
     - user-prompt-submit (1.2.0 → 1.3.0)
     - pre-conversation (new → 1.0.0)
     - post-tool-use (1.0.0 → 1.1.0)
   
   Pushed:
     - error-handler (1.0.0 → 1.2.0)
   
   Merged:
     - validation-hook (combined v1.0.0 changes)
   
   Repository changes staged for commit.
   Run: git commit -m "Sync hooks: 3 pulled, 1 pushed, 1 merged"
   
   Note: Hook configurations in settings.json were not changed.
   To apply updates, you may need to:
   1. Review changes in the hook files
   2. Manually update settings.json if needed
   3. Restart Claude Code for changes to take effect
   ```

### Implementation Details

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
For merging hook files:
1. Parse both versions' JSON metadata
2. Use newer version's metadata
3. Identify unique sections in hook logic
4. Combine sections intelligently
5. Remove duplicate content
6. Preserve JSON structure and formatting

### Safety Features
- Never delete files, only overwrite
- Show preview before destructive operations
- Provide undo instructions
- Validate all JSON syntax
- Check file permissions before operations

This advanced sync command provides intelligent version management, multiple sync strategies, and comprehensive conflict resolution for hook synchronization.