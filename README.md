# OPL Prompts & AI Agents

**Supercharge Claude Code with specialized AI agents and prompts** for BSV blockchain development, project automation, and workflow optimization.

## What This Repository Does

This repository provides:
- **Specialized AI Agents** - Expert sub-agents for specific tasks (design, security, documentation, content, payments, auth, etc.)
- **Slash Commands** - Instant automation tools under the OPL namespace
- **Automation Hooks** - Background workflows to enhance development
- **Powerful Prompts** - Reusable templates for complex operations

## Installation

**Full Plugin** (recommended - includes 18 agents, 10 hooks, commands):
```bash
/plugin install bopen-tools@b-open-io
```

**Skills Only** (for other agentic frameworks):
```bash
skills add b-open-io/bopen-tools
```

## Specialized AI Agents

Our 21 expert agents enhance Claude Code with specialized knowledge. See [user/.claude/agents/](user/.claude/agents/) for full details.

### Development & Architecture
- 🔵 [**prompt-engineer**](user/.claude/agents/prompt-engineer.md) - Claude Code commands and prompt development
- 🏗️ [**architecture-reviewer**](user/.claude/agents/architecture-reviewer.md) - Large-scale system design and refactoring
- 🔴 [**code-auditor**](user/.claude/agents/code-auditor.md) - Security vulnerabilities and code quality
- 🚀 [**optimizer**](user/.claude/agents/optimizer.md) - Performance optimization and efficiency
- 🧪 [**test-specialist**](user/.claude/agents/test-specialist.md) - Comprehensive testing strategies
- 🧹 [**consolidator**](user/.claude/agents/consolidator.md) - System organization and cleanup

### Platform & Infrastructure
- 🟠 [**devops-specialist**](user/.claude/agents/devops-specialist.md) - Deployment automation and cloud infrastructure
- 🟢 [**database-specialist**](user/.claude/agents/database-specialist.md) - Database design, optimization, and data modeling
- 📱 [**mobile-specialist**](user/.claude/agents/mobile-specialist.md) - React Native, Swift, Kotlin, and Flutter development
- 🔗 [**integration-expert**](user/.claude/agents/integration-expert.md) - API integration and third-party services
- 🟠 [**mcp-specialist**](user/.claude/agents/mcp-specialist.md) - Model Context Protocol server development

### Specialized Domains
- 🟡 [**bitcoin-specialist**](user/.claude/agents/bitcoin-specialist.md) - BSV blockchain and cryptography
- 💚 [**payment-specialist**](user/.claude/agents/payment-specialist.md) - Payment processing and financial operations
- 🔵 [**auth-specialist**](user/.claude/agents/auth-specialist.md) - Authentication and identity management
- 🤖 [**agent-specialist**](user/.claude/agents/agent-specialist.md) - AI agent development and tool-calling
- 📊 [**data-specialist**](user/.claude/agents/data-specialist.md) - Data processing, analytics, and ETL pipelines
- ⚖️ [**legal-specialist**](user/.claude/agents/legal-specialist.md) - Legal compliance and privacy regulations

### Content & Communication
- 🟣 [**design-specialist**](user/.claude/agents/design-specialist.md) - UI/UX design and component libraries
- 🔷 [**documentation-writer**](user/.claude/agents/documentation-writer.md) - Technical documentation and guides
- 🟠 [**content-specialist**](user/.claude/agents/content-specialist.md) - AI-powered media generation
- 🩷 [**research-specialist**](user/.claude/agents/research-specialist.md) - Information gathering and analysis

**Usage:** `"Use the [agent-name] to [specific task]"`

## Skills

Skills are context-triggered capabilities. They activate automatically or can be invoked directly.

### X/Twitter
- [x-reader](skills/x-reader/SKILL.md) - Fetch tweets, search X, get user timelines via X.com API v2 (requires `X_BEARER_TOKEN`)
- [x-research](skills/x-research/SKILL.md) - Research X/Twitter trends and sentiment via xAI Grok (requires `XAI_API_KEY`)

