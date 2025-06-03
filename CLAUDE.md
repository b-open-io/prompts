# CLAUDE.md

This file provides guidance to Claude Code when working with the prompts repository.

## Repository Overview

This is a collection of powerful, task-specific prompts designed to leverage our entire BSV blockchain development ecosystem. The prompts combine Claude Code capabilities, init-prism project generation, and our extensive toolchain to automate complex workflows.

## Purpose

Create reusable, powerful prompts for:
- Server maintenance and monitoring
- Project generation and scaffolding
- Report generation and analytics
- Cross-project operations
- Blockchain development workflows
- CI/CD automation
- Code quality and security audits

## Project Context

This repository builds on our monorepo containing:
- **Bitcoin SV Libraries**: go-sdk, bitcoin-auth, bsv-mcp, ordinals tools
- **Applications**: 1sat-api, discord-bot, wallet apps, identity platforms  
- **Development Tools**: agent-master, gib (git+blockchain), init-prism
- **Infrastructure**: MCP servers, overlay services, authentication systems

## Prompt Categories

### 1. Project Management
- Cross-project dependency updates
- Version synchronization
- Release coordination
- Security audits

### 2. Development Workflows
- Project scaffolding with init-prism
- Component extraction and reuse
- API endpoint generation
- Testing automation

### 3. Blockchain Operations
- Transaction monitoring
- Ordinals management
- Token operations
- Identity management

### 4. Infrastructure
- Server health checks
- Performance monitoring
- Backup verification
- Configuration management

## Development Notes

- Each prompt should be self-contained and executable
- Include error handling and validation
- Document required permissions and dependencies
- Test prompts thoroughly before committing
- Keep prompts focused on specific, repeatable tasks

## Tools Integration

- **Claude Code SDK**: For programmatic Claude interactions
- **init-prism**: Project generation and scaffolding
- **agent-master**: MCP server coordination
- **bsv-mcp**: Blockchain functionality exposure
- **gib**: Git + blockchain version control