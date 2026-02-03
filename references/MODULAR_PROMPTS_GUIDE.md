# Modular Prompts System Guide

This guide provides comprehensive instructions for understanding, using, and contributing to the OPL modular prompt system. This system enables shared, reusable components across all agents to ensure consistency, reduce duplication, and accelerate development.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding Modules to Agents](#adding-modules-to-agents)
3. [Creating New Modules](#creating-new-modules)
4. [Migration Guide](#migration-guide)
5. [Examples & Best Practices](#examples--best-practices)
6. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Design

The modular prompt system separates **shared behaviors** from **agent-specific logic**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Architecture                        │
├─────────────────────────────────────────────────────────────┤
│  Agent-Specific Logic                                       │
│  ├── Core expertise and specialization                      │
│  ├── Specific tools and capabilities                        │
│  └── Custom workflows and patterns                          │
├─────────────────────────────────────────────────────────────┤
│  Shared Modules (via Reference)                             │
│  ├── agent-protocol.md    (Self-announcement)               │
│  ├── task-management.md   (TodoWrite patterns)              │
│  ├── self-improvement.md  (Enhancement protocol)            │
│  └── [future modules]     (Error handling, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Reference, Don't Embed**: Agents reference shared modules, not copy their content
2. **Runtime Loading**: Modules are read at task startup, not compile time
3. **Version Consistency**: All agents use the same version of each module
4. **Protocol Compliance**: Agents follow the patterns defined in modules
5. **Continuous Improvement**: Modules evolve based on agent feedback

### Module Types

#### Core Protocols
Essential patterns that all agents should follow:
- **agent-protocol.md**: How agents announce themselves
- **task-management.md**: How to track work with TodoWrite
- **self-improvement.md**: How to suggest enhancements

#### Specialized Protocols (Future)
Domain-specific patterns for relevant agents:
- **error-handling.md**: Standardized error responses
- **code-analysis.md**: Common code review patterns
- **api-integration.md**: External service interaction patterns
- **security-patterns.md**: Security-first development approaches

### File Organization

```
development/shared/
├── README.md                  # System overview (this file)
├── agent-protocol.md          # Self-announcement standards
├── task-management.md         # TodoWrite usage patterns
├── self-improvement.md        # Enhancement contribution protocol
└── [future-modules].md        # Additional shared capabilities
```

## Adding Modules to Agents

### Step-by-Step Instructions

#### Step 1: Identify Required Modules

Determine which shared modules your agent needs:

**All agents should include:**
- `agent-protocol.md` - For consistent self-announcement
- `task-management.md` - For transparent task tracking (if using TodoWrite)
- `self-improvement.md` - For contributing improvements

**Specialized agents might include:**
- `error-handling.md` - For standardized error responses
- `security-patterns.md` - For security-focused agents
- `code-analysis.md` - For code review agents

#### Step 2: Add Initialization Section

Add an "Initialization Protocol" section to your agent after the YAML frontmatter:

```markdown
---
name: your-agent-name
version: 1.0.0
description: Your agent description
tools: Read, Write, Edit, MultiEdit, TodoWrite
model: opus
---

## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines

Apply these protocols throughout your work.
```

#### Step 3: Reference Modules in Agent Logic

Add references to the modules in your agent's instructions:

```markdown
## Core Responsibilities

Your primary focus is [your specialization], following these protocols:

- **Self-Announcement**: Use the standard format from `agent-protocol.md`
- **Task Tracking**: Follow TodoWrite patterns from `task-management.md`
- **Improvement Suggestions**: Use protocol from `self-improvement.md`
- **[Specialized behavior]**: Your unique capabilities
```

#### Step 4: Test Integration

Test your agent to ensure it:
1. ✅ Reads the shared modules on startup
2. ✅ Follows the self-announcement format
3. ✅ Uses TodoWrite according to task-management patterns
4. ✅ Suggests improvements using the self-improvement protocol

### Integration Examples

#### Example 1: Basic Agent Integration

```markdown
---
name: content-specialist
version: 1.0.0
description: Expert in content creation, copywriting, and documentation
tools: Read, Write, Edit, MultiEdit, TodoWrite
model: opus
---

## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines

## Core Capabilities

You are a content creation specialist following OPL protocols:

### Self-Announcement
Use the standard format: 🤖 **Content Specialist v1.0.0** activated, etc.

### Content Creation Workflow
1. **Task Planning**: Create TodoWrite task list for content projects
2. **Research Phase**: Document findings in task descriptions
3. **Draft Creation**: Write initial content following brand guidelines
4. **Review & Refinement**: Iterate based on feedback
5. **Final Delivery**: Provide polished content with documentation

### Improvement Protocol
When you identify ways to enhance content creation capabilities, follow the self-improvement protocol to suggest additions to this agent.
```

#### Example 2: Security-Focused Agent Integration

```markdown
---
name: security-auditor
version: 1.0.0
description: Security audit and vulnerability assessment specialist
tools: Read, Write, Edit, MultiEdit, Grep, TodoWrite
model: opus
---

## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns
3. **Read** `development/shared/security-patterns.md` for security protocols
4. **Read** `development/shared/self-improvement.md` for contribution guidelines

## Security Audit Methodology

Following OPL protocols with security-specific enhancements:

### Announcement Example
🤖 **Security Auditor v1.0.0** activated
📋 **Specialization**: Vulnerability assessment, code security, and compliance review
🎯 **Mission**: Comprehensive security audit of authentication system

### Task Management for Security
Use TodoWrite with security-specific task breakdown:
- [ ] Threat modeling and attack surface analysis
- [ ] Static code analysis for vulnerabilities
- [ ] Authentication and authorization review
- [ ] Data protection and encryption assessment
- [ ] Compliance requirement verification
```

### Common Integration Patterns

#### Pattern 1: All-Protocol Integration
For agents that need all shared modules:

```markdown
## Initialization Protocol
Load all shared protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/error-handling.md` for standardized error responses
4. **Read** `development/shared/self-improvement.md` for contribution guidelines
```

#### Pattern 2: Selective Integration
For agents that only need specific modules:

```markdown
## Initialization Protocol
Load relevant shared protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/self-improvement.md` for contribution guidelines

Note: This agent handles tasks synchronously without TodoWrite complexity.
```

#### Pattern 3: Specialized Enhancement
For agents that extend shared modules with domain-specific additions:

```markdown
## Initialization Protocol
Load shared protocols with domain-specific enhancements:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns
3. **Read** `development/shared/security-patterns.md` for security protocols
4. **Read** `development/shared/self-improvement.md` for contribution guidelines

## Enhanced Security Protocols
Building on shared patterns with additional security measures:
- All tasks include threat assessment
- All code changes require security impact analysis
- All improvements consider security implications
```

## Creating New Modules

### When to Create a Module

Create a shared module when you identify:

1. **Repeated Patterns**: Same instructions across 3+ agents
2. **Best Practices**: Proven approaches that should be standardized
3. **Complex Protocols**: Multi-step processes that need documentation
4. **Cross-Agent Coordination**: Behaviors that enable agents to work together

### Module Creation Process

#### Step 1: Design the Module

Define the module's purpose and scope:

```markdown
# Planning Document
## Module: error-handling
## Purpose: Standardize how agents communicate errors and recovery steps
## Scope: Error detection, user communication, recovery attempts
## Agents: All agents that can encounter failures
```

#### Step 2: Create Module File

Create the module in `development/shared/`:

```markdown
---
name: error-handling
version: 1.0.0
description: Standardized error responses and recovery protocols
---

# Error Handling Protocol

## Purpose
This module defines how agents should detect, communicate, and recover from errors to provide consistent user experiences across the OPL ecosystem.

## Error Classification

### Severity Levels
- **Critical**: System cannot continue (missing tools, invalid permissions)
- **Major**: Task cannot complete (file not found, API failure)
- **Minor**: Degraded functionality (formatting issues, optional features)
- **Warning**: Potential issues (deprecated patterns, performance concerns)

## Communication Format

### Standard Error Response
```markdown
🚨 **Error Detected**
**Severity**: [Critical | Major | Minor | Warning]
**Issue**: [Brief description of what went wrong]
**Impact**: [How this affects the current task]
**Recovery**: [What steps are being attempted]
```

### Example Error Messages
```markdown
🚨 **Error Detected**
**Severity**: Major
**Issue**: Cannot access required file `/path/to/config.json`
**Impact**: Cannot complete configuration validation task
**Recovery**: Checking alternative locations and requesting user guidance
```

## Recovery Protocols

### Automatic Recovery
Attempt automatic recovery for recoverable errors:
1. **Retry Operations**: Network timeouts, temporary file locks
2. **Fallback Methods**: Alternative APIs, backup file locations
3. **Graceful Degradation**: Simplified output when full functionality fails

### User Guidance
When automatic recovery fails:
1. **Explain the Problem**: Clear description of what went wrong
2. **Provide Options**: Multiple paths forward when possible
3. **Request Specific Help**: Exact information or actions needed
4. **Continue Safely**: Proceed with what can be completed

## Implementation Example

```javascript
// Error detection pattern
if (error.type === 'FileNotFound') {
  reportError({
    severity: 'Major',
    issue: `Cannot access file: ${filepath}`,
    impact: 'Cannot complete file analysis task',
    recovery: 'Checking alternative file locations'
  });
  
  // Attempt recovery
  const alternativeFile = findAlternativeFile(filepath);
  if (alternativeFile) {
    continueWithFile(alternativeFile);
  } else {
    requestUserGuidance(`Please provide correct file path for: ${filepath}`);
  }
}
```
```

#### Step 3: Test with Multiple Agents

Test the module with at least 2-3 different agents:

1. **Integration Testing**: Verify agents can load and follow the protocol
2. **Consistency Testing**: Ensure same patterns produce same results
3. **Usability Testing**: Confirm the protocol improves user experience

#### Step 4: Document and Release

Complete the documentation:

```markdown
## Implementation Notes
- Add error-handling.md to agent initialization protocols
- Use the standard error format for all error communications
- Attempt automatic recovery before requesting user help
- Log all errors for debugging and improvement

## Version History
### 1.0.0
- Initial release with error classification and communication format
- Recovery protocols for common error scenarios
- Implementation examples and usage patterns
```

### Module Template

Use this template for new modules:

```markdown
---
name: module-name
version: 1.0.0
description: Brief description of module purpose
---

# Module Name

## Purpose
Clear statement of what this module accomplishes and why it exists.

## Core Patterns
The main patterns, formats, or protocols this module defines.

### Pattern 1: [Name]
Description and format for the first pattern.

### Pattern 2: [Name]  
Description and format for the second pattern.

## Implementation Guide

### Integration Steps
1. Add module to agent initialization protocol
2. Follow the patterns defined above
3. Reference examples below

### Usage Examples
Real-world examples showing proper implementation.

## Best Practices
Guidelines for optimal use of this module.

## Common Mistakes
Anti-patterns and how to avoid them.

## Version History
Changelog with version information.
```

## Migration Guide

### Migrating Existing Agents

If you have agents created before the modular system:

#### Step 1: Audit Current Agent

Review your agent for patterns that could use shared modules:

```bash
# Check for repeated patterns
grep -r "🤖.*activated" user/.claude/agents/
grep -r "TodoWrite" user/.claude/agents/
grep -r "improvement" user/.claude/agents/
```

#### Step 2: Identify Applicable Modules

Map existing patterns to available modules:

- **Self-announcement** → `agent-protocol.md`
- **Task tracking** → `task-management.md`
- **Improvement suggestions** → `self-improvement.md`
- **Error handling** → `error-handling.md` (when available)

#### Step 3: Add Initialization Section

Add the initialization protocol to load relevant modules:

```markdown
## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines

Apply these protocols throughout your work.
```

#### Step 4: Remove Duplicated Content

Remove hardcoded patterns that are now in shared modules:

```diff
- ## Self-Announcement
- When starting tasks, announce yourself using this format:
- ```
- 🤖 **Agent Name vX.X.X** activated
- 📋 **Specialization**: Your expertise areas
- 🎯 **Mission**: Current task description
- ```

+ Use self-announcement format from agent-protocol.md
```

#### Step 5: Update References

Update any hardcoded instructions to reference the shared modules:

```diff
- Always create TodoWrite tasks with pending/in_progress/completed status
+ Follow TodoWrite patterns from task-management.md
```

#### Step 6: Test Migration

Verify the migrated agent works correctly:

1. ✅ Loads shared modules successfully
2. ✅ Follows all referenced protocols
3. ✅ Maintains existing functionality
4. ✅ Produces consistent output

### Migration Checklist

**Pre-Migration:**
- [ ] Back up current agent file
- [ ] Document current custom behaviors
- [ ] Identify applicable shared modules

**During Migration:**
- [ ] Add initialization protocol section
- [ ] Reference shared modules appropriately
- [ ] Remove duplicated content
- [ ] Update any hardcoded patterns

**Post-Migration:**
- [ ] Test agent functionality
- [ ] Verify protocol compliance
- [ ] Update agent version number
- [ ] Document any custom behaviors retained

### Common Migration Scenarios

#### Scenario 1: Agent with Custom Announcement

**Before:**
```markdown
## Announcement Protocol
When starting work, announce:
"🔧 MyAgent v1.0.0 starting task: [task description]"
```

**After:**
```markdown
## Initialization Protocol
1. **Read** `development/shared/agent-protocol.md` for self-announcement format

Use the standard announcement format with your specialization details.
```

#### Scenario 2: Agent with Custom Task Management

**Before:**
```markdown
## Task Management
Create task lists with:
1. Initial planning
2. Research phase  
3. Implementation
4. Testing
5. Documentation
```

**After:**
```markdown
## Initialization Protocol  
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns

Follow the standard TodoWrite patterns, adapted for your domain-specific workflows.
```

#### Scenario 3: Agent with Mixed Content

**Before:**
```markdown
## Working Protocol
1. Announce yourself: "🤖 Agent activated"
2. Plan tasks in TodoWrite
3. Report improvements back to maintainers
```

**After:**
```markdown
## Initialization Protocol
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines

Apply these protocols throughout your work.
```

## Examples & Best Practices

### Example 1: Research Specialist

Complete example of an agent using the modular system:

```markdown
---
name: research-specialist
version: 1.1.0
description: Expert in information gathering, analysis, and documentation
tools: Read, Write, Edit, WebFetch, Grep, TodoWrite
color: pink
model: opus
---

## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns  
3. **Read** `development/shared/self-improvement.md` for contribution guidelines

Apply these protocols throughout your work. Your announcement should emphasize research and analysis capabilities.

## Research Methodology

You are a comprehensive research specialist following OPL protocols:

### Core Research Process
Following task-management protocols with research-specific adaptations:

1. **Scope Definition** (TodoWrite: "Define research scope and key questions")
2. **Source Identification** (TodoWrite: "Identify and validate information sources")  
3. **Information Gathering** (TodoWrite: "Collect data from identified sources")
4. **Analysis & Synthesis** (TodoWrite: "Analyze findings and identify patterns")
5. **Documentation** (TodoWrite: "Create comprehensive research report")

### Information Sources
Prioritize these source types:
- **Primary Sources**: Official documentation, specifications, whitepapers
- **Technical Sources**: GitHub repositories, API references, technical blogs
- **Community Sources**: Developer forums, Stack Overflow, Discord/Reddit
- **Academic Sources**: Research papers, case studies, benchmarks

### Research Documentation Pattern
Document findings in TodoWrite task descriptions:
```
Original: "Research Next.js authentication patterns"
↓
Updated: "Research Next.js authentication patterns - Found: NextAuth.js (dominant), Supabase Auth (emerging), Custom JWT (legacy). NextAuth v5 released Dec 2024 with React 19 support."
```

### Quality Assurance
- **Cross-Reference**: Verify information across multiple sources
- **Recency Check**: Prioritize information from last 12 months
- **Authority Check**: Prefer official sources and recognized experts
- **Relevance Filter**: Focus on information applicable to current context

### Research Output Format
Deliver research in this structure:

```markdown
# Research Report: [Topic]

## Executive Summary
Key findings and recommendations (2-3 sentences)

## Methodology  
Sources consulted and approach taken

## Key Findings
### Finding 1: [Title]
- **What**: Core information
- **Source**: Where this was found
- **Relevance**: Why this matters
- **Last Updated**: When source was last updated

### Finding 2: [Title]
[Same format as above]

## Recommendations
Actionable next steps based on research

## Additional Resources
Links to sources for further investigation
```

### Self-Improvement Focus
Research specialists commonly need enhancements in:
- **New Source Access**: Additional APIs or databases
- **Analysis Tools**: Pattern recognition and data synthesis capabilities  
- **Domain Expertise**: Deeper knowledge in specific technical areas
- **Automation**: Tools to streamline repetitive research tasks

Use the self-improvement protocol to suggest additions to research capabilities.
```

### Example 2: Integration Expert

Example of an agent that extends shared modules:

```markdown
---
name: integration-expert
version: 1.3.0
description: API integrations, webhooks, and system connectivity specialist
tools: Read, Write, Edit, MultiEdit, WebFetch, TodoWrite
color: green
model: opus
---

## Initialization Protocol

When starting any task, first load the shared operational protocols:
1. **Read** `development/shared/agent-protocol.md` for self-announcement format
2. **Read** `development/shared/task-management.md` for TodoWrite usage patterns
3. **Read** `development/shared/api-integration.md` for integration patterns  
4. **Read** `development/shared/self-improvement.md` for contribution guidelines

## Integration Methodology

You are an API integration specialist following OPL protocols with integration-specific enhancements:

### Enhanced Task Management for Integrations
Building on task-management.md patterns with integration-specific phases:

```javascript
TodoWrite({
  todos: [
    {id: "1", content: "API Discovery - Document endpoints, auth, rate limits", status: "pending"},
    {id: "2", content: "Security Assessment - Review auth methods and data handling", status: "pending"},
    {id: "3", content: "Integration Design - Plan data flow and error handling", status: "pending"},
    {id: "4", content: "Implementation - Build integration with proper retry logic", status: "pending"},
    {id: "5", content: "Testing - Validate happy path and error scenarios", status: "pending"},
    {id: "6", content: "Documentation - Create integration guide and troubleshooting", status: "pending"}
  ]
})
```

### Integration-Specific Protocols

#### API Analysis Pattern
For each new API integration, document:
- **Authentication**: Method, token management, refresh patterns
- **Rate Limits**: Requests per minute, burst allowances, backoff strategies  
- **Data Format**: Request/response schemas, validation requirements
- **Error Handling**: Status codes, error messages, retry policies
- **Monitoring**: Health checks, alerting, performance metrics

#### Security-First Integration
Always assess:
- **Data Sensitivity**: PII, financial, authentication tokens
- **Transport Security**: HTTPS enforcement, certificate validation
- **Storage Security**: Encryption at rest, secure key management
- **Access Control**: API key rotation, scope limitations
- **Audit Trail**: Request logging, error tracking, compliance

### Integration Quality Standards
Following OPL protocols with integration-specific quality gates:

- **Error Resilience**: Graceful degradation when APIs are unavailable
- **Performance**: Response time monitoring and optimization
- **Reliability**: Retry logic with exponential backoff
- **Observability**: Comprehensive logging and metrics
- **Documentation**: Integration guides and troubleshooting runbooks

### Common Integration Improvements
Integration experts frequently need:
- **New API Support**: Additional third-party service integrations
- **Protocol Support**: GraphQL, gRPC, WebSocket capabilities
- **Security Tools**: Enhanced authentication and encryption methods
- **Monitoring**: Better observability and alerting integrations

Use self-improvement protocol to suggest enhancements to integration capabilities.
```

### Best Practices Summary

#### For Module Usage
1. **Always Load on Startup**: Read modules before beginning work
2. **Follow Patterns Precisely**: Don't modify the defined formats
3. **Reference, Don't Copy**: Point to modules rather than duplicating
4. **Stay Current**: Use latest version of each module
5. **Contribute Improvements**: Suggest enhancements when you find gaps

#### For Module Creation
1. **Single Purpose**: Each module should address one clear need
2. **Complete Examples**: Show exactly how to implement patterns
3. **Version Carefully**: Use semantic versioning for changes
4. **Test Thoroughly**: Validate with multiple agents
5. **Document Completely**: Include implementation notes and best practices

#### For System Evolution
1. **Monitor Usage**: Track which modules are most valuable
2. **Gather Feedback**: Listen to agent developers and users
3. **Iterate Frequently**: Improve modules based on real usage
4. **Maintain Compatibility**: Avoid breaking changes when possible
5. **Communicate Changes**: Document updates and migration paths

## Troubleshooting

### Common Issues

#### Issue 1: Module Not Found
**Symptoms**: Agent can't read `development/shared/module-name.md`
**Cause**: File path incorrect or module doesn't exist
**Solution**: 
```bash
# Verify module exists
ls -la development/shared/
# Check exact filename and path
```

#### Issue 2: Inconsistent Behavior
**Symptoms**: Agent doesn't follow module patterns correctly
**Cause**: Agent may be using outdated patterns or misreading module
**Solution**:
1. Verify agent reads the correct module
2. Check module version in YAML frontmatter
3. Ensure agent implements patterns as documented

#### Issue 3: Version Conflicts  
**Symptoms**: Different agents behave differently despite using same module
**Cause**: Agents referencing different versions of modules
**Solution**:
1. Standardize all agents on latest module versions
2. Check git history for recent module changes
3. Update agent references to specify version if needed

#### Issue 4: Performance Impact
**Symptoms**: Agents slow to start due to module loading
**Cause**: Too many module reads or large module files
**Solution**:
1. Only load modules actually needed
2. Keep modules focused and concise
3. Consider module consolidation if many small modules exist

### Debugging Module Integration

#### Step 1: Verify Module Loading
Confirm the agent successfully reads the module:
```markdown
## Debug: Verify Module Access
Can you read and summarize: development/shared/agent-protocol.md
```

#### Step 2: Check Pattern Implementation
Verify the agent follows the module patterns:
```markdown  
## Debug: Test Self-Announcement
Please announce yourself for a task: "Create a README file"
Expected format: 🤖 **Agent Name vX.X.X** activated...
```

#### Step 3: Validate Protocol Compliance
Test specific behaviors defined in modules:
```markdown
## Debug: Test TodoWrite Usage
Create a task list for a complex project using TodoWrite patterns
Expected: Structured tasks with pending/in_progress/completed status
```

#### Step 4: Test Improvement Protocol
Verify self-improvement behavior:
```markdown
## Debug: Test Self-Improvement
If you identify a limitation in your capabilities, how would you report it?
Expected: Structured improvement suggestion with contribution link
```

### Module Development Issues

#### Issue 1: Module Not Being Used
**Symptoms**: Created module but agents don't reference it
**Cause**: Module not integrated into agent initialization protocols
**Solution**:
1. Update relevant agents to reference the module
2. Document which agents should use the module  
3. Provide clear integration instructions

#### Issue 2: Pattern Adoption Inconsistent
**Symptoms**: Some agents follow module patterns, others don't
**Cause**: Module patterns may be unclear or too complex
**Solution**:
1. Review module documentation for clarity
2. Add more detailed examples
3. Simplify complex patterns
4. Test with multiple agent types

#### Issue 3: Module Evolution Conflicts
**Symptoms**: Updating module breaks existing agents
**Cause**: Breaking changes without proper versioning
**Solution**:
1. Use semantic versioning properly
2. Maintain backward compatibility when possible
3. Provide migration guides for breaking changes
4. Test changes with all affected agents

### Getting Help

#### Resources
1. **Module Documentation**: `development/shared/README.md`
2. **Agent Examples**: `user/.claude/agents/` for integration patterns
3. **System Guide**: This document for comprehensive guidance

#### Community Support
1. **GitHub Issues**: Report bugs or request enhancements
2. **Pull Requests**: Contribute improvements and new modules  
3. **Documentation**: Update guides based on your experience

#### Best Practices for Help Requests
When asking for help:
1. **Include Context**: Agent name, module versions, exact error messages
2. **Provide Examples**: Show what you expected vs. what happened
3. **Share Code**: Include relevant sections of agent configuration
4. **Test Thoroughly**: Try debugging steps before requesting help

This troubleshooting guide should help you resolve most common issues with the modular prompt system. The system is designed to be robust and helpful, but like any system, it may need adjustments as it evolves.