# OPL Prompts & AI Agents

**Supercharge Claude Code with specialized AI agents and powerful slash commands** for BSV blockchain development, project automation, and workflow optimization.

## What This Repository Does

This repository provides:
- **11 Specialized AI Agents** - Expert sub-agents for specific tasks (design, security, documentation, content, payments, auth, etc.)
- **20+ Slash Commands** - Instant automation tools available with `/opl:` prefix
- **Automation Hooks** - Background workflows that enhance your development
- **Powerful Prompts** - Reusable templates for complex operations

## Quick Start (30 seconds)

```bash
# 1. Clone this repository
git clone https://github.com/b-open-io/prompts.git
cd prompts && claude

# 2. Install everything (run these in Claude Code while in the prompts directory)
/opl:prompts:init    # Install slash commands
/opl:agents:init     # Install AI agents
/opl:hooks:init      # Install automation hooks

# 3. Start using commands anywhere
/opl:utils:find "bitcoin" ~/code    # Fast search
/opl:dev:lint                       # Code quality
/opl:docs:prd                       # Generate PRD
```

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

## Slash Commands Explained

Slash commands are instant automation tools available in Claude Code. They follow the format:
```
/organization:category:command [arguments]
```

### Available Command Categories

#### 🔧 **Utils** (`/opl:utils:`)
- `/opl:utils:find` - Lightning-fast file and content search

#### 💻 **Development** (`/opl:dev:`)
- `/opl:dev:lint` - Run Biome linting with auto-fix
- `/opl:dev:enhance` - Improve code quality and patterns
- `/opl:dev:create-prompt` - Create new slash commands
- `/opl:dev:update-prompt` - Update existing commands

#### 🎨 **Design** (`/opl:design:`)
- `/opl:design:design` - Access design resources and tools
- `/opl:design:ai-inspiration` - AI-powered design inspiration

#### 📚 **Documentation** (`/opl:docs:`)
- `/opl:docs:prd` - Generate product requirements (Shape Up format)
- `/opl:docs:prd-enhanced` - Advanced PRD with betting tables

#### 🔌 **Integrations** (`/opl:integrations:`)
- `/opl:integrations:stripe` - Stripe payment integration
- `/opl:integrations:auth` - OAuth & Sigma Identity setup
- `/opl:integrations:tanstack` - TanStack Query patterns
- `/opl:integrations:bsv` - BSV SDK documentation

#### 🤖 **MCP** (`/opl:mcp:`)
- `/opl:mcp:install-magic` - Install 21st.dev Magic for AI components
- `/opl:mcp:install-playwright` - Install Playwright browser automation

### Command Examples

```bash
# Search for Bitcoin-related files
/opl:utils:find "bitcoin" ~/code

# Generate a Shape Up style PRD
/opl:docs:prd "AI-powered code review tool"

# Set up Stripe payments
/opl:integrations:stripe

# Install AI component generation
/opl:mcp:install-magic
```

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
├── user/.claude/           # Content for distribution
│   ├── commands/opl/       # Slash commands organized by category
│   ├── agents/             # Specialized AI agents
│   └── hooks/              # Automation hooks
│
├── .claude/commands/       # Repository management only
│
└── design/                 # Prompt templates by category
    development/
    infrastructure/
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

Commands can be combined for complex workflows:

```bash
# Find files, then lint them
/opl:utils:find "*.tsx" src/ && /opl:dev:lint

# Generate PRD, then create implementation plan
/opl:docs:prd "Feature X" && /opl:dev:create-prompt "implement-feature-x"
```

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
```

### Code Quality
```bash
# Audit and fix code
/opl:dev:lint
"Ask the code-auditor to review security"
```

### Documentation
```bash
# Generate comprehensive docs
/opl:docs:prd "Project Name"
"Have the documentation-writer create a README"
```

## Tips & Best Practices

1. **Use agents for expertise** - They have specialized knowledge
2. **Slash commands for speed** - Instant automation
3. **Combine tools** - Agents + commands = powerful workflows
4. **Keep updated** - Run `/opl:prompts:sync` regularly

## Need Help?

- **New to Claude Code?** See our [Quick Start Guide](QUICKSTART.md)
- **Repository help:** `/opl:prompts:help`
- **Browse examples:** Check the `design/`, `development/`, and `infrastructure/` directories

## Contributing

When adding new content:
1. **Commands** go in `user/.claude/commands/opl/[category]/`
2. **Agents** go in `user/.claude/agents/`
3. **Hooks** go in `user/.claude/hooks/`
4. Use the prompt-engineer agent for creating commands
5. Test thoroughly before committing

