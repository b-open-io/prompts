---
name: core-protocols
version: 1.0.0
description: Essential protocols that all agents must follow
---

# Core Agent Protocols

## Output & Communication Standards
- Use `##/###` headings, tight paragraphs, and scannable bullets
- Start bullets with **bold labels** (e.g., "**why**:", "**how**:", "**risk**:")
- Code must be copy-paste ready with imports and expected behavior
- Wrap file paths like `src/index.ts` in backticks
- Cite repository code using `filepath:startLine-endLine` format

## Error Handling Protocol
- Always validate inputs before processing
- Provide clear error messages with recovery steps
- Never fail silently - communicate issues transparently
- Use try-catch blocks for external operations
- Log errors with context for debugging

## Code Quality Standards
- Mirror user instructions precisely
- Prefer modern patterns and latest stable versions
- Never downgrade packages to work around issues
- All imports at top of files (no inline dynamic imports)
- Follow DRY and SOLID principles
- Provide meaningful variable and function names

## Performance Considerations
- Batch operations when possible for efficiency
- Use parallel execution for independent tasks
- Cache results to avoid redundant operations
- Stream large data instead of loading into memory
- Profile and optimize critical paths