### Content & Media
- [frontend-design](skills/frontend-design/SKILL.md) - Bold UI designs that avoid generic AI aesthetics
- [ui-audio-theme](skills/ui-audio-theme/SKILL.md) - Generate cohesive UI sound effects
- [cli-demo-gif](skills/cli-demo-gif/SKILL.md) - Create terminal demo GIFs for documentation

### Development
- [npm-publish](skills/npm-publish/SKILL.md) - Publish packages with changelog and version management
- [dev-browser](skills/dev-browser/SKILL.md) - Browser automation for testing and research
- [notebooklm](skills/notebooklm/SKILL.md) - Query Google NotebookLM for source-grounded answers
- [hook-manager](user/.claude/skills/hook-manager/SKILL.md) - Discover and install automation hooks

### Integrations
- [resend-integration](skills/resend-integration/SKILL.md) - Email with Resend Audiences and webhooks
- [plaid-integration](skills/plaid-integration/SKILL.md) - Banking data via Plaid API

## Slash Commands

Commands follow the format `/opl:category:command [arguments]`:

### 🛠️ Development (`dev`)
- `/opl:dev:lint` - Run linting and fix code quality issues
- `/opl:dev:enhance` - Improve code with AI assistance
- `/opl:dev:create-prompt` - Create new prompt templates
- `/opl:dev:update-prompt` - Update existing prompts

### 🎨 Design (`design`)
- `/opl:design:design` - Get AI-powered design assistance
- `/opl:design:ai-inspiration` - Generate design inspiration and concepts

### 📚 Documentation (`docs`)
- `/opl:docs:prd` - Create Product Requirements Documents
- `/opl:docs:prd-enhanced` - Enhanced PRD with detailed analysis
- `/opl:docs:check` - Validate and improve documentation

### 🔗 Integrations (`integrations`)
- `/opl:integrations:auth` - Set up authentication systems
- `/opl:integrations:auth-smoke` - Run authentication smoke tests
- `/opl:integrations:stripe` - Integrate Stripe payments
- `/opl:integrations:bsv` - Bitcoin SV blockchain integration
- `/opl:integrations:tanstack` - TanStack Query integration

### 🔌 MCP Servers (`mcp`)
- `/opl:mcp:install-magic` - Install 21st.dev Magic MCP server
- `/opl:mcp:install-playwright` - Install Playwright testing MCP server
- `/opl:mcp:install-github` - Install GitHub MCP server

### 🔧 Utilities (`utils`)
- `/opl:utils:find` - Advanced file and code search
- `/opl:utils:context` - Generate contextual information

## Automation Hooks

Hooks are opt-in automation that runs in the background. Use the `hook-manager` skill or install manually:

| Hook | Description |
|------|-------------|
| `protect-env-files` | Blocks edits to .env files (security - recommended) |
| `uncommitted-reminder` | Shows uncommitted changes when Claude stops |
| `auto-git-add` | Auto-stages files after edits |
| `time-dir-context` | Adds timestamp/dir/branch to prompts |
| `lint-on-save` | Runs lint:fix after file edits |
| `lint-on-start` | Runs linting on session start |
| `auto-test-on-save` | Runs tests after file edits |
| `protect-shadcn-components` | Protects shadcn UI components |

**Install a hook:**
```bash
mkdir -p ~/.claude/hooks
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/<hook-name>.json ~/.claude/hooks/
```

## Custom Statusline

**Moved to Plugin:** Statusline is now distributed as the `claude-peacock` plugin.

### Installation

```bash
/plugin marketplace add b-open-io/claude-plugins
/plugin install claude-peacock@b-open-io
```

Auto-configures on first session with:
- **Project tracking** - Shows CWD (⌂) and last edited project (✎)
- **Lint status** - Error/warning counts
- **Git branch** - Branch name with dirty indicator (*)
- **Clickable file paths** - OSC 8 hyperlinks to open in your editor
- **Peacock themes** - 24-bit true color from VSCode settings

### Configuration

