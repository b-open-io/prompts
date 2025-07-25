---
version: 1.0.0
allowed-tools: Bash(curl:*), Bash(echo:*), Bash(grep:*), Bash(cut:*), Read, Grep
description: Check versions of all commands and compare with GitHub registry
argument-hint: [command-name] | --all | --update-available
---

## Version Management System

This command integrates with our registry.json to track command versions and check for updates.

## Your Task

If arguments contain "--help", show:
```
version-check - Check command versions against GitHub registry

Usage: /version-check [command-name] | --all | --update-available

Options:
  command-name      Check specific command version
  --all             Check all local commands
  --update-available  Show only commands with updates

Examples:
  /version-check auth           Check auth command version
  /version-check --all          Check all commands
  /version-check --update-available  Show what needs updating
```
Then stop.

Otherwise:

1. **For specific command check**:
   - Read local command version from frontmatter
   - Fetch GitHub version from raw content
   - Compare and show if update available

2. **For --all**:
   - Use Glob to find all local commands
   - Check each against GitHub
   - Show summary table

3. **For --update-available**:
   - Only show commands where GitHub version > local version

### Implementation Notes

- Parse semantic versions correctly (1.0.0 < 1.1.0 < 2.0.0)
- Handle network errors gracefully
- Cache results for 5 minutes to avoid rate limits
- Integrate with registry.json for metadata

### Version Format
All commands must have version in frontmatter:
```yaml
---
version: 1.0.0
---
```

### Registry Integration
Check against: https://raw.githubusercontent.com/b-open-io/prompts/master/registry.json
for additional metadata like complexity, time estimates, etc.