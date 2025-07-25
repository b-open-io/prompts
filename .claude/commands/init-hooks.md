---
allowed-tools: Read, Edit, Glob, Bash(ls:*), Bash(test:*)
description: Install and configure Claude Code hooks from the prompts repository
argument-hint: [--list] [--all]
---

## Your Task

If the arguments contain "--help", show this help:

```
init-hooks - Install Claude Code hooks to enhance your workflow

Usage: /init-hooks [OPTIONS]

Description:
Browse and install hooks that automatically enhance Claude Code's behavior.
Hooks can auto-format code, add context to prompts, manage git operations,
and more. By default, installs to project level (.claude/settings.json).

Options:
  --list    List available hooks without installing
  --all     Install all available hooks (use with caution)
  --help    Show this help message

Examples:
  /init-hooks         Interactive hook selection
  /init-hooks --list  See all available hooks
  /init-hooks --all   Install all hooks at once

Note: Hooks execute shell commands automatically. Review each hook
      before installing to understand what it does.
```

Then stop.

Otherwise, help the user install hooks:

### 1. Find Available Hooks
!`find user/.claude/hooks -name "*.json" -type f | sort`

### 2. Process Based on Arguments

If `--list` is specified:
- Read each hook file to get name and description
- Display in a formatted list with descriptions
- Stop after listing

If `--all` is specified:
- Confirm with user: "This will install ALL available hooks. Continue? (yes/no)"
- If yes, proceed to install all hooks
- If no, stop

Otherwise (interactive mode):
- Display each available hook with:
  - Name and description
  - What it does
  - Example behavior
- Ask user: "Install this hook? (yes/no/skip)"

### 3. For Each Hook to Install

1. **Read the hook configuration**
   - Use Read tool on the hook JSON file
   - Extract the hook configuration

2. **Ask installation level**
   ```
   Install at:
   1. Project level (.claude/settings.json) - Recommended
   2. User level (~/.claude/settings.json) - Applies to all projects
   
   Choice (1 or 2):
   ```

3. **Check for existing settings file**
   - If project level: Check if `.claude/settings.json` exists
   - If user level: Check if `~/.claude/settings.json` exists
   - If doesn't exist, create with base structure:
   ```json
   {
     "hooks": {}
   }
   ```

4. **Merge hook configuration**
   - Read existing settings.json
   - Merge the new hook into the hooks section
   - Preserve any existing hooks
   - Handle conflicts by asking user

5. **Write updated configuration**
   - Save the merged configuration back to settings.json
   - Show confirmation of what was added

### 4. Final Summary

After all installations:
```
✅ Hooks Installation Complete!

Installed X hooks:
- [List installed hooks]

Location: [project or user level]

The hooks are now active in your Claude Code session.
Some hooks may require specific tools to be installed (git, npm, etc.)

To manage hooks later:
- View current hooks: /hooks
- Edit settings: .claude/settings.json
```

### Important Implementation Notes:

- When merging hooks, be careful not to overwrite existing configurations
- If a hook type already exists (e.g., UserPromptSubmit), merge the arrays
- Validate JSON before writing to prevent corruption
- Always create .claude directory if it doesn't exist for project-level
- Show clear examples of what each hook will do before installing