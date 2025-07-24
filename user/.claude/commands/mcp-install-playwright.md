---
allowed-tools: Bash(claude:*), Bash(which:*), Bash(bunx:*), Bash(echo:*)
description: Install Playwright MCP server for browser automation and testing
argument-hint: [--user] [--check-only]
---

## Help Check
!`[[ "$ARGUMENTS" == *"--help"* ]] && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**mcp-install-playwright** - Install Playwright MCP server for browser automation and testing

**Usage:** `/mcp-install-playwright [--user] [--check-only]`

**Description:**
Installs the Playwright MCP server to enable browser automation, web scraping, and testing capabilities directly in Claude Code. Requires bun to be installed.

**Options:**
- `--user`       : Install at user level (default: project level)
- `--check-only` : Only check prerequisites and current installation
- `--help`       : Show this help message

**Examples:**
- `/mcp-install-playwright`         : Install at project level
- `/mcp-install-playwright --user`  : Install at user level

**Prerequisites:**
- Bun must be installed (https://bun.sh)

$STOP_EXECUTION_IF_HELP

## Prerequisites Check
!`which bun >/dev/null 2>&1 && echo "BUN_INSTALLED" || echo "BUN_NOT_FOUND"`

## Current MCP Configuration
!`claude mcp list 2>/dev/null | grep -A2 "playwright" || echo "Playwright MCP not currently installed"`

## Your Task

Install the Playwright MCP server following these steps:

### 1. Check Prerequisites

If bun check shows "BUN_NOT_FOUND":
- Inform user that bun is required
- Provide installation instructions:
  ```bash
  # Install bun (macOS/Linux):
  curl -fsSL https://bun.sh/install | bash
  
  # Or with npm:
  npm install -g bun
  
  # Or with Homebrew:
  brew install bun
  ```
- Stop execution and ask user to install bun first

### 2. Parse Installation Scope

Check `$ARGUMENTS` for flags:
- If `--check-only`: Report current status and prerequisites, then exit
- If `--user`: Install at user level
- Otherwise: Install at project level (default)

### 3. Install Playwright MCP

Execute the installation command:

For project level:
```bash
claude mcp add-json playwright '{
  "command": "bunx",
  "args": [
    "@playwright/mcp@latest"
  ]
}'
```

For user level:
```bash
claude mcp add-json --user playwright '{
  "command": "bunx",
  "args": [
    "@playwright/mcp@latest"
  ]
}'
```

### 4. Verify Installation

After installation:
- Check if Playwright MCP appears in the MCP list
- Provide usage instructions and examples

### 5. Post-Installation Message

Provide helpful information:
```
Playwright MCP installed successfully! 

Available capabilities:
- Browser automation
- Web scraping
- Screenshot capture
- Testing automation
- Page interaction

Example uses:
- "Take a screenshot of https://example.com"
- "Navigate to a website and extract data"
- "Fill out and submit a form"
- "Test user interactions"

Note: Playwright will download browser binaries on first use.
```

### 6. Handle Common Issues

- **Bun not found**: Guide user to install bun
- **Permission errors**: Suggest using --user flag
- **Network issues**: Check internet connectivity
- **Existing installation**: Ask if user wants to reinstall/update
- **Claude CLI not found**: Ensure Claude Code is properly installed

### Important Notes

- Playwright MCP enables browser automation directly from Claude
- First run may take time as Playwright downloads browser binaries
- Installation scope affects config location:
  - User: `~/.config/claude/mcp.json`
  - Project: `.claude/mcp.json`
- The MCP server runs headless browsers for automation tasks