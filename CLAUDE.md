# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Repository Overview

This is the OPL Prompts Registry - a collection of powerful, task-specific prompts designed to leverage our entire BSV blockchain development ecosystem. The prompts combine Claude Code capabilities, init-prism project generation, and our extensive toolchain to automate complex workflows.

## Purpose

Create reusable, powerful prompts for:
- **Design & UI Development**: Component libraries, frameworks, design tools
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

### 1. Design & UI Development
- Component library setup (shadcn/ui, BigBlocks)
- CSS framework configuration (Tailwind CSS)
- Documentation frameworks (Fumadocs)
- Design inspiration and research tools
- AI-powered component generation (21st.dev Magic)

### 2. Project Management
- Cross-project dependency updates
- Version synchronization
- Release coordination
- Security audits

### 3. Development Workflows
- Project scaffolding with init-prism
- Component extraction and reuse
- API endpoint generation
- Testing automation

### 4. Blockchain Operations
- Transaction monitoring
- Ordinals management
- Token operations
- Identity management

### 5. Infrastructure
- Performance monitoring
- Backup verification
- Configuration management

## Directory Structure and Usage

**CRITICAL**: Understand the difference between repository-specific and distributable content:

### `.claude/` Directory (Repository-Specific)
- **Purpose**: Contains commands and settings ONLY for working on the prompts repository itself
- **Example**: `.claude/commands/opl/agents/sync.md` - syncs agents within this repo
- **When to use**: Only place files here if they are specifically for maintaining/developing the prompts repository
- **IMPORTANT**: These commands ONLY work when you're in the prompts repository directory

### `user/.claude/` Directory (For Distribution)
- **Purpose**: Contains commands, agents, and hooks to be distributed to end users
- **Example**: `user/.claude/commands/opl/mcp/install-magic.md` - users will copy this to their `~/.claude/`
- **When to use**: Place ALL commands/agents/hooks here that users should have access to across their projects
- **Contents**: 
  - `commands/opl/` - OPL organization commands with category subdirectories
  - `agents/` - Specialized AI sub-agents
  - `hooks/` - Automation hooks for workflow enhancement

### Common Mistakes to Avoid
- ❌ NEVER copy `.claude/` commands to user's `~/.claude/` directory
- ❌ NEVER put general-purpose agents in `.claude/agents/` 
- ❌ NEVER put user commands in `.claude/commands/`
- ❌ NEVER put shareable hooks in `.claude/hooks/`
- ✅ ALWAYS put distributable content in `user/.claude/`
- ✅ ONLY put repo maintenance tools in `.claude/`
- ✅ ONLY copy from `user/.claude/` to `~/.claude/`

## Development Notes

- Each prompt should be self-contained and executable
- Include error handling and validation
- Document required permissions and dependencies
- Test prompts thoroughly before committing
- Keep prompts focused on specific, repeatable tasks
- **Analyze tasks and reorganize for sub-agent parallelization** - Break complex operations into parallel sub-tasks that can be executed by multiple specialized agents simultaneously

## Agent Color Scheme

Our specialized agents use a consistent color scheme for easy identification:
- 🔵 **Blue** - prompt-engineer (command creation)
- 🟣 **Purple** - design-specialist (UI/UX)
- 🟢 **Green** - integration-expert (APIs)
- 🟠 **Orange** - mcp-specialist (MCP servers)
- 🟡 **Yellow** - bitcoin-specialist (BSV)
- 🔴 **Red** - code-auditor (security)
- 🔷 **Cyan** - documentation-writer (docs)
- 🩷 **Pink** - research-specialist (info gathering)

## Tools Integration

### Active Tools We Use
- **Claude Code SDK**: For programmatic Claude interactions with slash commands
- **init-prism**: Project generation and scaffolding with access to this prompts repository
- **21st.dev Magic MCP**: AI-powered component generation
- **shadcn/ui**: Modern React component library with CLI
- **Fumadocs**: Documentation framework with AI integration and CLI
- **Tailwind CSS**: Utility-first CSS framework with CLI
- **Next.js**: React framework for production applications with CLI
- **Vercel CLI**: Deployment platform for frontend applications
- **Railway CLI**: Backend deployment and database hosting
- **Cloudflare CLI (Wrangler)**: CDN, DNS, and edge services

### Our Projects (Referenced in Prompts)
- **BigBlocks**: Bitcoin component library
- **Sigma Identity**: OAuth 2.0 authentication system (auth.sigmaidentity.com)
- **agent-master**: MCP server coordination (WIP)
- **bsv-mcp**: Blockchain functionality exposure (WIP)  
- **gib**: Git + blockchain version control (WIP)

## Command Management

Commands in this repository are organized under the OPL namespace and can be installed to your local Claude Code configuration using the repository management commands.

## InitPRISM Integration

**POWERFUL RECURSIVE CAPABILITY**: InitPRISM now has access to this prompts repository, creating advanced automation possibilities:

### Self-Referential Prompting
- **Project Generation**: InitPRISM can reference existing prompts when generating new projects
- **Prompt Composition**: Combine multiple prompts for complex workflows
- **Template Enhancement**: Use prompts as templates for project-specific automation

### Advanced Workflows
```bash
# InitPRISM can now do things like:
# 1. Generate a new project
# 2. Reference development prompts for automated workflows
# 3. Apply design prompts for UI consistency
# 4. Use infrastructure prompts for deployment automation
```

