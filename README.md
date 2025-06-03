# Prompts Repository

A collection of powerful, task-specific prompts for automating complex workflows in our BSV blockchain development ecosystem.

## 🎯 Purpose

This repository contains reusable prompts that combine Claude Code capabilities, init-prism project generation, and our extensive toolchain to automate:

- **Server Maintenance** - Health checks, performance monitoring, log analysis
- **Project Operations** - Cross-project updates, dependency management, release coordination  
- **Report Generation** - Analytics, metrics, security audits
- **Development Workflows** - Project scaffolding, testing automation, deployment
- **Blockchain Operations** - Transaction monitoring, identity management, ordinals handling

## 🚀 Quick Start

Each prompt is designed to be self-contained and executable. Browse the collection, copy the prompt you need, and customize for your specific use case.

```bash
# Example usage with Claude Code
claude -p prompts/bigblocks/component-ecosystem-manager.md

# Or copy content for use in other AI tools
cat prompts/development/cross-project-dependency-update.md
```

## 📁 Repository Structure

```
prompts/
├── README.md              # This file
├── CLAUDE.md              # Claude Code integration guidance
├── registry.json          # Central prompt registry with metadata
├── prompt-schema.json     # JSON schema for prompt structure
├── .gitignore            # Git ignore configuration
│
├── bigblocks/            # BigBlocks component management
├── development/          # Development workflow automation  
├── blockchain/           # BSV-specific operations
├── analytics/            # Reporting and metrics
├── infrastructure/       # DevOps and deployment
├── server/               # Server maintenance and monitoring
└── cross-project/        # Multi-repository operations
```

## 📋 Prompt Format

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

## 🔍 Finding Prompts

### By Category
Browse prompts organized by their primary function:
- `bigblocks/` - Bitcoin UI component management
- `development/` - Code and dependency management
- `blockchain/` - BSV network operations
- `analytics/` - Metrics and reporting
- `infrastructure/` - DevOps automation
- `server/` - System administration
- `cross-project/` - Multi-repo coordination

### Using the Registry
The `registry.json` file contains metadata for all prompts:

```bash
# Search registry with jq
cat registry.json | jq '.prompts[] | select(.tags[] | contains("components"))'

# List all prompts in a category
cat registry.json | jq '.prompts[] | select(.category == "development")'
```

## 🛠️ Contributing

When adding new prompts:

### 1. Follow the Standard Format
Use the template structure with proper frontmatter and sections.

### 2. Update the Registry
Add your prompt to `registry.json` with complete metadata.

### 3. Test Thoroughly
Ensure the prompt works as expected before committing.

### 4. Document Requirements
List all required tools, environment variables, and dependencies.

### 5. Include Examples
Provide clear usage examples and expected outcomes.

## 🔄 Interoperability

This repository follows emerging standards for prompt organization:

- **YAML Frontmatter**: Metadata in standard YAML format
- **JSON Schema**: Structured validation for prompt metadata
- **Markdown Content**: Human-readable prompt content
- **Registry System**: Central index for discovery and search
- **Category Taxonomy**: Consistent categorization across prompts

## 🤝 Integration

### With Claude Code
```bash
# Add to Claude Code configuration
claude mcp add prompts "cat ~/code/prompts/{category}/{prompt}.md"
```

### With Other Tools
- Export prompts as JSON using the registry
- Convert to tool-specific formats as needed
- Use the schema for validation

## 📊 Statistics

- **Total Prompts**: 1 (and growing!)
- **Categories**: 7
- **Contributors**: 1

## 🔗 Ecosystem Integration

Our prompts leverage:
- **Claude Code SDK** - Autonomous iteration and build verification
- **init-prism** - AI-powered project generation with access to this prompts repository
- **agent-master** - MCP server coordination across AI tools
- **bsv-mcp** - Blockchain functionality exposure
- **BigBlocks** - Bitcoin component library
- **gib** - Git + blockchain version control

## 🔄 InitPRISM Recursive Integration

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

---

Built for the BSV development ecosystem • [Contributing Guidelines](./CONTRIBUTING.md)