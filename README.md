# Prompts Repository

A collection of powerful, task-specific prompts for automating complex workflows in our BSV blockchain development ecosystem.

## Purpose

This repository contains reusable prompts that combine Claude Code capabilities, init-prism project generation, and our extensive toolchain to automate:

- **Server Maintenance** - Health checks, performance monitoring, log analysis
- **Project Operations** - Cross-project updates, dependency management, release coordination  
- **Report Generation** - Analytics, metrics, security audits
- **Development Workflows** - Project scaffolding, testing automation, deployment
- **Blockchain Operations** - Transaction monitoring, identity management, ordinals handling

## Quick Start

Each prompt is designed to be self-contained and executable. Browse the collection, copy the prompt you need, and customize for your specific use case.

```bash
# Example usage with Claude Code
claude -p prompts/server-health-audit.md

# Or copy content for use in other AI tools
```

## Repository Structure

```
prompts/
├── notes/           # Internal development notes
├── CLAUDE.md        # Claude Code integration guidance
├── server/          # Server maintenance and monitoring
├── development/     # Development workflow automation  
├── blockchain/      # BSV-specific operations
├── analytics/       # Reporting and metrics
└── cross-project/   # Multi-repository operations
```

## Contributing

When adding new prompts:
1. Make them specific and actionable
2. Include error handling and validation
3. Document required permissions and dependencies
4. Test thoroughly before committing
5. Keep focused on repeatable, valuable tasks

## Ecosystem Integration

Our prompts leverage:
- **Claude Code SDK** - Autonomous iteration and build verification
- **init-prism** - AI-powered project generation
- **agent-master** - MCP server coordination across AI tools
- **bsv-mcp** - Blockchain functionality exposure
- **BigBlocks/bitcoin-auth-ui** - Bitcoin component library
- **gib** - Git + blockchain version control

---

Built for the BSV development ecosystem • [Contributing Guidelines](./notes/CONTRIBUTING.md)