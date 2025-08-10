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

Our agents are expert sub-agents that enhance Claude Code with specialized knowledge:

### 🔵 prompt-engineer
**Expert in Claude Code commands and prompt development**
- Creates and edits slash commands
- Develops prompt templates
- Ensures proper YAML frontmatter
- Validates command structure

```
"Use the prompt-engineer agent to create a new slash command for deployment automation"
```

### 🟣 design-specialist  
**UI/UX and component library expert**
- Shadcn/ui and BigBlocks components
- Tailwind CSS optimization
- Design system architecture
- Accessibility best practices

```
"Have the design-specialist help me set up a component library with shadcn/ui"
```

### 🟢 integration-expert
**API and third-party service specialist**
- REST API design and integration
- Webhook implementation
- Third-party service connections
- Error handling and retry logic

```
"Ask the integration-expert to implement a Slack notification webhook"
```

### 🟠 mcp-specialist
**Model Context Protocol server expert**
- MCP server development and deployment
- Tool registration and schema validation
- Transport modes (stdio, HTTP/SSE)
- Cross-tool compatibility

```
"Get the mcp-specialist to create a new MCP server for database operations"
```

### 🟡 bitcoin-specialist
**BSV blockchain and cryptography expert**
- Transaction building and broadcasting
- Bitcoin script and opcodes
- Ordinals and token protocols
- Key management and signatures

```
"Have the bitcoin-specialist implement 1Sat Ordinals inscription logic"
```

### 🔴 code-auditor
**Security and code quality specialist**
- Security vulnerability detection
- Performance optimization
- Best practices enforcement
- Dependency auditing

```
"Ask the code-auditor to review this authentication flow for security issues"
```

### 🔷 documentation-writer
**Technical documentation expert**
- README files with quickstarts
- API documentation
- Architecture diagrams
- User guides

```
"Use the documentation-writer to create a comprehensive README for this project"
```

### 🩷 research-specialist
**Information gathering and analysis expert**
- Technical research with xAI/Grok integration
- Real-time X/Twitter trends analysis
- Best practices discovery
- Tool evaluation

```
"Have the research-specialist find the best practices for WebSocket scaling"
```

### 🟠 content-specialist
**AI-powered media generation expert**
- Image generation with xAI's grok-2-image
- Hero images and logos
- Architecture diagrams
- Documentation screenshots

```
"Ask the content-specialist to create a hero image for the README"
```

### 💚 payment-specialist
**Payment processing and financial operations expert**
- Stripe integration and webhooks
- BSV and crypto payments
- Subscription management
- PCI compliance and security

```
"Have the payment-specialist implement a subscription billing system with Stripe"
```

### 🔵 auth-specialist
**Authentication and identity management expert**
- OAuth 2.0 and OIDC implementation
- JWT and session management
- Passwordless authentication
- Multi-factor authentication (MFA)

```
"Ask the auth-specialist to set up OAuth with GitHub and Google providers"
```

### 🧪 test-specialist
**Testing and quality assurance expert**
- Unit, integration, and e2e testing
- Test framework implementation
- Coverage analysis and reporting
- CI/CD test automation

```
"Have the test-specialist create a comprehensive test suite with Jest and Playwright"
```

### 🚀 optimizer
**Performance and efficiency expert**
- Bundle analysis and optimization
- Runtime performance profiling
- Memory usage optimization
- Build process improvements

```
"Ask the optimizer to improve the application's load time and bundle size"
```

### 🤖 agent-specialist
**AI agent development expert**
- OpenAI/Vercel SDK integration
- Tool-calling and routing systems
- Memory and state management
- Conversational AI interfaces

```
"Use the agent-specialist to build a customer service chatbot with tool calling"
```

### 🏗️ architecture-reviewer
**Large-scale system design expert**
- Comprehensive architectural analysis
- Large-scale refactoring planning
- System design reviews
- Technical debt assessment

```
"Have the architecture-reviewer analyze this microservices architecture for scalability"
```

### 🧹 consuela
**System organization and cleanup specialist**
- File structure management
- Duplicate removal and consolidation
- Codebase organization
- Clean architecture enforcement

```
"Ask consuela to organize and clean up this scattered codebase structure"
```

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

