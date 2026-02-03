# Quick Start Guide - Agent Frameworks

This guide will help you get up and running with the prompts repository and AI agent slash commands.

## Prerequisites

### 1. Install Bun (preferred)

We prefer Bun for speed and a consistent toolchain.

```bash
curl -fsSL https://bun.sh/install | bash
```

Alternatively, Node.js also works if you prefer `npm`.

### 2. Install an Agent Framework

Choose your preferred agent framework:

**Claude Code** (Anthropic):
```bash
# bun (preferred)
bun add -g @anthropic-ai/claude-code
# or npm
npm install -g @anthropic-ai/claude-code
```

**Opencode** (OpenCode AI):
```bash
# bun (preferred)
bun add -g @opencode-ai/opencode
# or npm
npm install -g @opencode-ai/opencode
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

### 3. Start Your Agent

From inside the prompts folder, run:

```bash
# Claude Code
claude

# Opencode
opencode
```

### 4. Install Agents, Commands, and Hooks

Copy agents/commands/hooks from this repository into your user directory so they are available everywhere:

**For Claude Code:**
```bash
mkdir -p ~/.claude/agents
cp -R user/.claude/agents/* ~/.claude/agents/

mkdir -p ~/.claude/commands/opl
cp -R user/.claude/commands/opl/* ~/.claude/commands/opl/

mkdir -p ~/.claude/hooks
cp -R user/.claude/hooks/* ~/.claude/hooks/
```

**For Opencode:**
```bash
mkdir -p ~/.opencode/agents
cp -R user/.claude/agents/* ~/.opencode/agents/

mkdir -p ~/.opencode/commands/opl
cp -R user/.claude/commands/opl/* ~/.opencode/commands/opl/

mkdir -p ~/.opencode/hooks
cp -R user/.claude/hooks/* ~/.opencode/hooks/
```

### 5. Restart Your Agent (if needed)

After making changes, restart your agent:

**Claude Code:**
1. Press Ctrl+C to exit
2. Run `claude -c` to resume

**Opencode:**
1. Press Ctrl+C to exit
2. Run `opencode` to resume

## Using Commands

### Check Available Agents & Commands

Agents in your framework's agents directory and commands in the commands directory are globally available:

- **Claude Code**: `~/.claude/agents/` and `~/.claude/commands/opl/`
- **Opencode**: `~/.opencode/agents/` and `~/.opencode/commands/opl/`

### Example: Use an Agent

Ask explicitly for the agent you want, e.g.:

"Use the documentation-writer agent to create a README for this project"

### Slash Commands

This repo includes OPL slash commands (see `user/.claude/commands/opl/`). After copying, you can run `/opl:*` commands anywhere.

## Installing Skills

Install individual skills for specific capabilities:

```bash
bunx skills add b-open-io/bopen-tools --skill <skill-name>
```

For example:
```bash
bunx skills add b-open-io/bopen-tools --skill npm-publish
bunx skills add b-open-io/bopen-tools --skill frontend-design
```

## Troubleshooting

### Agents/Commands Not Showing

1. Confirm files exist in your framework's directories:
   - Claude: `~/.claude/agents/` and `~/.claude/commands/opl/`
   - Opencode: `~/.opencode/agents/` and `~/.opencode/commands/opl/`
2. Restart your agent: Press Ctrl+C then resume
3. Ensure agent `name:` fields and command slugs are unique

### Permission Errors

If you get bash permission errors, grant the requested permissions when prompted.

### Can't Find Commands

- After copying, agents and commands from this repo are globally available in your agent framework.

## Next Steps

- Explore available agents and commands in `user/.claude/`
- Create your own by copying and editing existing ones
- Contribute improvements back via PR to this repo

For more detailed information, see the [README](README.md).