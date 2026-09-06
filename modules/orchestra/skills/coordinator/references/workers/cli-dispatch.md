# Codex CLI dispatch

Load this only when dispatching raw `codex exec` for a Sol, Luna, or Astra
worker. Prefer a Claude Code Codex plugin's resumable job interface when it is
installed and suitable.

## Capture and resume

Always capture the final message and structured events:

- `--output-last-message <path>` — write the last agent message to a file
- `--json` — emit JSONL events on stdout for monitoring
- `codex exec resume <session>` — continue the same session with a follow-up

For Coordinator’s one corrective re-dispatch, prefer `codex exec resume` with the same model pin and sandbox rather than starting a fresh session.

Redirect the full stream to a log. Demand the shared final report. Verify the
actual model and effort from runtime metadata, not the worker's self-description.

## Network in the sandbox

Default is no extra network config. When the worker must run `bun add` (or
similar package installs) inside `workspace-write`, add:

    -c sandbox_workspace_write.network_access=true

Do not make that the default. Prefer specs that avoid in-sandbox installs when
possible.

## Example commands

Sol:

    codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-sol \
      -c model_reasoning_effort="high" \
      --json --output-last-message /tmp/dispatch-<id>-last.md \
      "<imperative; details in SPEC file>" \
      > /tmp/dispatch-<id>.log 2>&1 &

Luna:

    codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-luna \
      -c model_reasoning_effort="xhigh" \
      --json --output-last-message /tmp/dispatch-<id>-last.md \
      "<imperative; details in SPEC file>" \
      > /tmp/dispatch-<id>.log 2>&1 &

If Luna rejects `xhigh`, try `max` once and report which effort actually ran.
Luna without `xhigh` or `max` is not this lane.

Astra:

    codex exec --sandbox workspace-write --cd <repo> -m gpt-6-astra \
      -c model_reasoning_effort="high" \
      --json --output-last-message /tmp/dispatch-<id>-last.md \
      "<imperative; details in SPEC file>" \
      > /tmp/dispatch-<id>.log 2>&1 &

Astra has no silent effort fallback. Raise to `xhigh` or `max` only when the
user asks or the first `high` run fails; report the effort that actually ran.

With network for installs (any of the three), insert before the prompt:

    -c sandbox_workspace_write.network_access=true

## Sandbox caveats

Codex sandboxes can differ from the main environment in network, ports, and
caches. Diffs produced under sandbox constraints may not match a clean main
checkout. Do not accept build-tool substitutions, dependency shims, or removed
assets as fixes for those constraints. Re-verify acceptance unpiped in the main
environment.
