# Claude Code settings reference

Read this reference when a command or skill needs settings, permissions,
external directories, MCP servers, or host-specific troubleshooting.

## Settings and permissions

Claude Code resolves settings from managed policy, command-line overrides,
project-local settings, project-shared settings, and user settings. A managed
deny rule remains effective even when a lower-precedence allow rule lists the
same tool. Keep permission patterns narrow and document the actual operation
they authorize.

Use `permissions.allow` and `permissions.deny` for tool rules, and
`permissions.additionalDirectories` only when a workflow has a concrete need
to access an external path. Inspect the existing policy first. Do not change a
global setting or external directory as an automatic workaround; explain the
required access and obtain the user's approval at that mutation boundary.

Use exact Bash patterns for commands without arguments and `Bash(command:*)`
for commands that accept arguments. An agent `tools:` list is a separate
restriction from skill `allowed-tools`: the latter pre-approves listed tools
for a skill and does not exclude tools already allowed by the host or session.

## MCP and environment variables

Keep API keys in the process environment or a wrapper script. Do not place
secrets in an `.mcp.json` `env` block. Use `${CLAUDE_PLUGIN_ROOT}` for files
owned by the installed plugin, and provide a non-secret `.env.example` when a
wrapper needs documented variables.

## Troubleshooting

When a command fails, classify the error before changing configuration:

1. Check the host and working directory.
2. Inspect effective allow and deny rules and managed restrictions.
3. Verify the binary and command syntax.
4. Request only the missing permission or directory access.
5. Re-run the narrow operation and report the result.

Consult the maintained [Claude Code settings documentation](https://code.claude.com/docs/en/settings)
and [permission documentation](https://code.claude.com/docs/en/permissions)
when host behavior is version-sensitive.
