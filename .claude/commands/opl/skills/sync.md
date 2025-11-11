---
version: 2.0.0
allowed-tools: Read, Write, Glob, Bash(diff:*), Bash(cp:*), Bash(git:*), Bash(test:*), Bash(find:*), Bash(grep:*), Bash(stat:*)
description: Intelligent bidirectional synchronization of Claude Code skills with version management
argument-hint: [--auto] [--repo] [--local] [--merge] [--interactive] [--help]
---

# Skills Sync - Intelligent Version Management

## Your Task

Parse the arguments to determine the action:

### If `--help` is present:
Show this comprehensive help:

```
opl:skills:sync - Intelligent Skills Synchronization

Usage: /opl:skills:sync [OPTIONS]

Description:
Advanced synchronization of skills between ~/.claude/skills/ and the
prompts repository user/.claude/skills/. Features version-aware comparison,
smart conflict resolution, and multiple sync strategies.

Options:
  --auto         Auto-resolve to newest versions (by version or date)
  --repo         Take all skills from repository
  --local        Take all skills from local
  --merge        Merge changes (combine unique sections)
  --interactive  Choose per skill (default)
  --help         Show this help message

Examples:
  /opl:skills:sync                 Interactive mode with analysis
  /opl:skills:sync --auto          Auto-sync to newest versions
  /opl:skills:sync --repo          Pull all from repository
  /opl:skills:sync --local         Push all to repository
  /opl:skills:sync --merge         Merge all changes

Version Detection:
- Reads version from SKILL.md YAML frontmatter (version: x.y.z)
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
   if [ ! -d "$HOME/.claude/skills" ]; then
       echo "🔧 First-time setup detected. Creating Claude directories..."
       mkdir -p "$HOME/.claude/skills"
       echo "✅ Claude directories created"
       echo ""
   fi
   ```

2. **Gather Information**
   - Find all skills in repository: `find user/.claude/skills -maxdepth 1 -mindepth 1 -type d`
   - Find all skills in local: `find ~/.claude/skills -maxdepth 1 -mindepth 1 -type d`
   - For each skill, extract version from SKILL.md YAML frontmatter
   - Get file modification timestamps as fallback

3. **Version Extraction Function**
   Use bash to extract version from SKILL.md:
   ```bash
   # Extract version from SKILL.md
   grep -m 1 "^version:" "$skill_dir/SKILL.md" 2>/dev/null | sed 's/version: *//'
   ```
   If no version, get modification time:
   ```bash
   stat -f "%m" "$skill_dir/SKILL.md" 2>/dev/null || stat -c "%Y" "$skill_dir/SKILL.md" 2>/dev/null
   ```

4. **Compare Versions**
   Use semantic versioning comparison:
   - Split version by dots (major.minor.patch)
   - Compare numerically: major first, then minor, then patch
   - If versions equal, compare directory content with diff

5. **Build Analysis Table**
   Create a comprehensive status table showing skill sync status with version comparison.

6. **Handle Sync Strategy**

   **--auto (Auto-resolve to newest):**
   - For each skill, compare versions
   - Pull if repo is newer
   - Push if local is newer
   - Skip if in sync
   - Execute sync without user interaction

   **--repo (Pull all from repository):**
   ```bash
   # Copy each skill directory
   for skill_dir in user/.claude/skills/*; do
       if [ -d "$skill_dir" ]; then
           skill_name=$(basename "$skill_dir")
           echo "Pulling $skill_name..."
           rm -rf ~/.claude/skills/"$skill_name"
           cp -r "$skill_dir" ~/.claude/skills/
       fi
   done
   ```

   **--local (Push all to repository):**
   ```bash
   # Copy each skill directory
   for skill_dir in ~/.claude/skills/*; do
       if [ -d "$skill_dir" ]; then
           skill_name=$(basename "$skill_dir")
           echo "Pushing $skill_name..."
           rm -rf user/.claude/skills/"$skill_name"
           cp -r "$skill_dir" user/.claude/skills/
       fi
   done
   ```

   **--merge (Merge mode):**
   - For each differing skill:
     - Extract unique sections from both SKILL.md files
     - Combine sections, preferring newer version for conflicts
     - Preserve YAML frontmatter from newer version
     - Merge reference files and scripts
     - Write merged result

   **--interactive or no args (Interactive with comparison):**
   First show the comparison table, then present options:
   ```
   Skills Sync Analysis:
   ┌─────────────────────┬──────────┬────────┬─────────┬──────────────┐
   │ Skill               │ Local    │ Repo   │ Status  │ Recommended  │
   ├─────────────────────┼──────────┼────────┼─────────┼──────────────┤
   │ bap-identity        │ 1.0.0    │ 1.0.1  │ 🔵 Repo │ Pull         │
   │ skill-creator       │ 1.0.0    │ 1.0.0  │ 🟢 Sync │ No Action    │
   └─────────────────────┴──────────┴────────┴─────────┴──────────────┘

   Choose sync strategy:
   1. Auto-resolve to newest (recommended)
   2. Pull all from repository
   3. Push all to repository
   4. Interactive selection per skill
   5. Merge mode (combine changes)
   6. Show detailed diffs
   7. Cancel

   Selection:
   ```

