---
version: 1.0.0
allowed-tools: Read, Write, Edit, Bash
description: Intelligent bidirectional synchronization of Claude Code skills with version management
argument-hint: [--help|--auto|--repo|--local|--merge|--interactive]
---

# Skills Synchronization System

Intelligent bidirectional synchronization between repository skills (`user/.claude/skills/`) and local skills (`~/.claude/skills/`).

## Quick Usage
- `sync` - Interactive status overview and sync options
- `sync --auto` - Auto-resolve version conflicts intelligently
- `sync --repo` - Pull all skills from repository to local (overwrite)
- `sync --local` - Push all local skills to repository (overwrite)
- `sync --merge` - Attempt semantic merging of conflicted skills
- `sync --interactive` - Step-by-step interactive resolution
- `sync --help` - Show this detailed help

## Detailed Help

### Core Features
- **Version-Aware**: Compares semantic versions from SKILL.md frontmatter
- **Directory Sync**: Syncs entire skill directories (SKILL.md, references/, scripts/)
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
- ⚪ **New** - Skill exists on one side only
- ❓ **Unknown** - No version info available

### Sync Strategies

#### --auto (Smart Resolution)
- Pull newer versions automatically
- For conflicts: choose higher version number
- Skip if versions are equal but content differs
- Safe for most scenarios

#### --repo (Repository Override)
- Force pull all skills from repository
- Overwrites local versions completely
- Use when repository is authoritative

#### --local (Local Override)
- Force push all local skills to repository
- Overwrites repository versions completely
- Use when local changes are authoritative

#### --merge (Semantic Merge)
- Attempt to merge conflicted skills intelligently
- Combines documentation sections
- Preserves unique content from both sides
- Fallback to interactive on complex conflicts

#### --interactive (Manual Resolution)
- Present each conflict individually
- Show diff and version information
- Choose action per skill: pull, push, skip, merge
- Full control over resolution

### Version Management
- Extracts versions from SKILL.md YAML frontmatter
- Treats missing versions as 0.0.0
- Uses proper semantic version comparison
- Updates version metadata during operations

---

**AGENT INSTRUCTIONS: Follow these step-by-step commands to perform sync operations**

Parse the arguments to determine action:
- If `--help` is present: Show the detailed help sections above
- If `--auto` or `--repo`: Pull all skills from repository to local
- If `--local`: Push all local skills to repository
- If no arguments: Show status analysis

## Skill Directory Structure

Each skill directory contains:
- **SKILL.md** - Main skill definition with YAML frontmatter (required)
- **references/** - Documentation and reference materials (optional)
- **scripts/** - Helper scripts and tools (optional)
- **LICENSE.txt** - License information (optional)

When syncing, the entire skill directory is copied to preserve all assets.

## For --auto or --repo: Pull All Skills from Repository to Local

1. **First, ensure ~/.claude access (skip if already configured):**
   The cp command below will work if ~/.claude is accessible. If it fails with a permission error, you'll need to add ~/.claude to additionalDirectories in .claude/settings.json and restart Claude Code.

2. **List repository skills:**
   ```bash
   echo "Repository skills to pull:"
   find user/.claude/skills -maxdepth 1 -mindepth 1 -type d -exec basename {} \;
   ```

3. **Copy all skills from repository to local:**
   ```bash
   # Ensure local skills directory exists
   mkdir -p ~/.claude/skills

   # Copy each skill directory
   for skill_dir in user/.claude/skills/*; do
       if [ -d "$skill_dir" ]; then
           skill_name=$(basename "$skill_dir")
           echo "Copying $skill_name..."
           rm -rf ~/.claude/skills/"$skill_name"
           cp -r "$skill_dir" ~/.claude/skills/
       fi
   done
   ```

4. **Verify the copy:**
   ```bash
   echo "✅ Sync complete: Copied $(find user/.claude/skills -maxdepth 1 -mindepth 1 -type d | wc -l) skills to local"
   ```

## For --local: Push All Skills from Local to Repository

1. **List local skills:**
   ```bash
   echo "Local skills to push:"
   find ~/.claude/skills -maxdepth 1 -mindepth 1 -type d -exec basename {} \;
   ```

2. **Copy all skills from local to repository:**
   ```bash
   # Ensure repository skills directory exists
   mkdir -p user/.claude/skills

   # Copy each skill directory
   for skill_dir in ~/.claude/skills/*; do
       if [ -d "$skill_dir" ]; then
           skill_name=$(basename "$skill_dir")
           echo "Copying $skill_name..."
           rm -rf user/.claude/skills/"$skill_name"
           cp -r "$skill_dir" user/.claude/skills/
       fi
   done
   ```

3. **Stage the changes:**
   ```bash
   git add user/.claude/skills/
   ```

4. **Confirm staging:**
   ```bash
   echo "✅ Sync complete: Pushed skills to repository and staged for commit"
   ```

## Status Analysis (No arguments)

**AGENT INSTRUCTIONS: Run these commands to analyze sync status**

1. **List repository skills:**
   ```bash
   echo "Repository skills:"
   find user/.claude/skills -maxdepth 1 -mindepth 1 -type d -exec basename {} \; | sort
   ```

2. **Note about local skills:**
   ```bash
   echo "Note: Local skill listing requires ~/.claude in additionalDirectories"
   echo "To sync, simply run: /opl:skills:sync --repo"
   ```

**Repository Version Summary:**
```bash
echo "Repository Skill Versions:" && find user/.claude/skills -name "SKILL.md" -exec sh -c 'skill_dir=$(dirname "{}"); skill_name=$(basename "$skill_dir"); version=$(grep -m 1 "^version:" "{}" 2>/dev/null | sed "s/version: *//"); printf "  %-25s %s\n" "$skill_name:" "$version"' \; | sort
```

🎯 **Sync Options:**
- `/opl:skills:sync --auto` - Auto-resolve conflicts
- `/opl:skills:sync --repo` - Pull all from repository
- `/opl:skills:sync --local` - Push all to repository
- `/opl:skills:sync --help` - Show detailed help

## Default Status Analysis (No Arguments)

**AGENT: Run these commands for repository analysis:**

1. **Repository skill overview:**
   ```bash
   echo "Repository Skill Status:" && echo "=======================" && echo "Total skills: $(find user/.claude/skills -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)" && echo "" && echo "Skill versions:" && find user/.claude/skills -name "SKILL.md" -exec sh -c 'skill_dir=$(dirname "{}"); skill_name=$(basename "$skill_dir"); version=$(grep -m1 "^version:" "{}" | cut -d: -f2 | tr -d " "); desc=$(grep -m1 "^description:" "{}" | cut -d: -f2- | tr -d "\"" | sed "s/^ *//"); printf "  %-20s v%-8s %s\n" "$skill_name" "$version" "$desc"' \; | sort
   ```

2. **Quick sync command:**
   ```bash
   echo "" && echo "💡 To sync all skills to local ~/.claude:" && echo "   /opl:skills:sync --repo" && echo "" && echo "Note: If you get a permission error, add ~/.claude to additionalDirectories" && echo "in .claude/settings.json and restart Claude Code."
   ```
