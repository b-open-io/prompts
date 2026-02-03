# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Version Management for Agents, Commands, and Skills

**CRITICAL - READ THIS FIRST**: Only increment by +0.0.1 (patch) for virtually ALL changes.

### The Rule
```
ALWAYS: x.y.z → x.y.(z+1)    e.g., 2.0.0 → 2.0.1
NEVER:  x.y.z → x.(y+1).0    unless explicitly told to
NEVER:  x.y.z → (x+1).0.0    unless explicitly told to
```

### What Counts as Patch (+0.0.1)
- Bug fixes
- New features
- Documentation updates
- Adding new sections
- Refactoring
- Adding fallbacks
- Improving error messages
- ANY normal development work

### What Counts as Minor (+0.1.0) - RARE
- Complete API redesign (user explicitly requests)
- Major architectural change (user explicitly requests)

### What Counts as Major (+1.0.0) - EXTREMELY RARE
- Breaking changes requiring user migration
- Complete rewrite with incompatible interface

**When in doubt, use +0.0.1. You almost certainly want +0.0.1.**

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

This repository is a **Claude plugin** with standard plugin structure. Components live at root level.

### Plugin Structure (Root Level)
```
prompts/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest
├── agents/              # Specialized AI sub-agents (19+ files)
├── commands/            # User commands with OPL namespace
├── skills/              # Skill definitions with scripts
└── hooks/               # Automation hooks
```

### Installation
This plugin is distributed via the Claude Code marketplace:
```bash
/plugin install bopen-tools@b-open-io
```

### Root-Level Directories
- **`agents/`** - Specialized AI sub-agents
- **`commands/`** - User commands with OPL namespace categories
- **`skills/`** - Skill definitions with SKILL.md and scripts/
- **`hooks/`** - Automation hooks

## Development Notes

- Each prompt should be self-contained and executable
- Include error handling and validation
- Document required permissions and dependencies
- Test prompts thoroughly before committing
- Keep prompts focused on specific, repeatable tasks
- **Analyze tasks and reorganize for sub-agent parallelization** - Break complex operations into parallel sub-tasks that can be executed by multiple specialized agents simultaneously

## Version Management Guidelines

**CRITICAL VERSION POLICY**: When updating agents, commands, or prompts, use minimal version increments to avoid version number inflation:

### Version Bump Rules
- ✅ **PATCH updates only**: Use `x.y.z` → `x.y.(z+1)` format (e.g., 3.1.0 → 3.1.1)
- ❌ **NO major bumps**: Never increment `x.0.0` unless it's a complete rewrite
- ❌ **NO minor bumps**: Avoid `x.y.0` increments unless adding entirely new major functionality

### When to Bump Versions
- **Patch (0.0.1)**: Bug fixes, small improvements, content additions, diagnostic enhancements
- **Minor (0.1.0)**: New features, new tools, significant capability additions  
- **Major (1.0.0)**: Complete rewrites, breaking changes, fundamental restructuring

### Examples
```
✅ Good: 3.1.0 → 3.1.1 (added diagnostic section)
✅ Good: 2.5.3 → 2.5.4 (fixed command syntax)  
✅ Good: 1.8.9 → 1.8.10 (improved error handling)

❌ Bad: 3.1.0 → 4.0.0 (just for adding diagnostics)
❌ Bad: 2.5.3 → 3.0.0 (minor content update)
❌ Bad: 1.8.9 → 2.0.0 (small enhancement)
```

**Remember**: We want sustainable versioning - at current rate we'd hit version 400 within weeks!

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
- **critique**: Beautiful terminal/web UI for reviewing git diffs (requires Bun)

### Showing Users Code Changes with Critique

When users ask to see what changed, use `critique` to display diffs. Since the TUI is hidden inside Bash tool calls, use one of these visible approaches:

```bash
# Split pane (macOS/iTerm2) - opens TUI in split, auto-closes on quit
/path/to/skills/critique/scripts/open-critique-pane.sh "$PWD" -h

# Web preview - opens in browser (cross-platform)
bunx critique --web --open

# AI-explained review
bunx critique review --agent claude --web --open

# Compare branches (PR-style)
bunx critique main HEAD --web --open
```

Prefer the split pane script for the best TUI experience on macOS, or `--web --open` for cross-platform.

### Our Projects (Referenced in Prompts)
- **BigBlocks**: Bitcoin component library
- **Sigma Identity**: OAuth 2.0 authentication system (auth.sigmaidentity.com)
- **agent-master**: MCP server coordination (WIP)
- **bsv-mcp**: Blockchain functionality exposure (WIP)  
- **gib**: Git + blockchain version control (WIP)

## Command Management

Commands in this repository are organized under the OPL namespace and are automatically distributed via the plugin system. Users install commands by installing the plugin:
```bash
/plugin install bopen-tools@b-open-io
```

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

# Search for specific content
grep -r "shadcn" design/
```

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
- **Commands** go in root `commands/` with OPL namespace subdirectories
- **Agents** go in root `agents/` directory
- **Skills** go in root `skills/` directory
- **Hooks** go in root `hooks/` directory

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

### Use the prompt-engineer agent for:
- Creating new slash commands in root `commands/` directory
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

## Skill Development Resources

For creating and maintaining skills, reference the official **skill-development** skill from Anthropic:

**Location:** https://github.com/anthropics/claude-code/tree/main/plugins/skill-development

**Key principles from the skill:**
- **Progressive Disclosure**: Keep SKILL.md lean (1,500-2,000 words), put detailed content in references/
- **Strong Triggering**: Description should include specific phrases that trigger the skill
- **Third-Person Descriptions**: Use "This skill should be used when..." not "Use when..."
- **Bundled Resources**: Include references/, examples/, scripts/ directories as needed
- **YAML Frontmatter**: Always include name, description, and version

**Additional Resources:**
- `references/MODULAR_PROMPTS_GUIDE.md` - Comprehensive guide for modular prompt system
- `templates/agent-update-template.md` - Template for updating agent configurations

## Workflow Orchestration Patterns

Apply these systematic workflow patterns for effective task management:

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Task Management Checklist
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.