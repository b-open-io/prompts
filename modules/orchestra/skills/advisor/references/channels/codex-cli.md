# Codex CLI as an optional advisor

Use this channel only when the user explicitly selects a Codex advisor model
instead of the default `claude-opus-5-5`. It provides a context-clean second
opinion on difficult decisions and repository reviews from Claude Code, Codex,
Grok Build, OpenCode, or any other framework that can run a shell command.
A Codex main can launch a separate Codex CLI consult; it need not switch to
Claude or use its own session model. No Codex plugin or OpenCode provider
configuration is required for this CLI lane.

## Preflight

Check `command -v codex`, `codex --version`, `codex exec --help`, and
`codex login status`. Confirm the selected authentication/provider path and
that the explicitly selected model is available to that account. An installed
CLI alone proves neither. Follow the skill's context disclosure rules before
sending the consult. If authentication or model selection fails, report the
failure; never silently substitute another model, provider, or billing lane.

## Dispatch

Prepare a standalone consult file with the advice contract, exact checkout,
and an explicit prohibition on edits. Run the following in Bash; replace the
absolute paths with the prepared consult, repository, and output locations:

```bash
set -o pipefail
: "${BOPEN_CODEX_ADVISOR_MODEL:?Set the explicitly selected Codex advisor model}"
CODEX_ADVISOR_MODEL="$BOPEN_CODEX_ADVISOR_MODEL"
PROMPT_FILE="/absolute/path/to/prepared-advisor-consult.md"
REPO_DIR="/absolute/path/to/repo-or-worktree"
LOG_FILE="/absolute/path/to/advisor.log"
VERDICT_FILE="/absolute/path/to/advisor-verdict.md"

codex exec \
  --model "$CODEX_ADVISOR_MODEL" \
  --sandbox read-only \
  --cd "$REPO_DIR" \
  --output-last-message "$VERDICT_FILE" \
  - < "$PROMPT_FILE" 2>&1 | tee "$LOG_FILE"
```

`BOPEN_ADVISOR_MODEL` remains the general advisor default and resolves to
`claude-opus-5-5`; this optional channel uses its separate explicit
`BOPEN_CODEX_ADVISOR_MODEL` selection. Let that model use its default reasoning
effort unless the task or user calls for a supported override.

Keep `--sandbox read-only` explicit so a user's write-capable configuration
does not determine the consult's filesystem permissions. Do not add write or
sandbox-bypass flags. A sandbox does not constrain external MCP services;
ensure the consult has no write-capable external tools enabled. If that cannot
be verified, stop and configure a read-only lane before dispatch.

Preserve the exit status, complete log, and verdict. Verify the actual model
and provider from CLI runtime metadata, not the advisor's self-description.
An unavailable model, fallback, nonzero exit, or empty verdict is not approval.
Use the installed CLI's `codex exec resume --help` for a focused reconciliation
in the same advisory session, retaining the model pin and read-only boundary.
