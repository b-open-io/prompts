# Shared Prompt System

The shared prompt system provides reusable, modular components that agents can reference to maintain consistency and reduce duplication across the OPL agent ecosystem.

## Purpose & Benefits

### Why Modular Prompts?

- **Consistency**: All agents follow the same protocols for announcements, task management, and self-improvement
- **Maintainability**: Update shared behaviors in one place rather than across 15+ agents
- **Quality**: Proven patterns are reused rather than reinvented
- **Onboarding**: New agents automatically inherit best practices
- **Evolution**: The system improves as protocols are refined

### System Architecture

```
development/shared/
├── agent-protocol.md      # Self-announcement standards
├── task-management.md     # TodoWrite usage patterns  
├── self-improvement.md    # Enhancement contribution protocol
└── README.md             # This overview (you are here)
```

## How Agents Use Shared Modules

### Loading Mechanism

Agents reference shared modules using the `@` syntax in their initialization sections:

```markdown
## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines
```

### Runtime Behavior

1. **Agent Startup**: Agent reads shared modules to understand protocols
2. **Self-Announcement**: Uses standard format from `agent-protocol.md`
3. **Task Management**: Follows TodoWrite patterns from `task-management.md`
4. **Self-Improvement**: Reports enhancements using `self-improvement.md` patterns

### Integration Pattern

Agents integrate shared modules by:

1. **Reading the module** during initialization
2. **Following the protocols** defined in each module
3. **Referencing the patterns** throughout their work
4. **Contributing improvements** back to the modules

## Creating New Shared Modules

### When to Create a Module

Create a shared module when:
- **Multiple agents** need the same capability
- **Patterns emerge** that should be standardized
- **Complex protocols** need centralized documentation
- **Best practices** should be shared across the system

### Module Structure

Each shared module should follow this pattern:

```markdown
---
name: module-name
version: 1.0.0
description: Brief description of what this module provides
---

# Module Title

## Purpose Statement
Clear explanation of what this module accomplishes.

## Core Patterns
The main patterns, formats, or protocols defined.

## Examples
Real-world examples showing proper usage.

## Implementation Notes
Technical details for proper implementation.
```

### Naming Conventions

- **File names**: kebab-case with `.md` extension
- **Module names**: Match the filename (used in YAML frontmatter)
- **Versions**: Semantic versioning (major.minor.patch)

### Example Module Creation

```bash
# 1. Create the module file
touch development/shared/error-handling.md

# 2. Add YAML frontmatter and content
# 3. Reference from relevant agents
# 4. Test with actual agent usage
```

## Best Practices for Modular Design

### Design Principles

1. **Single Responsibility**: Each module should have one clear purpose
2. **Atomic Operations**: Modules should be self-contained
3. **Clear Interfaces**: Well-defined patterns for agent integration
4. **Version Stability**: Backward compatibility when possible
5. **Documentation**: Comprehensive examples and usage patterns

### Module Content Guidelines

#### Do Include
- ✅ Standard formats and patterns
- ✅ Complete examples with context
- ✅ Implementation guidelines
- ✅ Best practices and anti-patterns
- ✅ Version information and changelog

#### Don't Include
- ❌ Agent-specific instructions
- ❌ Project-specific configurations
- ❌ Duplicate information from other modules
- ❌ Implementation details that change frequently
- ❌ Tool-specific commands (unless part of the pattern)

### Integration Guidelines

#### For Agent Developers

When adding shared modules to an agent:

1. **Reference in initialization**: Add Read commands for relevant modules
2. **Follow the patterns**: Implement the protocols as defined
3. **Stay current**: Use the latest version of each module
4. **Contribute back**: Suggest improvements when you find gaps

#### Example Integration

```markdown
## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/error-handling.md` for standardized error responses
4. **Read** `development/shared/self-improvement.md` for contribution guidelines

Apply these protocols throughout your work.
```

## Available Shared Modules

### Current Modules

#### agent-protocol.md
- **Purpose**: Standardized self-announcement format
- **Usage**: All agents use this for consistent identification
- **Pattern**: Emoji-based announcement with specialization and mission

#### task-management.md
- **Purpose**: TodoWrite tool usage patterns
- **Usage**: Agents managing complex tasks with visible progress
- **Pattern**: Structured task creation, status updates, and research documentation

#### self-improvement.md
- **Purpose**: Enhancement contribution protocol
- **Usage**: Agents identifying and suggesting improvements
- **Pattern**: Structured improvement identification and contribution workflow

### Planned Modules

Future modules under consideration:

- **error-handling.md**: Standardized error responses and recovery patterns
- **code-analysis.md**: Common patterns for code review and analysis
- **api-integration.md**: Patterns for external API interactions
- **testing-protocols.md**: Standard approaches to validation and testing
- **security-patterns.md**: Security-first development approaches

## Module Lifecycle

### Development Process

1. **Identify Pattern**: Common behavior across multiple agents
2. **Draft Module**: Create initial version with examples
3. **Agent Integration**: Test with 2-3 agents
4. **Refinement**: Improve based on real usage
5. **Documentation**: Complete examples and guidelines
6. **Release**: Version 1.0.0 when stable
7. **Evolution**: Continuous improvement based on agent feedback

### Version Management

- **Major versions**: Breaking changes to patterns
- **Minor versions**: New capabilities or significant enhancements
- **Patch versions**: Bug fixes and clarifications
- **Documentation**: Keep changelog in each module

### Deprecation Policy

When modules need significant changes:
1. **Deprecation notice** in current version
2. **Migration guide** to new patterns
3. **Parallel support** during transition period
4. **Removal** after all agents have migrated

## Contributing to Shared Modules

### How to Contribute

1. **Identify improvements** during agent development
2. **Follow self-improvement protocol** for suggestions
3. **Submit enhancements** via pull requests
4. **Test changes** with multiple agents
5. **Update documentation** to reflect changes

### Contribution Guidelines

- Test with at least 2 different agents
- Maintain backward compatibility when possible
- Include clear examples and usage patterns
- Update version numbers appropriately
- Document any breaking changes

This shared module system ensures the OPL agent ecosystem remains consistent, maintainable, and continuously improving while avoiding duplication and promoting best practices across all agents.