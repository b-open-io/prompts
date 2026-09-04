# Muse Code Worker

Read this only when Muse Spark 1.3 is the selected external worker. A dispatch
can send the prompt, spec, and selected repository content to Meta; apply the
Coordinator disclosure rule before first use.

Muse is a cheap-volume option, not the quality default. Pin Muse Spark 1.3
because the CLI default may differ.

## Preflight

Confirm the muse binary, authentication, and acceptance of the exact
muse-spark-1.3 model. If setup is required, obtain permission before changing
the user's machine, then repeat preflight.

## Dispatch

    PROMPT_FILE=$(mktemp -t muse-prompt.XXXXXX)
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    muse exec --prompt-file "$PROMPT_FILE" --model muse-spark-1.3 +      --reasoning-effort xhigh --disable-approval --workspace <repo> +      > /tmp/dispatch-<id>.log 2>&1 &

Disable approval while retaining the OS sandbox. Never use yolo mode for a
worker because it removes that boundary. A successful process exit is not proof
that the implementation is correct; inspect the diff and re-run acceptance in
the main.

Muse can also be reached through an OpenCode provider. In that case, load the
OpenCode worker guide and verify the provider configuration instead of loading
this direct-CLI guide.
