---
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(ls:*), Bash(find:*), Bash(cat:*), Bash(diff:*), Read, Write, Edit
description: Initialize user-level Claude commands from this repository
argument-hint: [--enhance] [--backup]
---

## Context

- Project commands directory: !`ls -la /Users/satchmo/code/prompts/user/.claude/commands/ 2>/dev/null || echo "No user commands found in repo"`
- User's Claude commands: !`ls -la ~/.claude/commands/ 2>/dev/null || echo "User commands directory does not exist"`
- Existing conflicts: !`find /Users/satchmo/code/prompts/user/.claude/commands -name "*.md" -exec basename {} \; 2>/dev/null | while read f; do [ -f ~/.claude/commands/"$f" ] && echo "CONFLICT: $f"; done || echo "No conflicts found"`

## Your Task

Initialize the user's Claude Code commands by copying commands from this repository's `user/.claude/commands/` to the user's home directory `~/.claude/commands/`.

### Process:

1. **Create user directory if needed**:
   - Check if `~/.claude/commands/` exists
   - Create it if missing

2. **Identify all commands to copy**:
   - List all `.md` files in `user/.claude/commands/`
   - Check for existing files with same names in user directory

3. **Handle each file**:
   - **No conflict**: Copy directly
   - **Conflict exists**: 
     - If `--enhance` flag: Read both files, merge intelligently keeping best of both
     - If `--backup` flag: Create `.backup` of original before copying
     - Otherwise: Ask user how to proceed for each conflict

4. **Enhancement strategy** (when --enhance is used):
   - Merge frontmatter (combine allowed-tools, keep longer description)
   - Combine command content intelligently
   - Preserve any user customizations
   - Ask for clarification if merge is ambiguous

5. **Report results**:
   - List successfully copied commands
   - List enhanced commands
   - List skipped commands
   - Provide usage examples

### Example Usage:
```bash
# Basic copy (prompts on conflicts)
/init-prompts

# Auto-enhance conflicts
/init-prompts --enhance

# Backup existing before copy
/init-prompts --backup

# Both options
/init-prompts --enhance --backup
```

### Success Message Template:
```
✅ Initialized Claude commands:
- Copied: [list]
- Enhanced: [list]
- Skipped: [list]

Try these commands:
- /design - Access design tools and resources
- /[other commands]
```