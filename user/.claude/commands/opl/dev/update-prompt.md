---
allowed-tools: Read, Write, Edit, Bash(find:*), Bash(ls:*), Bash(pwd), Grep
description: Update an existing Claude Code slash command
argument-hint: <command-name|path> [--add-help] [--update-tools] [--optimize]
---

## Your Task

If the arguments contain "--help", show this help:
**update-prompt** - Update an existing Claude Code slash command

**Usage:** `/update-prompt <command-name|path> [OPTIONS]`

**Description:**
Updates an existing slash command to follow best practices, add missing features, or optimize for performance. Can find commands by name or path.

**Arguments:**
- `<command-name|path>` : Command name or file path to update
- `--add-help`          : Add or update help section
- `--update-tools`      : Review and update allowed-tools
- `--optimize`          : Optimize bash commands for minimal output
- `--help`              : Show this help message

**Examples:**
- `/update-prompt deploy`              : Find and update /deploy command
- `/update-prompt ./commands/test.md`  : Update specific file
- `/update-prompt lint --add-help`     : Add help section to /lint

**Note:** Will search both project and user command directories if path not specified.

Then stop.

Otherwise, update the specified command:

## Context

- Current directory: !`pwd`
- Project commands: !`find .claude/commands -name "*.md" -type f 2>/dev/null | head -20 || echo "No project commands found"`
- User commands: !`find ~/.claude/commands -name "*.md" -type f 2>/dev/null | head -20 || echo "No user commands found"`

## Your Task

Update an existing Claude Code slash command following these steps:

### 1. Find the Command File

Parse `$ARGUMENTS` to get the command identifier:
- If it looks like a path (contains / or .md), use directly
- Otherwise, search for the command by name:
  1. Check project: `.claude/commands/**/<name>.md`
  2. Check user: `~/.claude/commands/**/<name>.md`
  3. Handle namespaced commands (e.g., "ui:component" → "ui/component.md")
  
If multiple matches found, show all matches and ask user to specify which one.

### 2. Analyze Current Command

Read the existing command file and check for:
- Frontmatter completeness
- Help section presence and format
- Bash command efficiency
- File reference usage
- Overall structure

### 3. Apply Updates Based on Options

#### Default Updates (Always Applied)
- Ensure proper frontmatter structure
- Add `argument-hint` if missing
- Fix any syntax issues
- Ensure consistent formatting

#### --add-help
Add or update help section:
```markdown
## Your Task

If the arguments contain "--help", show this help:
[Generate appropriate help content based on command]
Then stop.

Otherwise, update the specified command:
```

#### --update-tools
Review and update `allowed-tools`:
- Remove unused tools
- Add missing but needed tools
- Make bash commands more specific
- Suggest security improvements

#### --optimize
Optimize for context window:
- Replace verbose bash commands with efficient alternatives
- Add filters to reduce output size
- Combine multiple commands with pipes
- Remove redundant context gathering

### 4. Best Practices for Updates

#### Bash Command Optimization Examples

**Before:**
```bash
!`ls -la /path/to/files`  # Shows all details
```

**After:**
```bash
!`ls -1 /path/to/files | head -10`  # Just filenames, first 10
```

**Before:**
```bash
!`cat large-file.json`  # Entire file
```

**After:**
```bash
!`head -50 large-file.json | jq -r '.relevant_field'`  # Filtered content
```

#### Common Improvements
- Add `2>/dev/null` to suppress errors
- Use `|| echo "fallback"` for missing resources
- Pipe through `grep`, `awk`, `sed` for filtering
- Use `wc -l` for counts instead of full listings
- Limit output with `head` or `tail`

### 5. Preserve User Customizations

When updating:
- Keep custom task instructions
- Preserve unique bash commands
- Maintain existing file references
- Don't remove functionality

### 6. Report Changes

After updating, provide a summary:
- What was changed
- Why changes improve the command
- Any manual review needed
- Example usage of updated command

### Important Considerations

1. **Never modify built-in commands** (check against the built-in list)
2. **Handle namespacing** - understand `/namespace:command` format
3. **Check both locations** - project (.claude/commands) and user (~/.claude/commands)
4. **Preserve intent** - don't change what the command does
5. **Backward compatibility** - ensure existing usage still works

### Search Strategy for Finding Commands

If no path provided:
1. Parse command name from arguments
2. Handle namespace syntax (convert : to /)
3. Search in this order:
   - Exact match in current directory's .claude/commands
   - Exact match in ~/.claude/commands
   - Fuzzy match if no exact match
4. If multiple matches, list all with full paths
5. Ask user to specify which one to update

Remember: The goal is to improve commands while preserving their functionality and user customizations.