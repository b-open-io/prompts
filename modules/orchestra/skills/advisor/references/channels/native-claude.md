# Native Claude advisor

Use Claude's native advisor when the question is answerable from evidence in
the conversation. It is toolless, so place the relevant output or snippet in
the transcript before consulting. Confirm that `advisorModel` is configured
and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` is not set. Slash commands are user-only;
do not try to run `/advisor` for the user.

For repository inspection, use a read-only premium Claude subagent with only
Read, Grep, and Glob. Pin an available model and require its first line to name
the model it actually used. An unavailable pin can silently fall back to the
session model; treat that as no consult.

Advisor usage is metered at the advisor model's rate. It never edits or runs
shell commands.
