# claudex setup — macOS · ~10 minutes

`claudex` = Claude Code harness × GPT-5.6 Sol. Run the Claude Code CLI — same
tools, skills, and UI — with OpenAI's GPT-5.6 Sol as the model, billed against
an existing ChatGPT/Codex subscription. The normal `claude` command stays
untouched; `claudex` is a separate escape hatch for when Anthropic usage runs
out.

```
claudex (zsh alias)
  ─▶ Claude Code CLI
    ─▶ CLIProxyAPI localhost:8317
      ─▶ OpenAI Codex backend (your OAuth)
```

## 00 · Prerequisites

- **Homebrew** and **Claude Code** (`brew install claude` or the official
  installer).
- **An OpenAI account with Codex access** (ChatGPT Plus/Pro). The Codex CLI does
  **not** need to be installed — just the account.

## 01 · Install CLIProxyAPI

CLIProxyAPI is a local proxy that speaks the Anthropic Messages API on one side
and OpenAI's Codex backend on the other. Claude Code thinks it is talking to
Anthropic; the proxy translates.

```bash
brew install cliproxyapi
```

## 02 · Configure the proxy

Generate an API key for the proxy — this is a **local secret the user invents**,
not an OpenAI key:

```bash
openssl rand -hex 24
```

Then edit `/opt/homebrew/etc/cliproxyapi.conf` and change three things:

```yaml
# 1. bind to localhost only (default is all interfaces)
host: "127.0.0.1"

# 2. replace the placeholder api-keys with the generated key
api-keys:
  - "<paste the openssl output here>"

# 3. add near the bottom — forces high reasoning effort on every request
payload:
  override:
    - models:
        - name: "gpt-*"
          protocol: "codex"
      params:
        "reasoning.effort": "high"
```

The `reasoning.effort` override is belt-and-suspenders: Claude Code also passes
effort through, but this guarantees high reasoning at the proxy no matter what
the client sends.

## 03 · Start it as a login service

```bash
brew services start cliproxyapi
```

This registers a launchd LaunchAgent, so the proxy starts automatically at every
login/restart. Set-and-forget — it never needs to be started manually again.
**After any config edit, run `brew services restart cliproxyapi`.**

## 04 · Connect the OpenAI account

```bash
cliproxyapi --codex-login
```

A browser tab opens at `auth.openai.com` — sign in and authorize. Credentials
land in `~/.cli-proxy-api/` and refresh themselves from then on.

**This step is interactive and must be run by the user** — it opens a browser
for OAuth and cannot be scripted. Do not attempt to enter the user's OpenAI
credentials on their behalf.

## 05 · Verify the proxy sees the models

```bash
curl -s http://127.0.0.1:8317/v1/models \
  -H "Authorization: Bearer <your-generated-key>" | python3 -m json.tool
```

`gpt-5.6-sol` should appear in the list (plus `gpt-5.6-luna`, `gpt-5.5`, and
friends). An empty `data: []` means step 04 did not complete.

## 06 · Add the alias

Append to `~/.zshrc`, substituting the generated key:

```bash
# claudex — Claude Code harness driving GPT-5.6 Sol via CLIProxyAPI
alias claudex='ANTHROPIC_BASE_URL=http://127.0.0.1:8317 \
ANTHROPIC_AUTH_TOKEN=<your-generated-key> \
ANTHROPIC_DEFAULT_HAIKU_MODEL=gpt-5.6-sol \
CLAUDE_CODE_SUBAGENT_MODEL=gpt-5.6-sol \
CLAUDE_CODE_ALWAYS_ENABLE_EFFORT=1 \
CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY=3 \
ENABLE_TOOL_SEARCH=false \
claude --model gpt-5.6-sol'
```

Then `source ~/.zshrc`. What each variable does:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_BASE_URL` | Points Claude Code at the local proxy instead of Anthropic. |
| `ANTHROPIC_AUTH_TOKEN` | Authenticates to the proxy with the generated key. |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Routes Claude Code's small/background-model calls to GPT-5.6 Sol too, so nothing tries to reach Anthropic. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Spawned subagents use the same model. |
| `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT` | Enables reasoning-effort controls for non-Anthropic models. |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | Caps parallel tool calls at 3 — the Codex backend handles bursts poorly. |
| `ENABLE_TOOL_SEARCH` | Off — deferred-tool discovery is unreliable on non-Claude models. |

Because the variables are inline in the alias, they apply to that invocation
only. Plain `claude` keeps using the Anthropic login. Extra arguments pass
through: `claudex --continue`, `claudex -p "…"` all work.

## 07 · Smoke test

```bash
claudex -p "Reply with exactly: claudex works."
```

A reply means the whole chain works. The startup banner reads
`gpt-5.6-sol · API Usage Billing`, and a warning that claude.ai connectors are
disabled is expected — the auth token overrides the claude.ai login for that
session.

## Platform note

These steps are macOS + Homebrew. On Linux or elsewhere, install and run
CLIProxyAPI directly (see its repository), then apply steps 02, 05, 06, and 07
unchanged — only the `brew install` / `brew services` mechanics differ.
