# Claude Code hooks reference

Read this reference when authoring, reviewing, or debugging a hook.

Hooks run at lifecycle points such as `PreToolUse`, `PostToolUse`,
`UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, and `PreCompact`.
Define a matcher narrowly and keep commands bounded with an explicit timeout.

Hook input arrives on stdin as JSON. Validate `tool_name`, event name, and
paths before acting. A `PreToolUse` hook may allow, deny, or ask; a nonzero
exit status should communicate a useful error. Do not treat a hook as a
replacement for host permissions or a user's approval.

Quote variables, reject path traversal, and skip secrets and `.git/`. Use
`$CLAUDE_PROJECT_DIR` for the current project root and
`${CLAUDE_PLUGIN_ROOT}` for the installed plugin root; neither replaces the
other, and both are available only when the target host sets them. Test the
hook with representative JSON fixtures and verify both the success and blocked
paths.

For the current event schema and output fields, consult the maintained
[Claude Code hooks documentation](https://code.claude.com/docs/en/hooks).
