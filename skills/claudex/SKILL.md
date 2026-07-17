---
name: claudex
description: >
  This skill should be used when a Claude Code session needs to keep working
  after Anthropic usage runs out, or when the user asks to run the Claude Code
  harness on GPT-5.6 Sol. Trigger phrases include "my Anthropic usage ran out",
  "I'm out of Claude usage", "usage limit reached, what now", "keep working on
  another model", "run Claude Code on GPT-5.6 Sol", "use GPT-5.6 Sol as the
  model", "set up claudex", "claudex isn't working", "route the harness through
  CLIProxyAPI", or "bill against my ChatGPT/Codex subscription". It stands up a
  local proxy so the Claude Code CLI runs on OpenAI's Codex backend as an escape
  hatch, and diagnoses that setup when it drifts. macOS + Homebrew.
version: 0.0.1
user-invocable: true
---

# claudex

`claudex` runs the **Claude Code harness — same tools, skills, UI, and session —
driven by OpenAI's GPT-5.6 Sol**, billed against an existing ChatGPT/Codex
subscription. It is a deliberate **escape hatch for when Anthropic usage runs
out**: the normal `claude` command stays untouched, and `claudex` is a separate
zsh alias that reroutes one invocation through a local proxy.

```
claudex (zsh alias)  ─▶  Claude Code CLI  ─▶  CLIProxyAPI localhost:8317  ─▶  OpenAI Codex backend (your OAuth)
```

CLIProxyAPI is a local proxy that speaks the **Anthropic Messages API** on the
side facing Claude Code and the **OpenAI Codex backend** on the other. The
harness thinks it is talking to Anthropic; the proxy translates. Nothing about
the default `claude` login changes.

## When this fires

Reach for this skill in two situations:

1. **First-time setup** — the user wants the escape hatch in place (or hits the
   usage wall and has never set it up). Walk them through the one-time install.
2. **Drift / breakage** — `claudex` was working and now fails (empty model list,
   401, connection refused, or it answers as Claude). Diagnose against the
   troubleshooting reference.

This is macOS + Homebrew. On other platforms, the proxy must be run by hand;
say so rather than pretending the `brew` steps apply.

## Setup — the one-time path (~10 minutes)

The full, exact steps live in **[references/setup.md](references/setup.md)** —
load it and walk the user through, in order:

1. **Prerequisites** — Homebrew, Claude Code, and an OpenAI account with Codex
   access (ChatGPT Plus/Pro). The Codex CLI itself is *not* required.
2. **Install** — `brew install cliproxyapi`.
3. **Configure** — generate a local proxy key with `openssl rand -hex 24`, then
   edit `/opt/homebrew/etc/cliproxyapi.conf`: bind to `127.0.0.1`, set that key
   under `api-keys`, and add the `reasoning.effort: high` override.
4. **Start as a login service** — `brew services start cliproxyapi` (registers a
   launchd LaunchAgent; auto-starts at login). Re-run `brew services restart
   cliproxyapi` after any conf edit.
5. **Connect OpenAI** — `cliproxyapi --codex-login` opens a browser OAuth tab;
   credentials land in `~/.cli-proxy-api/` and self-refresh.
6. **Verify** — `curl` the proxy's `/v1/models` and confirm `gpt-5.6-sol` is
   listed.
7. **Add the alias** — append the `claudex` alias to `~/.zshrc`, `source` it.
8. **Smoke test** — `claudex -p "Reply with exactly: claudex works."`

**The interactive OAuth step (`--codex-login`) opens a browser and must be run
by the user** — it is not a scriptable step. Hand it to them explicitly and wait
for confirmation before verifying.

Do not perform the prohibited pieces on the user's behalf: never paste OpenAI
credentials into any field, never create the OpenAI account, and never invent or
transmit the proxy key beyond writing it into the local conf and alias the user
controls. Present the commands; the user runs the ones that authenticate.

## Daily use

After setup, type **`claudex`** instead of `claude`. Because the environment
variables are inline in the alias, they apply to that one invocation only —
plain `claude` keeps using the Anthropic login. Extra arguments pass through:
`claudex --continue`, `claudex -p "…"` all work. The startup banner reads
`gpt-5.6-sol · API Usage Billing`, and a "claude.ai connectors disabled" warning
is expected (the auth token overrides the claude.ai login for that session).

## Troubleshooting

When `claudex` breaks, load **[references/troubleshooting.md](references/troubleshooting.md)**
and match the symptom — empty model list, 401, connection refused on 8317, or
`claudex` answering as Claude. It maps each to the underlying drift (incomplete
OAuth, key mismatch, dead launchd service, unloaded alias) and the fix. This is
the volatile surface — proxy config, the `gpt-5.6-sol` model ID, and the OAuth
flow all live upstream and can change; keep this reference current when they do.

## Relationship to `setup`

`bopen-tools:setup` carries a `cliproxyapi` row (used by `claudex`) in its CLI
audit, so a general harness audit surfaces a missing or dead proxy and points
back here. `setup` only detects and plans — this skill owns the actual steps and
the fixes.
