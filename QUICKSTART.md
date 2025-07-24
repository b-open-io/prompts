# Quick Start Guide

This guide will help you get up and running with the prompts repository and Claude Code slash commands.

## Prerequisites

### 1. Install Node.js

You need Node.js to get the `npm` command for installing Claude Code.

**Download Node.js**: https://nodejs.org/en/download/current

### 2. Install Claude Code

Open a terminal (like iTerm on Mac) and run:

```bash
npm install -g @anthropic-ai/claude-code
```

**Learn more about Claude Code**: https://www.anthropic.com/claude-code

## Setup

### 1. Clone the Prompts Repository

From your terminal, run:

```bash
git clone https://github.com/b-open-io/prompts
```

This will create a `prompts` folder in your current directory.

### 2. Navigate to the Prompts Folder

```bash
cd prompts
```

### 3. Start Claude Code

From inside the prompts folder, run:

```bash
claude
```

### 4. Initialize User Commands

Once Claude Code is running, use this slash command to install all user commands:

```
/init-prompts
```

This copies user-level commands from the repository to your system.

### 5. Restart Claude Code (if needed)

After installing commands or MCP servers, restart Claude Code:

```
/restart-claude
```

## Using Commands

### Check Available Commands

To see what commands are available and their status:

```
/help-prompts
```

### Example: Product Requirements Document

Once initialized, you can use commands like:

```
/prd
```

To provide additional context, add text after the command:

```
/prd read this image [Image 1] and pre-fill what you can
```

### Other Useful Commands

- `/design` - Access UI/UX design resources
- `/lint` - Set up code quality tools
- `/bsv` - BSV SDK documentation
- `/ai-inspiration` - AI design tools
- `/create-prompt` - Create new slash commands
- `/sync-prompts` - Update existing commands

## Installing MCP Servers

### Magic MCP (AI Component Generation)

First, set your API key:

```bash
export MAGIC_MCP_API_KEY="your-api-key"
```

Then install:

```
/mcp-install-magic
```

### Playwright MCP (Browser Automation)

Requires bun to be installed first:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then install:

```
/mcp-install-playwright
```

After installing any MCP server, restart Claude Code:

```
/restart-claude
```

## Troubleshooting

### Commands Not Working

1. Make sure you're in the prompts directory
2. Try `/help-prompts --status` to check installation
3. Run `/sync-prompts` to update commands
4. Restart Claude Code with `/restart-claude`

### Permission Errors

If you get bash permission errors, grant the requested permissions when prompted.

### Can't Find Commands

- Project commands are available when you're in the prompts directory
- User commands are available everywhere after running `/init-prompts`

## Next Steps

- Explore available commands with `/help-prompts`
- Create your own commands with `/create-prompt`
- Contribute improvements back with `/sync-prompts --contribute`

For more detailed information, see the [README](README.md).