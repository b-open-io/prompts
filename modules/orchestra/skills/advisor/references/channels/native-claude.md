# Native Claude advisor

Use Claude's native advisor when the question is answerable from evidence in
the conversation. It is toolless, so place the relevant output or snippet in
the transcript before consulting. Set or verify `advisorModel` as
`claude-fable-5-2` and confirm `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` is not set.
A Fable 5.2 main accepts only a Fable 5.2 native advisor; another advisor
model may be rejected. For a different model's view, offer the Codex channel,
which needs the user's explicit selection.
Slash commands are user-only; do not try to run `/advisor` for the user.

For repository inspection, use a read-only premium Claude subagent with only
Read, Grep, and Glob. Pin `claude-fable-5-2` at `high` effort (or the
explicitly chosen `claude-opus-5-5`) and require its first line to name
the model it actually used. If the host's subagent tool accepts only aliases,
use the [Claude CLI channel](claude-cli.md), which pins the full id. An
unavailable pin can silently fall back to the session model; a reply that does
not name the pinned model is not a consult. Re-run it pinned to
`claude-opus-5-5` and report the downgrade, or report the channel unavailable.

Advisor usage is metered at the advisor model's rate. It never edits or runs
shell commands.
