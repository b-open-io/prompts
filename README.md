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

1. **Initialize User Commands** (first time only):
   ```bash
   # Copy new commands from repo to local
   /init-prompts
   ```

2. **Sync Existing Commands**:
   ```bash
   # Update and manage existing commands
   /sync-prompts
   ```

3. **Access Commands**:
   ```bash
   # Use namespaced commands
   /utils:find yours ~/code     # Fast file search
   /dev:lint                    # Code quality tools
   /integrations:bsv            # BSV SDK documentation
   /design:ai-inspiration       # AI design tools
   /docs:prd                    # Product requirements
   ```

4. **Check for Updates**:
   ```bash
   # Check version of specific command
   /version-check auth
   
   # Check all command versions
   /version-check --all
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

```
prompts/
├── README.md              # This file
├── CLAUDE.md              # Claude Code integration guidance
├── registry.json          # Central prompt registry with metadata
├── prompt-schema.json     # JSON schema for prompt structure
├── .gitignore            # Git ignore configuration
│
├── .claude/              # Claude Code configuration
│   └── commands/         # Project-level slash commands
│       ├── help-prompts.md    # Comprehensive help system
│       ├── init-prompts.md    # Initialize user commands
│       ├── sync-prompts.md    # Sync user commands
│       ├── version-check.md   # Check command versions
│       ├── update-registry.md # Auto-generate registry
│       └── publish.md         # Prepare for publishing
│
├── user/                 # User-level Claude commands
│   └── .claude/
│       └── commands/     # Commands to copy to ~/.claude/commands
│           ├── utils/
│           │   └── find.md           # Fast file/content search
│           ├── dev/
│           │   ├── lint.md           # Linting tools
│           │   ├── enhance.md        # Enhance commands
│           │   ├── create-prompt.md  # Create new commands
│           │   └── update-prompt.md  # Update commands
│           ├── design/
│           │   ├── design.md         # Design resources
│           │   └── ai-inspiration.md # AI design tools
│           ├── docs/
│           │   ├── prd.md            # Product requirements
│           │   └── prd-enhanced.md   # Enhanced PRD
│           ├── integrations/
│           │   ├── stripe.md         # Stripe integration
│           │   ├── auth.md           # OAuth & Sigma Identity
│           │   ├── tanstack.md       # TanStack Query
│           │   └── bsv.md            # BSV SDK docs
│           └── mcp/
│               ├── install-magic.md  # Install Magic MCP
│               └── install-playwright.md # Install Playwright MCP
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
├── infrastructure/       # DevOps and deployment
└── scripts/              # Utility scripts
    └── generate-registry.sh  # Auto-generate registry.json
```

## Prompt Format

All prompts follow a standardized format with YAML frontmatter for metadata and markdown content:

```markdown
---
name: "Prompt Name"
version: "1.0.0"
description: "Brief description of what the prompt does"
category: "development"
tags: ["automation", "testing", "ci-cd"]
author: "Your Name"
requirements:
  tools: ["Claude Code", "git worktrees"]
  environment: ["GITHUB_TOKEN", "BSV_NETWORK"]
metadata:
  llm_provider: ["claude", "openai"]
  complexity: "advanced"
  estimated_tokens: 5000
  time_estimate: "15-30 minutes"
---

# Prompt Title

## Mission
Clear statement of what this prompt accomplishes...

## Core Capabilities
1. **Capability One**: Description...
2. **Capability Two**: Description...

[Rest of prompt content...]
```

## Finding Prompts

### By Category
Browse prompts organized by their primary function:
- `design/` - UI/UX frameworks, design tools, and resources
- `development/` - Code and dependency management
- `infrastructure/` - DevOps automation

### Using the Registry
The `registry.json` file contains metadata for all prompts:

```bash
# Search registry with jq
cat registry.json | jq '.prompts[] | select(.tags[] | contains("components"))'

# List all prompts in a category
cat registry.json | jq '.prompts[] | select(.category == "development")'
```

## Interoperability

This repository follows emerging standards for prompt organization:

- **YAML Frontmatter**: Metadata in standard YAML format
- **JSON Schema**: Structured validation for prompt metadata
- **Markdown Content**: Human-readable prompt content
- **Registry System**: Central index for discovery and search
- **Category Taxonomy**: Consistent categorization across prompts

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

## Statistics

The registry is auto-generated to maintain accuracy:
- Run `./scripts/generate-registry.sh` to update counts
- Check `registry.json` for current statistics
- As of last update: 11 prompts across 2 active categories

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

