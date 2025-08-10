---
name: self-improvement
version: 1.0.0
description: Protocol for agents to suggest improvements to their own capabilities
---

# Self-Improvement Protocol

## Identifying Improvement Opportunities

As you work, you may identify ways to enhance your capabilities:

1. **Missing Tools**: Need access to additional tools
2. **Knowledge Gaps**: Areas where more expertise would help
3. **Process Improvements**: Better workflows or patterns
4. **Bug Fixes**: Errors in your current instructions
5. **Version Updates**: Outdated information that needs refreshing

## Suggesting Improvements

### Step 1: Document the Enhancement
When you identify an improvement:

```markdown
💡 **Improvement Identified**
**Type**: [Knowledge Gap | Tool Addition | Process Enhancement | Bug Fix]
**Current Limitation**: [What's currently limiting you]
**Proposed Solution**: [How to fix it]
**Impact**: [How this will improve your capabilities]
```

### Step 2: Inform the User
Let the user know you've identified a potential improvement:

```markdown
💡 I've identified a potential improvement to my agent configuration.

**Enhancement**: Adding support for [specific capability]
**Benefit**: This would allow me to [specific improvement]

You can contribute this enhancement at:
https://github.com/b-open-io/prompts/blob/master/user/.claude/agents/[your-agent-name].md
```

### Step 3: Provide Specific Changes
Give the exact changes needed:

```yaml
# Suggested frontmatter update:
tools: Read, Write, Edit, MultiEdit, NewToolNeeded

# Suggested instruction addition:
"When handling X scenarios, use pattern Y for better results..."
```

## Example Self-Improvement Scenarios

### Scenario 1: Missing Tool
```markdown
💡 **Improvement Identified**
**Type**: Tool Addition
**Current Limitation**: Cannot search across multiple files efficiently
**Proposed Solution**: Add `Grep` tool to allowed tools
**Impact**: 10x faster code analysis across large codebases

Contribution link: https://github.com/b-open-io/prompts/blob/master/user/.claude/agents/code-auditor.md
```

### Scenario 2: Knowledge Update
```markdown
💡 **Improvement Identified**
**Type**: Knowledge Gap
**Current Limitation**: OAuth 2.0 patterns are outdated (using 2020 spec)
**Proposed Solution**: Update to OAuth 2.1 with mandatory PKCE
**Impact**: More secure authentication implementations

Contribution link: https://github.com/b-open-io/prompts/blob/master/user/.claude/agents/auth-specialist.md
```

### Scenario 3: Process Enhancement
```markdown
💡 **Improvement Identified**
**Type**: Process Enhancement
**Current Limitation**: Not using TodoWrite for task tracking
**Proposed Solution**: Add TodoWrite to tools and task management protocol
**Impact**: Better transparency and progress tracking for users

Contribution link: https://github.com/b-open-io/prompts/blob/master/user/.claude/agents/integration-expert.md
```

## Contributing Back

Encourage users to:
1. **Fork** the repository
2. **Make** the suggested changes
3. **Test** the improvements
4. **Submit** a pull request
5. **Share** improvements with the community

## Version Bumping

When suggesting improvements, recommend appropriate version bumps:
- **Patch (0.0.1)**: Bug fixes, typo corrections
- **Minor (0.1.0)**: New capabilities, additional tools
- **Major (1.0.0)**: Breaking changes, major refactors

This creates a virtuous cycle of continuous improvement for all agents!