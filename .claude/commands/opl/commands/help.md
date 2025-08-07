---
allowed-tools: Read, Grep
description: Comprehensive help and status for commands system
argument-hint: [--status] [--guide] [--compare]
---

# Commands System Help & Status

## Your Task

Provide comprehensive help based on `$ARGUMENTS`:

### Default (no arguments)
Show:
1. **System Overview**: Explain the commands repository structure from CLAUDE.md
2. **Available Commands**: Use Grep to find all .md files in .claude/commands/ and user/.claude/commands/
3. **Quick Start**: Basic usage of /opl:commands:init and /opl:commands:sync
4. **Status Summary**: Guide user to manually check their ~/.claude/commands directory

### --status
Provide detailed status by:
1. Use Grep and Read tools to check command files
2. List available commands in this repository
3. Guide user to check their ~/.claude/commands directory manually
4. Suggest running /opl:commands:init or /opl:commands:sync as needed

### --guide
Show comprehensive guide for creating commands:

```markdown
# Creating Claude Code Slash Commands

## File Structure
- Project commands: .claude/commands/<name>.md
- User commands: ~/.claude/commands/<name>.md (or in repo: user/.claude/commands/)

## Command Anatomy

### 1. Frontmatter (Required)
```yaml
---
allowed-tools: [List specific tools and commands]
description: Brief one-line description shown in /help
argument-hint: [optional] [arguments] shown in autocomplete
---
```

### 2. Help Handling
Add this simple check in "Your Task" section:
"If the arguments contain '--help', show the help documentation and stop."

### 3. Context Gathering (Optional)
Use !`command` to execute bash and include output:
- Keep commands simple and output minimal
- Use pipes and filters to reduce output
- Avoid complex syntax that needs special permissions

### 4. File References (Optional)
Use @filepath or @url to include file contents:
- Local: @/path/to/file.md
- GitHub: @https://raw.githubusercontent.com/...

### 5. Task Instructions
Clear instructions for what the command should do.
Use $ARGUMENTS to access user input.

## Best Practices

### Permissions
- Only request tools you actually use
- Be specific with bash commands: Bash(ls:*) not Bash
- Avoid complex bash syntax (pipes may need extra permissions)

### Context Window
- Minimize bash output with head, tail, grep, wc
- Use specific filters instead of dumping all content
- Consider token usage when including files

### Help Documentation
- Always support --help argument
- Include usage examples
- Document all options clearly
- Show example output when helpful

### Naming
- Use kebab-case: my-command.md
- Descriptive but concise names
- Avoid conflicts with built-in commands

## Command Types

### Utility Commands
- Perform specific tasks
- Modify files or run processes
- Example: restart-claude, init-prompts

### Information Commands  
- Gather and display information
- Read-only operations
- Example: /opl:commands:help, bsv

### Integration Commands
- Install or configure external tools
- Setup development environments
- Example: mcp-install-magic

## Testing Your Command
1. Create command file in appropriate location
2. Run with various arguments
3. Test --help functionality
4. Verify permissions are sufficient
5. Check output is helpful and concise
```

### --compare
Simple comparison between local and repo commands:
1. Use Grep to list commands available in the repository
2. Guide user to compare with their ~/.claude/commands directory manually
3. Recommend sync actions based on general findings

## Summary and Recommendations

Based on the analysis, provide:
1. **Next Steps**: What commands to run (/opl:commands:init, /opl:commands:sync, etc.)
2. **Contribution Opportunities**: Local commands worth sharing
3. **Update Priorities**: Which commands need updating
4. **System Health**: Overall status of prompts ecosystem

## Related Commands

- `/opl:commands:init` - Copy new commands from repo to local
- `/opl:commands:sync` - Synchronize existing commands
- `/opl:commands:create` - Create a new slash command
- `/opl:commands:update` - Update an existing command

Remember: This help system can be included by other commands using:
@.claude/commands/opl/commands/help.md