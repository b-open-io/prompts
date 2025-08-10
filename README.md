# OPL Prompts & AI Agents

**Supercharge Claude Code with specialized AI agents and prompts** for BSV blockchain development, project automation, and workflow optimization.

## What This Repository Does

This repository provides:
- **Specialized AI Agents** - Expert sub-agents for specific tasks (design, security, documentation, content, payments, auth, etc.)
- **Slash Commands** - Instant automation tools under the OPL namespace
- **Automation Hooks** - Background workflows to enhance development
- **Powerful Prompts** - Reusable templates for complex operations

## Quick Start (30 seconds)

```bash
# 1. Clone this repository
git clone https://github.com/b-open-io/prompts.git
cd prompts

# 2. Launch Claude Code in this repo
claude

# 3. Run the sync commands to install everything
/opl:agents:sync
/opl:commands:sync  
/opl:hooks:sync

# That's it! All agents, commands, and hooks are now installed.
```

**Advanced sync options:**
- Add `--auto` to auto-resolve to newest versions
- Add `--repo` to pull all from repository  
- Add `--local` to push all to repository
- Add `--merge` to combine changes intelligently
- Default is interactive mode for full control

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

Hooks run automatically to enhance your workflow:

- **time-dir-context** - Adds timestamp and directory to every prompt
- **auto-git-add** - Auto-stages changed files
- **uncommitted-reminder** - Reminds about uncommitted changes
- **protect-env-files** - Prevents accidental .env modifications
- **auto-test-on-save** - Runs tests when files change

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

