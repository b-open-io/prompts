# Muse Code Worker

Read this only when Muse Spark 1.3 is the selected external worker. A dispatch
can send the prompt, spec, and selected repository content to Meta; apply the
Coordinator disclosure rule before first use.

Muse is a cheap implementation-volume lane, not a judgment or review lane. Pin
Muse Spark 1.3 because the CLI default may differ.

A machine often has no `muse` binary at all. When that is true, the OpenCode
route ([opencode.md](opencode.md)) is the primary path for this lane, not a
fallback to consider only after the direct CLI fails. Preflight order:

1. `command -v muse` — if present, use the direct-CLI section below.
2. Otherwise `opencode models opencode-go | grep muse-spark-1.3` — if that
   lists a lane, load [opencode.md](opencode.md) instead of this file's
   direct-CLI section. The exact verified id on the OpenCode Go lane is
   `opencode-go/muse-spark-1.3-contributor`.

## Preflight

Confirm the muse binary, authentication, and acceptance of the exact
muse-spark-1.3 model. If setup is required, obtain permission before changing
the user's machine, then repeat preflight.

## Dispatch

    PROMPT_FILE=$(mktemp -t muse-prompt.XXXXXX)
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    muse exec --prompt-file "$PROMPT_FILE" --model muse-spark-1.3 \
      --reasoning-effort xhigh --disable-approval --workspace <repo> \
      > /tmp/dispatch-<id>.log 2>&1 &

Disable approval while retaining the OS sandbox. Never use yolo mode for a
worker because it removes that boundary. A successful process exit is not proof
that the implementation is correct; inspect the diff and re-run acceptance in
the main.

This direct-CLI section applies only when preflight confirms the `muse`
binary. Otherwise load [opencode.md](opencode.md) and verify the provider
configuration instead of using this guide.
