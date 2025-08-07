# Quick Start Guide

This guide will help you get up and running with the prompts repository and Claude Code slash commands.

## Prerequisites

### 1. Install Bun (preferred)

We prefer Bun for speed and a consistent toolchain.

```bash
curl -fsSL https://bun.sh/install | bash
```

Alternatively, Node.js also works if you prefer `npm`.

### 2. Install Claude Code

Open a terminal (like iTerm on Mac) and run:

```bash
# bun (preferred)
bun add -g @anthropic-ai/claude-code
# or npm
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

### 4. Install Agents, Commands, and Hooks

Copy agents/commands/hooks from this repository into your user directory so they are available everywhere:

```bash
mkdir -p ~/.claude/agents
cp -R user/.claude/agents/* ~/.claude/agents/

mkdir -p ~/.claude/commands/opl
cp -R user/.claude/commands/opl/* ~/.claude/commands/opl/

mkdir -p ~/.claude/hooks
cp -R user/.claude/hooks/* ~/.claude/hooks/
```

### 5. Restart Claude Code (if needed)

After installing MCP servers, restart Claude Code:

1. Press Ctrl+C to exit
2. Run `claude -c` to resume

## Using Commands

### Check Available Agents & Commands

In Claude Code, agents in `~/.claude/agents/` and commands in `~/.claude/commands/opl/` are globally available.

### Example: Use an Agent

Ask explicitly for the agent you want, e.g.:

"Use the documentation-writer agent to create a README for this project"

### Slash Commands

This repo includes OPL slash commands (see `user/.claude/commands/opl/`). After copying, you can run `/opl:*` commands anywhere.

## Installing MCP Servers (optional)

### Magic MCP (AI Component Generation)

First, set your API key:

```bash
export MAGIC_MCP_API_KEY="your-api-key"
```

Then install using the OPL MCP installer command set or follow Magic MCP docs. If you use our OPL commands, see their `/opl:mcp:install-magic`.

### Playwright MCP (Browser Automation)

Requires bun to be installed first:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then install using the included OPL MCP commands or follow the Playwright docs. For Bun, see our Playwright guide in `development/testing/playwright-bun-compatibility-guide.md`.

After installing any MCP server, restart Claude Code:

1. Press Ctrl+C to exit
2. Run `claude -c` to resume

## Troubleshooting

### Agents/Commands Not Showing

1. Confirm files exist in `~/.claude/agents/` and `~/.claude/commands/opl/`
2. Restart Claude Code: Press Ctrl+C then run `claude -c`
3. Ensure agent `name:` fields and command slugs are unique

### Permission Errors

If you get bash permission errors, grant the requested permissions when prompted.

### Can't Find Commands

- After copying, agents and commands from this repo are globally available in Claude Code.

## Next Steps

- Explore available agents and commands in `user/.claude/`
- Create your own by copying and editing existing ones
- Contribute improvements back via PR to this repo

For more detailed information, see the [README](README.md).