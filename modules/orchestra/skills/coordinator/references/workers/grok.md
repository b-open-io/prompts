# Grok CLI Worker

Read this only when the Grok Build CLI is the selected external worker. A
dispatch can send the prompt, spec, and selected repository content to xAI;
apply the Coordinator disclosure rule before first use.

## Preflight

Run grok models and inspect the complete output. This verifies the binary,
authentication, and available ids. Pin BOPEN_WORKER_MODEL to an exact listed
id; never ride a changing CLI default. If the lane is unavailable, report it
and offer setup rather than silently implementing in the main.

## Dispatch

Use a unique prompt file for every parallel run:

    PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
    grok models
    : "${BOPEN_WORKER_MODEL:?Select an id listed by grok models}"
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    grok --prompt-file "$PROMPT_FILE" -m "$BOPEN_WORKER_MODEL" +      --permission-mode acceptEdits --sandbox workspace +      --output-format plain --cwd <repo> +      > /tmp/dispatch-<id>.log 2>&1 &

Use acceptEdits for implementation, never an unrestricted approval mode.
Verify that the named sandbox profile actually applied: an unknown Grok
profile may warn and continue unsandboxed. Re-run acceptance in the main.

Grok can create isolated worktrees and race several attempts within the lane.
The main still reviews, chooses, integrates, and verifies the result. For
cross-vendor redundancy, dispatch the same spec independently rather than
assuming an in-lane race is diverse.

Do not blindly wrap the command with gtimeout or timeout on macOS; first verify
that one exists. Without it, monitor the background job.

## Specialist persona

A raw Grok CLI prompt does not automatically receive a plugin agent persona.
When specialist behavior is needed, read
[Grok persona passing](../grok-persona.md) and use the repository helper to
prefix the selected agent body. Do not load that guide for a generic worker.
