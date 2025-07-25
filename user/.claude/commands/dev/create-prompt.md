---
allowed-tools: Read, Write, Edit, Bash(mkdir:*), Bash(ls:*)
description: Create a new Claude Code slash command following best practices
argument-hint: <command-name> [--project | --user] [--namespace <path>]
---

## Your Task

If the arguments contain '--help', show this help:
**create-prompt** - Create a new Claude Code slash command following best practices

**Usage:** `/create-prompt <command-name> [--project | --user] [--namespace <path>]`

**Description:**
Creates a new slash command file with proper structure, frontmatter, and help section. Follows established standards and best practices.

**Arguments:**
- `<command-name>` : Name of the command (without leading slash)
- `--project`      : Create in project directory .claude/commands/ (default)
- `--user`         : Create in user directory ~/.claude/commands/
- `--namespace`    : Subdirectory path (e.g., "frontend" creates frontend/command.md)
- `--help`         : Show this help message

**Examples:**
- `/create-prompt deploy`                    : Create /deploy in project
- `/create-prompt lint --user`               : Create /lint in user directory
- `/create-prompt component --namespace ui`  : Create /ui:component


Then stop.

Otherwise, create a new Claude Code slash command.

## Your Task

Create a new Claude Code slash command with the following standards:

### 1. Parse Arguments
Extract from `$ARGUMENTS`:
- Command name (required)
- Scope: --project (default) or --user
- Namespace: --namespace <path> (optional)

### 2. Determine File Location
- **Project**: `.claude/commands/[namespace/]<command-name>.md`
- **User**: `~/.claude/commands/[namespace/]<command-name>.md`

### 3. Check for Conflicts

Check if the command name conflicts with:
- Built-in Claude Code commands (see blacklist below)
- Existing custom commands in the target directory

**Built-in commands blacklist:**
- add-dir, bug, clear, compact, config, cost, doctor, help, init
- login, logout, mcp, memory, model, permissions, pr_comments
- review, status, terminal-setup, vim

If the command name matches any built-in command, show an error:
```
❌ Error: '<command-name>' is a built-in Claude Code command and cannot be overridden.
Please choose a different name.
```

Also check if a file already exists at the target location. If it does, ask:
```
⚠️  A command named '<command-name>' already exists at <path>.
Do you want to overwrite it? (yes/no)
```

### 4. Create Command File

Generate a command file with this structure:

```markdown
---
allowed-tools: [Specify required tools]
description: [Brief one-line description]
argument-hint: [Optional arguments the command accepts]
---

## Your Task

If the arguments contain '--help', show this help:

```
command-name - [Brief description]

Usage: /command-name [arguments]

Description:
[Detailed description of what the command does]

Arguments:
  arg1    [Description]
  --help  Show this help message

Examples:
  /command-name         [Basic usage]
  /command-name arg1    [With argument]
```

Then stop.

Otherwise:
[Clear instructions for what the command should do]
[Use @ for file includes and $ARGUMENTS for user input]
```

### 4. Best Practices to Follow

#### Frontmatter Standards
- **allowed-tools**: Only include tools actually needed
  - Use specific bash commands: `Bash(ls:*), Bash(mkdir:*)`
  - Common tools: `Read, Write, Edit, Grep, Glob`
  - AVOID: Complex bash syntax, pipes, [[]] constructs
- **description**: Concise, action-oriented (shown in /help)
- **argument-hint**: Clear syntax hints for arguments

#### Help Section Standards
- Simple help check: "If the arguments contain '--help', show this help:"
- Use consistent formatting across all commands
- Include usage, description, arguments, and examples
- Always end help with "Then stop."

#### Context Window Optimization
- Bash command executions are POWERFUL - use them wisely!
- Format: !` followed by your command and closing backtick
- Must declare permissions in allowed-tools frontmatter
- **CRITICAL**: Use correct permission syntax: `Bash(command:*)` for commands with arguments, `Bash(command)` for exact commands only
- Examples of permission requirements:
  ```
  # Simple commands work with basic permissions:
  Bash(ls:*), Bash(echo:*), Bash(pwd)
  
  # Pipes and complex syntax need more:
  Bash(ls:*), Bash(head:*), Bash(wc:*), Bash(grep:*)
  
  # Always test your bash commands work properly!
  ```
- For full permission syntax reference: https://docs.anthropic.com/en/docs/claude-code/iam#tool-specific-permission-rules

#### File References
- Use `@` prefix for including file contents
- Reference files relative to working directory
- Can reference multiple files in one command

#### Dynamic Content
- Use `$ARGUMENTS` placeholder for user input
- Parse arguments intelligently in "Your Task" section
- Handle missing or invalid arguments gracefully

### 5. Command Naming Rules
- No leading slash in filename
- Use lowercase with hyphens (kebab-case)
- Namespace with subdirectories creates colon syntax: `/namespace:command`
- Avoid conflicts between user and project commands

### 6. Example Creation

For command: `create-prompt test-runner --user --namespace testing`

Would create: `~/.claude/commands/testing/test-runner.md`
Accessible as: `/testing:test-runner`

### Important Notes
- Never modify built-in slash commands
- Check for existing commands before creating
- Provide clear success message with usage example
- Remember: project commands visible to team, user commands are personal