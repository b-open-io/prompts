---
allowed-tools: Bash(claude:*), Bash(open:*), Bash(echo:*), Bash(test:*), WebFetch
description: Install 21st.dev Magic MCP server for AI component generation
argument-hint: [--user] [--check-only]
---

## Help Check
!`[[ "$ARGUMENTS" == *"--help"* ]] && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**mcp-install-magic** - Install 21st.dev Magic MCP server for AI component generation

**Usage:** `/mcp-install-magic [--user] [--check-only]`

**Description:**
Installs the 21st.dev Magic MCP server to enable AI-powered component generation directly in Claude Code. Requires MAGIC_MCP_API_KEY environment variable.

**Options:**
- `--user`       : Install at user level (default: project level)
- `--check-only` : Only check if API key is configured
- `--help`       : Show this help message

**Examples:**
- `/mcp-install-magic`         : Install at project level
- `/mcp-install-magic --user`  : Install at user level

**Prerequisites:**
1. Set environment variable: `export MAGIC_MCP_API_KEY="your-api-key"`
2. Get API key from: https://21st.dev/magic/onboarding

$STOP_EXECUTION_IF_HELP

## API Key Check
!`[ -n "$MAGIC_MCP_API_KEY" ] && echo "API_KEY_FOUND" || echo "API_KEY_MISSING"`

## Current MCP Configuration
!`claude mcp list 2>/dev/null | grep -A2 "magic_mcp" || echo "Magic MCP not currently installed"`

## Your Task

Install the 21st.dev Magic MCP server following these steps:

### 1. Check API Key Availability

If API key check shows "API_KEY_MISSING":
- Inform user that MAGIC_MCP_API_KEY environment variable is required
- Provide instructions:
  ```bash
  # Add to your shell profile (.bashrc, .zshrc, etc.):
  export MAGIC_MCP_API_KEY="your-api-key"
  
  # Or set temporarily for this session:
  export MAGIC_MCP_API_KEY="your-api-key"
  ```
- Open the onboarding page: `open https://21st.dev/magic/onboarding?step=install-ide`
- Stop execution and wait for user to set the API key

### 2. Parse Installation Scope

Check `$ARGUMENTS` for flags:
- If `--check-only`: Just report current status and exit
- If `--user`: Install at user level
- Otherwise: Install at project level (default)

### 3. Install Magic MCP

Execute the installation command with the actual API key:

```bash
claude mcp add-json magic_mcp '{
  "command": "npx",
  "args": ["-y", "@21st-dev/magic@latest", "API_KEY=\"'$MAGIC_MCP_API_KEY'\""]
}'
```

Add the appropriate scope flag:
- For user level: Add `--user` before `add-json`
- For project level: No additional flag needed

### 4. Verify Installation

After installation:
- Check if Magic MCP appears in the MCP list
- Provide usage instructions:
  ```
  Magic MCP installed successfully! 
  
  ⚠️  IMPORTANT: You need to restart Claude Code for MCP changes to take effect.
  
  To restart:
  1. Press Ctrl+C to exit Claude Code
  2. Run 'claude -c' to resume conversation
  
  After restart, try these commands:
  - /ui Create a modern pricing table
  - /ui Design a dashboard sidebar
  - /ui Build a multi-step form wizard
  
  Or use the MCP command directly:
  - /mcp__magic_mcp__generate Create a pricing component
  ```

### 5. Handle Errors

Common issues to handle:
- Missing Claude Code CLI: Suggest installing/updating Claude Code
- Installation failures: Check network connectivity
- Permission issues: Suggest using --user flag
- Existing installation: Ask if user wants to update/reinstall

### Important Notes

- The API key is sensitive - never echo it directly
- The key is passed as an environment variable to the Magic MCP process
- Installation scope affects where the MCP config is stored:
  - User: `~/.config/claude/mcp.json`
  - Project: `.claude/mcp.json`
- Magic MCP enables the `/ui` command for component generation