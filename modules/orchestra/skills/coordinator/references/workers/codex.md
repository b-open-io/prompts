# Codex, Sol, and Luna Worker

Read this only when a separate Codex CLI process is the selected worker.
Normally this is an external lane from Claude, Grok, or OpenCode. From a Codex
main, use native agents for specialist evidence and review; select a separate
Codex process when it is the chosen cheaper or isolated implementation lane.

## Choose the model

- GPT-5.6 Sol is the quality Codex worker.
- GPT-5.6 Luna at extra-high reasoning is the cheap, unlimited-feeling volume
  lane. Prefer it for routine implementation when it meets the acceptance
  criteria, but never replace a lane the user explicitly selected.

Both send the prompt, spec, and selected repository content to OpenAI. Apply
the Coordinator disclosure rule before first use.

## Preflight

Confirm the codex binary, authentication, selected model, effective sandbox,
and reasoning effort. If a Claude Code Codex plugin is installed, prefer its
resumable background job interface; otherwise use the raw CLI. Do not assume
the plugin and raw CLI share model, profile, or sandbox settings.

If the lane is wanted but unavailable, offer setup and re-run preflight after
the user approves the machine-level change.

## Raw CLI

Sol:

    codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-sol \
      -c model_reasoning_effort="high" \
      "<imperative; details in SPEC file>" \
      > /tmp/dispatch-<id>.log 2>&1 &

Luna:

    codex exec --sandbox workspace-write --cd <repo> -m gpt-5.6-luna \
      -c model_reasoning_effort="xhigh" \
      "<imperative; details in SPEC file>" \
      > /tmp/dispatch-<id>.log 2>&1 &

If Luna rejects xhigh, try max once and report which effort actually ran. Luna
without extra-high or max is not this lane. Capture complete output and demand
the shared final report.

Codex sandboxes can differ from the main environment in network, ports, and
caches. Do not accept build-tool substitutions, dependency shims, or removed
assets as fixes for those constraints.

The orchestra claudex skill replaces the main seat with Claude Code routed to
Sol. It is not a worker and must not be used as one.
