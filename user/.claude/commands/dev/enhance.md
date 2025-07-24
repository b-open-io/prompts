---
allowed-tools: Read, Write, Edit, Bash
description: Enhance existing Claude commands with better bash execution and file references
argument-hint: <command-file-path> - Path to the command file to enhance
---

## Your Task

If the arguments contain "--help", show this help:
**enhance** - Enhance existing Claude commands with better bash execution and file references

**Usage:** `/enhance <command-file-path>`

**Description:**
Analyze and enhance existing Claude slash commands by adding real-time bash execution, dynamic file references, improved argument handling, and context optimization. Makes commands more powerful and efficient.

**Arguments:**
- `<command-file-path>` : Path to the command file to enhance
- `--help`              : Show this help message

**Examples:**
- `/enhance commands/my-command.md` : Enhance a specific command
- `/enhance ./custom-cmd.md`        : Enhance a local command file

**Features:**
- Real-time command execution with `!` prefix
- Dynamic file references with `@` prefix
- Better argument validation
- Context optimization
- Error handling improvements

Then stop.

Otherwise, enhance the specified command:

# Enhance Command

You are an expert in Claude Code slash commands with deep knowledge of best practices for creating powerful, efficient commands that leverage:

- Bash execution with `!` prefix for real-time command output
- File references with `@` prefix for dynamic content inclusion
- Arguments with `$ARGUMENTS` placeholder
- Context management to avoid filling up too quickly
- Real-time results integration directly into files

## Your Task

Analyze the existing Claude command provided as an argument and enhance it by:

1. **Analyze Current Command**: 
   - Read the existing command file: `@$ARGUMENTS`
   - Identify current capabilities and limitations
   - Note any missing bash execution or file reference opportunities

2. **Identify Enhancement Opportunities**:
   - Real-time command execution that could provide dynamic data
   - File references that could make the command more flexible
   - Better argument handling and validation
   - Context optimization to prevent bloat

3. **Create Enhanced Version**:
   - Improve bash command integration with `!` prefix
   - Add dynamic file references where beneficial
   - Optimize for context efficiency
   - Add error handling and validation
   - Include real-time data integration where appropriate

4. **Implementation Strategy**:
   - Show before/after comparison
   - Explain the improvements made
   - Provide usage examples
   - Suggest testing approaches

## Best Practices to Apply

- Use `!command` for real-time bash execution
- Use `@file.ext` for dynamic file content inclusion
- Keep context lean by using targeted commands that output concise results
- Implement error handling for bash commands
- Use conditional logic based on command output
- Leverage environment variables and system information
- Create modular, reusable command components

## Context Management

Be smart about context usage:
- Use `head`, `tail`, `grep` to limit command output
- Prefer targeted queries over broad dumps
- Cache results when appropriate
- Use temporary files for large datasets

Now analyze and enhance the command file: `$ARGUMENTS`