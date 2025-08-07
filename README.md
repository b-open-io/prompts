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

# 2. Install Claude Code CLI (choose one)
# bun (preferred)
bun add -g @anthropic-ai/claude-code
# or npm
npm install -g @anthropic-ai/claude-code

# 3. Install agents, commands, and hooks (copy to your user directory)
mkdir -p ~/.claude/agents
cp -R user/.claude/agents/* ~/.claude/agents/
mkdir -p ~/.claude/commands/opl
cp -R user/.claude/commands/opl/* ~/.claude/commands/opl/
mkdir -p ~/.claude/hooks
cp -R user/.claude/hooks/* ~/.claude/hooks/

# 4. Launch Claude Code in this repo
claude
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

## Slash Commands

Commands follow the format:
```
/organization:category:command [arguments]
```
Categories include `utils`, `dev`, `design`, `docs`, `integrations`, and `mcp`.

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

