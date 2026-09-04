# OpenCode as advisor

Use a configured read-only `mode: subagent` advisor invoked through an
`@mention`. A prompt that says "no edits" is not a permission boundary. The
agent configuration must deny edits and shell execution.

Preflight `command -v opencode`, `opencode auth list`, and
`opencode models <provider>` without printing credentials. Pin the exact
listed `provider/model`; do not invent an OpenCode Go SKU. Read Coordinator's
[OpenCode worker guide](../../../coordinator/references/workers/opencode.md) for
current authentication and model-lane details.

Attach the prepared consult file instead of interpolating its contents into a
shell command:

```bash
ADVISOR_MODEL="<provider>/<model>"
PROMPT_FILE="/absolute/path/to/prepared-advisor-consult.md"

opencode run \
  --model "$ADVISOR_MODEL" \
  --dir <repo-or-worktree> \
  --file "$PROMPT_FILE" \
  "@<read-only-subagent> Follow the attached consult and return its verdict."
```

Use `--format json` for scripted evidence. Verify a linked child marker in the
captured output: a primary `build` line does not prove the subagent ran, and
`--agent` may fall back to a primary agent. Resume the same consult with
`--continue` or `--session <id> --fork` when reconciliation is needed.