No configuration needed - auto-detects code directory and editor!

Optional overrides:
```bash
export CODE_DIR="$HOME/custom/path"    # Override auto-detected code directory
export EDITOR_SCHEME="vscode"          # Override auto-detected editor
```

See the [claude-peacock plugin](https://github.com/b-open-io/claude-peacock) for full documentation.

## Repository Structure

```
prompts/
├── user/.claude/
│   ├── agents/             # Specialized AI agents
│   ├── commands/opl/       # OPL slash commands (copy to ~/.claude/commands/opl)
│   └── hooks/              # Automation hooks (copy to ~/.claude/hooks)
├── design/                 # Prompt templates (design)
├── development/            # Prompt templates (development)
├── README.md
└── QUICKSTART.md
```

## Key Features

### 🚀 Instant Productivity
- Pre-built commands for common tasks
- Expert agents for specialized work
- Automation that works in the background

### 🔗 Ecosystem Integration
- Works with our entire BSV development stack
- Integrates with BigBlocks, Sigma Identity, and more
- Compatible with init-prism project generation

### 🛠️ Extensible
- Create custom commands with prompt-engineer
- Modify agents for your workflow
- Build new automation hooks

## Advanced Usage

### Working with Agents

Agents can be explicitly requested for specific tasks:

```
"Use the prompt-engineer agent to create a deployment command"
"Have the bitcoin-specialist review this transaction builder"
"Ask the design-specialist about component library best practices"
```

### Chaining Commands

If you use OPL commands, you can chain them for complex workflows. See that repository for details.

### Custom Workflows

Create project-specific automation by combining:
1. Specialized agents for expertise
2. Slash commands for automation
3. Hooks for background tasks
4. Prompts for complex operations

## Common Use Cases

### Starting a New Project
```bash
# Use init-prism with our prompts
init-prism create my-app --template bitcoin-auth

# Set up integrations
/opl:integrations:auth
/opl:integrations:stripe
/opl:integrations:bsv
```

### Code Quality
```bash
# Audit and fix code
/opl:dev:lint
/opl:dev:enhance
"Ask the code-auditor to review security vulnerabilities"
"Have the test-specialist create comprehensive tests"
```

### Documentation
```bash
# Generate comprehensive docs
/opl:docs:prd "Project Name"
/opl:docs:check
"Have the documentation-writer create a comprehensive README"
```

### MCP Server Setup
```bash
# Install powerful MCP servers
/opl:mcp:install-magic       # AI-powered component generation
/opl:mcp:install-playwright  # End-to-end testing
/opl:mcp:install-github      # GitHub integration
```

## Recommended Permissions

Some agents use CLI tools that require permission. To avoid repeated prompts, add these to your `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(agent-browser:*)",
      "Bash(curl:*)",
      "Bash(jq:*)"
    ]
  }
}
```

Or use `/permissions` to add them interactively.

## Skill Limits & Configuration

Claude Code has a default **15,000 character budget** for skill metadata. When you have many skills installed, some may be truncated from Claude's context.

### Symptoms
- `/skills` shows fewer skills than expected
- Claude doesn't recognize skills you know are installed
- "75 of 107 skills" type messages

### Fix: Increase the Budget

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

Then restart your terminal and Claude Code.

### Check Current Status

Run `/context` to see token usage and which skills are being truncated.

## Tips & Best Practices

1. **Use agents for expertise** - They have specialized knowledge
2. **Slash commands for speed**
3. **Combine tools** - Agents + commands = powerful workflows
4. **Keep updated** - Pull latest from this repo to get new agents/prompts

## Need Help?

- **New to Claude Code?** See our [Quick Start Guide](QUICKSTART.md)
- **Browse examples:** Check the `design/` and `development/` directories

## Contributing

When adding new content:
1. **Commands** go in `user/.claude/commands/opl/[category]/`
2. **Agents** go in `user/.claude/agents/`
3. **Hooks** go in `user/.claude/hooks/`
4. Use the prompt-engineer agent for creating commands
5. Test thoroughly before committing
