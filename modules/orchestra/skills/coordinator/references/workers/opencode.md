# OpenCode CLI Worker

Read this only when OpenCode is the selected worker lane. OpenCode is the
harness, not necessarily the model provider. Inspect the provider configuration
behind the pinned provider/model, disclose that destination, and never assume
where content will be sent.

## Preflight

Confirm opencode, its version, authentication, and the intended model with:

    opencode auth list
    opencode models opencode-go

`opencode auth list` reports the stored `OpenCode Go api` credential;
`OPENCODE_API_KEY` is the environment credential when used. Verify through
these commands without printing or comparing secret material. Do not print
credentials from the auth output. Pin the full provider/model
id. A previously tested id is evidence for that environment, not a
permanent universal id. There is no opencode exec command; the headless
entrypoint is opencode run.

Known Muse Spark lanes through OpenCode:

- `opencode-go/muse-spark-1.3-contributor` is the authenticated Go lane and
  is training-eligible.
- `opencode/muse-spark-1.3-contributor-free` is a temporary Zen promotion
  and is training-eligible. When preflight lists it, pin that exact id for
  the run; do not assume it exists in another environment.
- `opencode-go/muse-spark-1.3` is unavailable unless the live catalog lists
  it; never invent it.

Privacy-sensitive standard Muse must be separately configured and
discovered, for example `meta/muse-spark-1.3`; it is not currently an
OpenCode Go SKU.

Every report identifies the actual provider/model and authentication path
that ran.

## Dispatch

Use a unique prompt file for every parallel run:

    PROMPT_FILE=$(mktemp -t opencode-prompt.XXXXXX)
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    opencode run --model "<provider>/<model>" --dir <repo> \
      --file "$PROMPT_FILE" \
      "Follow the attached task instructions exactly." \
      > /tmp/dispatch-<id>.log 2>&1 &

Use JSON output for scripting or attach to a running server when that avoids
repeated MCP startup. Capture the full log and demand the shared final report.

## Real subagent invocation

Agents live in .opencode/agent/, .opencode/agents/, or opencode.json. The
--agent option selects a primary or all-mode agent; it does not directly start
one declared with mode: subagent.

For a real child, start a headless primary session and invoke the named child
with an @mention:

    opencode run --model "<provider>/<model>" --dir <repo> \
      --file "$PROMPT_FILE" \
      "@general Follow the attached task instructions exactly."

A subagent without its own model inherits the parent model. Verify a child
marker such as General Agent in the captured output before claiming delegation;
a primary build line alone proves nothing.

OpenCode has no native multi-stage workflow engine. The caller owns sequencing
and barriers. Skills are drop-in and may be discovered from .claude/skills/;
hooks are plugin event handlers, not a portable hooks file.

Custom providers can expose Muse or Luna through OpenCode. Verify the provider
block and model list, then apply this guide; do not also load the direct Muse or
Codex CLI guide unless that CLI is separately selected.