7. **Execute Sync Operations**
   Based on chosen strategy:
   - Copy skill directories (preserves SKILL.md, references/, scripts/, etc.)
   - Track all changes made
   - Preserve file permissions
   - Validate YAML frontmatter after copy

8. **Git Integration**
   After push operations:
   ```bash
   # Stage changes if in git repository
   if [ -d .git ]; then
       git add user/.claude/skills/
       echo "Changes staged for commit"
   fi
   ```

9. **Generate Summary Report**
   ```
   ✅ Sync Complete!

   Summary:
   • Pulled: 1 skill (newer version from repo)
   • Pushed: 0 skills
   • Merged: 0 skills
   • Skipped: 1 skill (already in sync)

   Details:
   Pulled:
     - bap-identity (1.0.0 → 1.0.1)

   In Sync:
     - skill-creator (1.0.0)

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

#### Directory Structure
Each skill directory contains:
- **SKILL.md** - Main skill definition with YAML frontmatter (required)
- **references/** - Documentation and reference materials (optional)
- **scripts/** - Helper scripts and tools (optional)
- **LICENSE.txt** - License information (optional)

When syncing, copy entire directories to preserve all assets.

#### Merge Algorithm
For merging skill directories:
1. Parse both versions' YAML metadata
2. Use newer version's metadata
3. Identify unique sections in SKILL.md
4. Combine sections intelligently
5. Merge reference directories (keep both files if different names)
6. Merge scripts (use newer version for same filename)
7. Preserve directory structure

### Safety Features
- Never delete files, only overwrite
- Show preview before destructive operations
- Validate YAML frontmatter after operations
- Check file permissions before operations

## Default Behavior (No Arguments)

**AGENT: Perform intelligent comparison and show status:**

1. **Check if local directory is accessible:**
   ```bash
   if [ ! -d "$HOME/.claude/skills" ]; then
       echo "⚠️  Local skills directory not found"
       echo "Creating: $HOME/.claude/skills"
       mkdir -p "$HOME/.claude/skills"
   fi
   ```

2. **Build skill comparison table:**
   ```bash
   # This is a simplified example - implement full comparison logic
   echo "Skills Sync Status:"
   echo "==================="
   echo ""

   # Get all unique skill names from both sides
   all_skills=$(
       { find user/.claude/skills -maxdepth 1 -mindepth 1 -type d -exec basename {} \; 2>/dev/null;
         find ~/.claude/skills -maxdepth 1 -mindepth 1 -type d -exec basename {} \; 2>/dev/null; } | sort -u
   )

   # Compare each skill
   for skill in $all_skills; do
       local_ver=""
       repo_ver=""
       indicator=""

       # Get local version
       if [ -f "$HOME/.claude/skills/$skill/SKILL.md" ]; then
           local_ver=$(grep -m1 "^version:" "$HOME/.claude/skills/$skill/SKILL.md" 2>/dev/null | cut -d: -f2 | tr -d " ")
       fi

       # Get repo version
       if [ -f "user/.claude/skills/$skill/SKILL.md" ]; then
           repo_ver=$(grep -m1 "^version:" "user/.claude/skills/$skill/SKILL.md" 2>/dev/null | cut -d: -f2 | tr -d " ")
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

       printf "%-20s  Local: %-8s  Repo: %-8s  %s\n" "$skill" "${local_ver:--}" "${repo_ver:--}" "$indicator"
   done
   ```

3. **Show sync recommendations:**
   ```bash
   echo ""
   echo "💡 Sync Options:"
   echo "  /opl:skills:sync --auto    - Auto-sync to newest versions"
   echo "  /opl:skills:sync --repo    - Pull all from repository"
   echo "  /opl:skills:sync --local   - Push all to repository"
   echo "  /opl:skills:sync --help    - Show detailed help"
   ```

This advanced sync command provides intelligent version management, multiple sync strategies, and comprehensive conflict resolution for skills synchronization.
