# Codex, Sol, Luna, and Astra Worker

Read this only when a separate Codex CLI process is the selected worker.
Normally this is an external lane from Claude, Grok, or OpenCode. From a Codex
main, use native agents for specialist evidence and review; select a separate
Codex process when it is the chosen cheaper or isolated implementation lane.

## Choose the model

- **Sol** (`gpt-5.6-sol`, reasoning `high`) — quality Codex worker.
- **Luna** (`gpt-5.6-luna`, reasoning `xhigh`) — cheap volume lane. Prefer it
  for routine implementation when it meets acceptance criteria; never replace a
  user-selected lane.
- **Astra** (`gpt-6-astra`, recommended `high`) — 3D / animation / gamification /
  creative implementation lane. Use `xhigh` or `max` only if the user asks or
  the first `high` run fails.

Advisor Astra (`gpt-6-astra` under Advisor) is not this worker. Read-only
second opinions stay in Advisor; implementation stays here.

All three send the prompt, spec, and selected repository content to OpenAI.
Apply the Coordinator disclosure rule before first use.

## Preflight

Confirm the `codex` binary, authentication, selected model, effective sandbox,
and reasoning effort. If a Claude Code Codex plugin is installed, prefer its
resumable background job interface; otherwise use the raw CLI. Do not assume
the plugin and raw CLI share model, profile, or sandbox settings.

If the lane is wanted but unavailable, offer setup and re-run preflight after
the user approves the machine-level change.

## Raw CLI

When dispatching raw `codex exec`, also read
[cli-dispatch.md](cli-dispatch.md). Do not inline long CLI recipes here.

The orchestra claudex skill replaces the main seat with Claude Code routed to
Sol. It is not a worker and must not be used as one.
