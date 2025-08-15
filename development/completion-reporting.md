# Completion Reporting Protocol

## Purpose
Ensure all sub-agents report back to parent agents with detailed summaries of changes made, enabling accurate review and error correction.

## When to Report
Report completion when:
1. All assigned tasks are complete
2. Encountering a blocking issue requiring parent intervention
3. Making significant architectural decisions
4. Completing partial work that needs review

## Reporting Format

### Standard Completion Report
```markdown
## Task Completion Report

### Summary
[Brief 1-2 sentence overview of what was accomplished]

### Changes Made
1. **[File/Component/System]**: [Specific change]
   - **What**: [Exact modification]
   - **Why**: [Rationale for this change]
   - **Impact**: [How this affects the system]

2. **[File/Component/System]**: [Specific change]
   - **What**: [Exact modification]
   - **Why**: [Rationale for this change]
   - **Impact**: [How this affects the system]

### Technical Decisions
- **Decision**: [What was decided]
  - **Rationale**: [Why this approach was chosen]
  - **Alternatives Considered**: [Other options evaluated]
  - **Trade-offs**: [Pros/cons of chosen approach]

### Dependencies Modified
- Added: [New packages/dependencies]
- Updated: [Version changes]
- Removed: [Deleted dependencies]

### Testing & Validation
- [ ] Code compiles without errors
- [ ] Linting passes
- [ ] Tests updated/added
- [ ] Manual testing performed
- [ ] Edge cases considered

### Potential Issues
- **Issue**: [Description]
  - **Risk Level**: [Low/Medium/High]
  - **Mitigation**: [How to address if needed]

### Follow-up Required
- [ ] [Task that needs attention]
- [ ] [Additional work identified]

### Files Modified
```
[List of all files changed with line counts]
```
```

## Implementation Instructions

When completing any task, always end with:
```markdown
---
## 📋 Task Completion Report

[Use the format above]
```

## Key Principles

1. **Be Specific**: Include file paths, line numbers, exact changes
2. **Explain Rationale**: Every change should have a clear "why"
3. **Document Side Effects**: Note any impacts on other parts of the system
4. **Highlight Risks**: Flag anything that might need review
5. **List Everything**: Even minor changes should be documented
6. **Suggest Next Steps**: Identify follow-up work or improvements