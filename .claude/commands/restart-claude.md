---
allowed-tools: Bash(ps:*), Bash(kill:*), Bash(echo:*), Bash(claude:*), Bash(pwd:*), Bash(sleep:*), Bash(sh:*)
description: Restart Claude Code to apply MCP changes or troubleshoot issues
argument-hint: [--force] [--no-resume] [--help]
---


## Current Session Info
!`echo "PID: $$"`
!`pwd`

## Your Task

If the arguments contain "--help", show this help:

```
restart-claude - Restart Claude Code to apply MCP changes or troubleshoot issues

Usage: /restart-claude [--force] [--no-resume] [--help]

Options:
  --force      Force restart even if other sessions detected
  --no-resume  Don't resume conversation after restart
  --help       Show this help message

Examples:
  /restart-claude              Restart and resume conversation
  /restart-claude --no-resume  Fresh start without resuming

Use Cases:
  - After installing MCP servers (to load them)
  - When Claude Code becomes unresponsive
  - To apply configuration changes

For more help: /help-prompts
```

Then stop.

Otherwise, restart Claude Code with these considerations:

### 1. Important Warnings

**CRITICAL**: This command will terminate the current Claude Code session. Make sure to:
- Save any important work
- Understand that the conversation will end
- Know that a new session will start automatically (unless --no-resume)

### 2. Parse Options

Check `$ARGUMENTS` for:
- `--force`: Skip safety checks
- `--no-resume`: Don't add -c flag to resume

### 3. Safety Checks

Unless `--force` is specified:
- Check for other Claude Code sessions
- Warn if multiple sessions detected
- Ask for confirmation before proceeding

### 4. Execute Restart

The restart strategy depends on options:

**Default (with resume):**
```bash
# This will kill current session and start new one with conversation resume
sh -c 'kill $$ && sleep 1 && claude -c'
```

**Without resume:**
```bash
# This will kill current session and start fresh
sh -c 'kill $$ && sleep 1 && claude'
```

### 5. What Happens

1. Current Claude Code process terminates
2. Brief pause (1 second) to ensure clean shutdown
3. New Claude Code session starts
4. If resuming (-c flag), conversation continues where it left off
5. MCP servers are reloaded with new configuration

### 6. Common Scenarios

**After MCP Installation:**
```
User: /mcp-install-magic
Assistant: Magic MCP installed successfully!
User: /restart-claude
[Claude Code restarts and MCP commands become available]
```

**With New MCP Commands:**
After restart, newly installed MCP servers expose their commands:
- `/mcp__magic__generate` (if Magic MCP installed)
- `/mcp__playwright__screenshot` (if Playwright MCP installed)

### 7. Alternative Approaches

If restart fails or user prefers manual control:
- Press Ctrl+C to exit Claude Code
- Run `claude -c` to resume conversation
- Or run `claude` for a fresh start

### Important Notes

- This command uses `exec` to replace the current shell
- The `$$` variable refers to the current process ID
- The `-c` flag tells Claude to continue the previous conversation
- MCP servers are loaded on Claude Code startup
- All MCP slash commands become available after restart