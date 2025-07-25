---
version: 1.0.0
allowed-tools: Bash(git:*), Bash(ls:*), Bash(find:*), Read, Write, Edit, Glob, Grep
description: Prepare repository for publishing - cleanup, version checks, and registry updates
argument-hint: [--help]
---

## Publishing Preparation

This command helps prepare the repository for a clean publish/commit.

## Your Task

If arguments contain "--help", show this help and stop.

Otherwise, help prepare the repository for publishing by following these steps:

### 1. Check for Unintended Files

First, look for files that shouldn't be committed:
- Temporary files (.tmp, .bak, .swp)
- Personal notes or work-in-progress files
- Test files that aren't part of the project
- Any files with "temp", "test", "draft" in the name (unless they're actual test files)
- Screenshots or random images
- .DS_Store files (macOS)

For each file found:
- Ask the user if it should be:
  - Deleted
  - Moved to /internal (git-ignored)
  - Added to .gitignore
  - Kept and committed

### 2. Check Git Status

Run `git status` and review:
- Any untracked files that look suspicious
- Modified files that need version bumps
- Deleted files that need registry updates

### 3. Version Management

For each modified .md file (prompts and commands):
- Check if it has a version in frontmatter
- If modified since last commit, suggest bumping the version
- Format: major.minor.patch (e.g., 1.0.0 → 1.0.1 for small changes)
- Let user decide if version should be bumped

### 4. Update Registry

Run `./scripts/generate-registry.sh` to regenerate the registry with:
- Latest file counts
- Current versions
- Any new prompts added
- Removed prompts deleted

### 5. Documentation Updates

Check if README.md needs updates for:
- New commands added to file structure
- Changed statistics
- New features or capabilities

Check if CLAUDE.md needs updates for:
- New integration points
- Changed workflows

### 6. Final Validation

Before committing, verify:
- No sensitive information (API keys, passwords)
- No large binary files accidentally included
- All markdown files have proper frontmatter
- File references (@) point to valid files
- Registry.json is valid and complete

### 7. Commit Preparation

Suggest a commit message based on changes:
- If versions bumped: "Update command versions and registry"
- If new features: "Add [feature] command/prompt"
- If cleanup: "Clean up repository and update registry"
- Always include what specifically changed

### Example Workflow

1. "I found these temporary files: temp-notes.md, .DS_Store. Should I delete them?"
2. "The auth.md command was modified. Current version: 1.1.0. Bump to 1.1.1?"
3. "Running registry generation..."
4. "Registry updated: 11 prompts across 2 categories"
5. "Ready to commit with message: 'Update auth command to v1.1.1 and regenerate registry'"

### Important Notes

- Always ask before deleting or moving files
- Show what will be included in the commit
- Suggest appropriate .gitignore entries for excluded files
- Make sure /internal directory exists before moving files there