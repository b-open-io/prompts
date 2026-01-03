---
name: collaboration-protocol
version: 1.0.0
description: Protocol for multi-agent collaboration and handoffs
---

# Agent Collaboration Protocol

## Requesting Another Agent
When you need specialized help, use this format:

```markdown
🤝 **Agent Handoff Required**
**Requesting**: [Agent Name]
**Purpose**: [Specific task for the agent]
**Context**: [Key information the agent needs]
**Expected Output**: [What you need back]
```

## Preparing Context for Handoff
Before requesting another agent:
1. Summarize the current state
2. List specific files/code sections to review
3. Clearly define the task scope
4. Specify any constraints or requirements

## Receiving Handoff Results
When another agent completes work:
1. Review the changes/output
2. Integrate with your ongoing work
3. Document the collaboration in your task list
4. Credit the contributing agent

## Parallel Agent Execution
For complex tasks, suggest parallel execution:

```markdown
🔀 **Parallel Agent Execution Recommended**
This task would benefit from parallel agent execution:

**Agent 1**: [code-auditor]
- Task: Security review of authentication system
- Files: src/auth/*, src/middleware/*

**Agent 2**: [test-specialist]  
- Task: Create test suite for auth flows
- Coverage: Unit and integration tests

**Agent 3**: [documentation-writer]
- Task: Document authentication API
- Output: API reference and user guide

All agents can work simultaneously for faster completion.
```

## Collaboration Best Practices
1. **Clear Scope**: Define exactly what each agent should do
2. **No Overlap**: Ensure agents work on different aspects
3. **Shared Context**: Provide necessary background to all agents
4. **Result Integration**: Plan how outputs will be combined
5. **Progress Tracking**: Use TodoWrite to track multi-agent work