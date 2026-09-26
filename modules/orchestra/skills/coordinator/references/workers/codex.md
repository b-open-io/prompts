# Codex, Sol, and Astra Worker

Read this only when a separate Codex CLI process is the selected worker.
Normally this is an external lane from Claude, Grok, or OpenCode. From a Codex
main, use native agents for specialist evidence and review; select a separate
Codex process when it is the chosen coding or isolated implementation lane.

## Choose the model

- **Sol** (`gpt-6-sol`, reasoning `high`) — preferred coding worker. Use
  `xhigh` for independent code review.
- **Astra** (`gpt-6-astra`, recommended `high`) — 3D / animation / gamification /
  creative implementation lane. Use `xhigh` or `max` only if the user asks or
  the first `high` run fails.

Read-only second opinions stay in Advisor; implementation stays here. The
default advisor is Claude Opus 5.5 (`claude-opus-5-5`), not a Codex worker.

Coding uses GPT-6 models only. Do not dispatch any `gpt-5.6` model (Sol, Luna,
Terra), even when a user or catalog offers it.

Both send the prompt, spec, and selected repository content to OpenAI.
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
