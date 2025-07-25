# OPL Prompts Registry

A collection of powerful, task-specific prompts for automating complex workflows in our BSV blockchain development ecosystem.

## Purpose

This repository contains reusable prompts that combine Claude Code capabilities, init-prism project generation, and our extensive toolchain to automate:

- **Project Operations** - Cross-project updates, dependency management, release coordination  
- **Report Generation** - Analytics, metrics, security audits
- **Development Workflows** - Project scaffolding, testing automation, deployment
- **Blockchain Operations** - Transaction monitoring, identity management, ordinals handling

## Quick Start

**New to Claude Code?** See our [Quick Start Guide](QUICKSTART.md) for step-by-step setup instructions.

### Using Claude Code Slash Commands

#### Repository Management Commands (Available in this repo)

These commands are available when working in the prompts repository:

| Command | Purpose | Usage |
|---------|---------|-------|
| `/opl:prompts:help` | Show help for prompts repository | Get overview of available commands |
| `/opl:prompts:init` | Initialize user commands from repo | First-time setup |
| `/opl:prompts:sync` | Sync commands between repo and local | Update existing commands |
| `/opl:agents:init` | Install specialized AI agents | Copy agents to ~/.claude/agents |
| `/opl:agents:sync` | Sync agents between repo and local | Update agents |
| `/opl:hooks:init` | Install automation hooks | Copy hooks to ~/.claude/hooks |
| `/opl:hooks:sync` | Sync hooks between repo and local | Update hooks |
| `/opl:prompts:help` | Repository help | Get overview and guidance |

#### Quick Start Setup

1. **Initialize User Commands** (first time only):
   ```bash
   # Copy all OPL commands from repo to your local ~/.claude/commands/
   /opl:prompts:init
   ```

2. **Initialize Agents & Hooks**:
   ```bash
   # Install specialized AI agents
   /opl:agents:init
   
   # Install automation hooks
   /opl:hooks:init
   ```

3. **Keep Everything Updated**:
   ```bash
   # Sync commands with latest from repo
   /opl:prompts:sync
   
   # Update agents
   /opl:agents:sync
   
   # Check repository help
   /opl:prompts:help
   ```

4. **Access Installed Commands**:
   ```bash
   # Commands use organization:category:command format
   /opl:utils:find yours ~/code     # Fast file search
   /opl:dev:lint                    # Code quality tools
   /opl:integrations:bsv            # BSV SDK documentation
   /opl:design:ai-inspiration       # AI design tools
   /opl:docs:prd                    # Product requirements
   /opl:mcp:install-magic           # MCP server installation
   
   # Format: /organization:category:command [arguments]
   ```

5. **Get Help**:
   ```bash
   # Get help with repository management
   /opl:prompts:help
   ```

### Using Prompts Directly

Each prompt is designed to be self-contained and executable:

```bash
# Example usage with Claude Code
claude -p prompts/development/initprism-meta-prompt-generator.md

# Or copy content for use in other AI tools
cat prompts/development/fumadocs-integration-guide.md
```

## Repository Structure

**IMPORTANT**: This repository has two distinct directories:
- `.claude/` - Commands for managing THIS repository only
- `user/.claude/` - Content to be distributed to end users

