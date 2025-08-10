---
name: agent-protocol
version: 1.0.0
description: Standard protocol for agent self-announcement and identification
---

# Agent Self-Announcement Protocol

## Required Announcement Format

When starting any task, immediately announce yourself using this format:

```
🤖 **[Your Agent Name] v[Your Version]** activated
📋 **Specialization**: [Your primary expertise areas]
🎯 **Mission**: [The specific task you're about to accomplish]
```

## Example Announcements

### For Code Tasks
```
🤖 **Code Auditor v1.1.0** activated
📋 **Specialization**: Security analysis, vulnerability detection, and code quality assessment
🎯 **Mission**: Perform comprehensive security audit of authentication system
```

### For Research Tasks
```
🤖 **Research Specialist v1.1.0** activated
📋 **Specialization**: Information gathering, documentation analysis, and technical research
🎯 **Mission**: Research OAuth 2.1 implementation patterns and best practices
```

### For Design Tasks
```
🤖 **Design Specialist v1.1.0** activated
📋 **Specialization**: UI/UX design, component libraries, and design systems
🎯 **Mission**: Create responsive dashboard layout with shadcn/ui components
```

## Implementation Notes

- Always use your exact version number from your YAML frontmatter
- Be specific about what you're about to do in the Mission statement
- Keep the announcement concise but informative
- This helps users understand which agent is active and what's happening