### Prompt Evolution
- **Meta-Prompts**: Create prompts that generate other prompts
- **Ecosystem Awareness**: New projects can inherit best practices from existing prompts
- **Automated Integration**: Projects generated with awareness of our automation patterns

### Best Practices for InitPRISM Integration
1. **Reference Relevant Prompts**: When generating projects, consider which prompts apply
2. **Document Prompt Usage**: Include instructions on which prompts to use for maintenance
3. **Create Prompt Chains**: Design workflows that leverage multiple prompts sequentially
4. **Build Prompt-Aware Templates**: Templates that reference specific prompts for common tasks

## Common Commands

### Finding Prompts
```bash
# Browse prompt directories
ls -la design/
ls -la development/
ls -la infrastructure/

# Search for specific content
grep -r "shadcn" design/
```

### Repository Maintenance Commands

When working in this prompts repository, you have access to these management commands:

#### Prompts Management
- `/opl:prompts:help` - Show comprehensive help for repository management
- `/opl:prompts:init` - Initialize user commands (copy from `user/.claude/commands/opl/` to `~/.claude/commands/opl/`)
- `/opl:prompts:sync` - Synchronize commands between repository and user directory (pull/push/status)

#### Agents Management  
- `/opl:agents:init` - Install specialized agents to `~/.claude/agents/`
  - First time setup copies all agents
  - Use `--list` to preview, `--force` to overwrite
- `/opl:agents:sync` - Update agents between repository and local
  - Check status, pull updates, or contribute improvements back

#### Hooks Management
- `/opl:hooks:init` - Install automation hooks to `~/.claude/hooks/`
- `/opl:hooks:sync` - Update hook definitions between repo and local

#### Repository Help
- `/opl:prompts:help` - Get comprehensive help for repository management

**Important**: These commands are only available when working in the prompts repository itself. They help maintain and distribute the OPL command ecosystem.

## Prompt Creation Guidelines

When creating new prompts or commands:
1. **Metadata First**: Always include complete YAML frontmatter with version, description, and tags
2. **Self-Contained**: Each prompt should work independently without external dependencies
3. **Clear Mission**: Start with a clear mission statement of what the prompt accomplishes
4. **Structured Format**: Follow the established sections (Mission, Core Capabilities, etc.)
5. **Practical Examples**: Include real-world usage examples

## Directory Architecture

### Content Organization
- **Prompts** go in category directories (design/, development/, infrastructure/)
- **User commands** go in `user/.claude/commands/opl/` with category subdirectories
- **Repository commands** go in `.claude/commands/` (maintenance only)
- **Agents** go in `user/.claude/agents/` for distribution
- **Hooks** go in `user/.claude/hooks/` for automation

### Namespace Convention for Commands
Commands use a three-part namespace to avoid conflicts:
- **Format**: `/organization:category:command`
- **Example**: `/opl:utils:find` or `/opl:dev:lint`

OPL command categories:
- `opl:utils:` - General utilities (find, search)
- `opl:dev:` - Development tools (lint, enhance)
- `opl:design:` - Design and UI tools
- `opl:docs:` - Documentation generation
- `opl:integrations:` - Third-party integrations
- `opl:mcp:` - Model Context Protocol servers

## Testing Prompts

Before committing new prompts:
1. Test with Claude Code directly
2. Verify all required tools are specified
3. Check that examples produce expected output
4. Run through the prompt end-to-end

## Task Parallelization Strategy

**Always analyze tasks and reorganize for sub-agent parallelization.** When facing complex operations:

1. **Decompose the Task**: Break down into independent sub-tasks
2. **Identify Specialists**: Match sub-tasks to specialized agents
3. **Execute in Parallel**: Launch multiple agents simultaneously
4. **Coordinate Results**: Merge outputs into cohesive solution

### Example Parallelization Pattern
```
Complex Task: "Create a new payment integration with documentation"

Parallel Execution:
├── payment-specialist: Implement Stripe integration
├── auth-specialist: Add API authentication
├── documentation-writer: Create integration guide
└── code-auditor: Security review

Result: All tasks complete simultaneously, reducing time by 75%
```

this is a simple example, in reality you want to be as detailed as possible as each subagent may not have some key information in context. Be desriptive with your tasks intended for agents.

## Working with Specialized Agents

When developing in this prompts repository, leverage our specialized agents to enhance your workflow:

### 🔵 Use the prompt-engineer agent for:
- Creating new slash commands in `user/.claude/commands/`
- Editing existing command files
- Developing prompt templates
- Ensuring proper YAML frontmatter format
- Validating command structure and permissions

**Example usage:**
```
"Use the prompt-engineer agent to create a new command for..."
"Have the prompt-engineer update the metadata in this command..."
```

### Other agents for repository work:
- 🔷 **documentation-writer** - For updating README files and documentation
- 🔴 **code-auditor** - For reviewing prompt security and best practices
- 🩷 **research-specialist** - For gathering information about tools and integrations

### Agent Usage Best Practice
When editing files in this repository, especially command and prompt files, explicitly request the appropriate agent:
```
"Use the prompt-engineer agent to edit the install-magic.md command"
"Have the documentation-writer update the agent descriptions"
```

This ensures that commands follow our established patterns and maintain consistency across the OPL ecosystem.