```
prompts/
├── README.md              # This file
├── CLAUDE.md              # Claude Code integration guidance
├── .gitignore            # Git ignore configuration
│
├── .claude/              # REPOSITORY-SPECIFIC Claude Code configuration
│   └── commands/         # Commands ONLY for managing this prompts repo
│       └── opl/          # Repository management commands
│           ├── prompts/
│           │   ├── help.md    # Help for prompts repo management
│           │   ├── init.md    # Initialize user commands from repo
│           │   └── sync.md    # Sync user commands with repo
│           ├── agents/
│           │   ├── init.md    # Install agents to ~/.claude/agents
│           │   └── sync.md    # Sync agents with repo
│           ├── hooks/
│           │   ├── init.md    # Install automation hooks
│           │   └── sync.md    # Update hook definitions
│           └── prompts/
│               └── help.md    # Help for repository management
│
├── user/                 # DISTRIBUTABLE content for end users
│   └── .claude/
│       ├── commands/     # Commands users copy to ~/.claude/commands
│       │   └── opl/      # OPL organization namespace
│       │       ├── utils/
│       │       │   └── find.md           # Fast file/content search
│       │       ├── dev/
│       │       │   ├── lint.md           # Linting tools
│       │       │   ├── enhance.md        # Enhance commands
│       │       │   ├── create-prompt.md  # Create new commands
│       │       │   └── update-prompt.md  # Update commands
│       │       ├── design/
│       │       │   ├── design.md         # Design resources
│       │       │   └── ai-inspiration.md # AI design tools
│       │       ├── docs/
│       │       │   ├── prd.md            # Product requirements
│       │       │   └── prd-enhanced.md   # Enhanced PRD
│       │       ├── integrations/
│       │       │   ├── stripe.md         # Stripe integration
│       │       │   ├── auth.md           # OAuth & Sigma Identity
│       │       │   ├── tanstack.md       # TanStack Query
│       │       │   └── bsv.md            # BSV SDK docs
│       │       └── mcp/
│       │           ├── install-magic.md  # Install Magic MCP
│       │           └── install-playwright.md # Install Playwright MCP
│       ├── agents/       # Specialized AI agents
│       │   ├── prompt-engineer.md    # Claude Code command expert
│       │   ├── design-specialist.md  # UI/UX and components
│       │   ├── integration-expert.md # API and auth specialist
│       │   ├── mcp-specialist.md     # MCP server management
│       │   ├── bitcoin-specialist.md # BSV blockchain expert
│       │   ├── code-auditor.md       # Security and quality
│       │   ├── documentation-writer.md # Technical docs
│       │   └── research-specialist.md  # Information gathering
│       └── hooks/        # Claude Code automation hooks
│           ├── time-dir-context.json      # Add context to every prompt
│           ├── auto-git-add.json          # Auto-stage file changes
│           ├── uncommitted-reminder.json  # Remind about uncommitted changes
│           ├── protect-env-files.json     # Protect sensitive files
│           └── auto-test-on-save.json     # Run tests automatically
│
├── design/               # UI/UX design tools and frameworks
│   ├── 21st-dev-magic.md
│   ├── biome.md
│   ├── fumadocs.md
│   ├── shadcn.md
│   ├── tailwind-nextjs.md
│   ├── ui-inspiration.md
│   └── ultracite.md
├── development/          # Development workflow automation
│   ├── 1sat-ordinals.md
│   ├── bsv-sdk.md
│   ├── fumadocs-integration-guide.md
│   └── initprism-meta-prompt-generator.md
└── infrastructure/       # DevOps and deployment
```

## Prompt Format

Prompts use simple YAML frontmatter followed by markdown content:

```markdown
---
title: "Your Prompt Title"
description: "Brief description of what the prompt does"
---

# Your Prompt Title

Content of your prompt...
```

That's it! Just a title and description to help users understand what the prompt does.

## Finding Prompts

Browse prompts organized by their primary function:
- `design/` - UI/UX frameworks, design tools, and resources
- `development/` - Code and dependency management  
- `infrastructure/` - DevOps automation

Each directory contains markdown files with prompts for specific tasks.

## Interoperability

This repository uses simple, standard formats:

- **YAML Frontmatter**: Simple title and description
- **Markdown Content**: Human-readable prompt content
- **Directory Organization**: Prompts grouped by function

## Integration

### With Claude Code
```bash
# Add to Claude Code configuration
claude mcp add prompts "cat ~/code/prompts/{category}/{prompt}.md"
```

### With Other Tools
- Export prompts as JSON using the registry
- Convert to tool-specific formats as needed
- Use the schema for validation

## Current Content

The repository contains prompts across multiple categories:
- Design & UI tools
- Development workflows
- Infrastructure automation

## Ecosystem Integration

Our prompts leverage:
- **Claude Code SDK** - Autonomous iteration and build verification
- **init-prism** - AI-powered project generation with access to this prompts repository
- **Sigma Identity** - Primary OAuth 2.0 authentication (auth.sigmaidentity.com)
- **agent-master** - MCP server coordination across AI tools
- **bsv-mcp** - Blockchain functionality exposure
- **BigBlocks** - Bitcoin component library
- **gib** - Git + blockchain version control

## InitPRISM Recursive Integration

**POWERFUL**: InitPRISM now has access to this prompts repository, enabling:

### Self-Referential Project Generation
- **Prompt-Aware Projects**: New projects generated with knowledge of existing automation
- **Built-in Maintenance**: Projects include references to relevant maintenance prompts
- **Ecosystem Consistency**: Automatic integration of BigBlocks, testing, and deployment patterns

### Meta-Automation Examples
```bash
# InitPRISM can now generate projects that:
# 1. Include BigBlocks components with ecosystem manager automation
# 2. Set up cross-project dependency update workflows
# 3. Configure analytics and reporting from day one
# 4. Integrate blockchain operations with proper monitoring
```

### Prompt Evolution
- **Meta-Prompts**: Prompts that generate other prompts for specific use cases
- **Composable Workflows**: Chain multiple prompts for complex automation scenarios
- **Template Enhancement**: Project templates that reference specific prompts for ongoing tasks

## Contributing

When adding new prompts:

### 1. Follow the Standard Format
Use the template structure with proper frontmatter and sections.

### 2. Update the Registry
Run `./scripts/generate-registry.sh` to auto-generate the registry with your new prompt.

### 3. Test Thoroughly
Ensure the prompt works as expected before committing.

### 4. Document Requirements
List all required tools, environment variables, and dependencies.

### 5. Include Examples
Provide clear usage examples and expected outcomes.

