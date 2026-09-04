# OpenCode CLI Worker

Read this only when OpenCode is the selected worker lane. OpenCode is the
harness, not necessarily the model provider. Inspect the provider configuration
behind the pinned provider/model, disclose that destination, and never assume
where content will be sent.

## Preflight

Confirm opencode, its version, authentication, and the intended model with:

    opencode models <provider>

Pin the full provider/model id. A previously tested id is evidence for that
environment, not a permanent universal id. There is no opencode exec command;
the headless entrypoint is opencode run.

When preflight lists `opencode/muse-spark-1.3-contributor-free`, it is a known
cheap implementation choice. Pin that exact id for the run; do not assume it
exists in another environment.

## Dispatch

Use a unique prompt file for every parallel run:

    PROMPT_FILE=$(mktemp -t opencode-prompt.XXXXXX)
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    opencode run --model "<provider>/<model>" --dir <repo> +      "$(cat "$PROMPT_FILE")" > /tmp/dispatch-<id>.log 2>&1 &

Use JSON output for scripting or attach to a running server when that avoids
repeated MCP startup. Capture the full log and demand the shared final report.

## Real subagent invocation

Agents live in .opencode/agent/, .opencode/agents/, or opencode.json. The
--agent option selects a primary or all-mode agent; it does not directly start
one declared with mode: subagent.

For a real child, start a headless primary session and invoke the named child
with an @mention:

    opencode run --model "<provider>/<model>" --dir <repo> +      "@general <bounded task>"

A subagent without its own model inherits the parent model. Verify a child
marker such as General Agent in the captured output before claiming delegation;
a primary build line alone proves nothing.

OpenCode has no native multi-stage workflow engine. The caller owns sequencing
and barriers. Skills are drop-in and may be discovered from .claude/skills/;
hooks are plugin event handlers, not a portable hooks file.

Custom providers can expose Muse or Luna through OpenCode. Verify the provider
block and model list, then apply this guide; do not also load the direct Muse or
Codex CLI guide unless that CLI is separately selected.
