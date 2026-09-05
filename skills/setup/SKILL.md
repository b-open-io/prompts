---
name: setup
version: 1.0.5
description: >-
  Audit which bOpen plugins, CLIs, env keys, third-party skills, agents, and hooks are installed
  across the harness, then emit a runtime-tailored instruction plan with optional
  user-triggered installation of selected dependencies. Use for "bopen setup",
  "setup ui", "harness install", "audit my setup", "install everything", or
  "unified installer". For a single hook, use hook-manager.
---

# Setup

A cross-plugin setup assistant that shows the true state of a user's agent
harness — plugins, CLIs, env keys, third-party skills, agents, and hooks — and
turns selections into a plan. The launcher may bootstrap its own playground UI
dependencies on first run; it installs selected harness dependency entries only
after the user chooses **Install missing**. The fallback path emits instructions
without installing or mutating anything.

## What it does

1. **Audit** — reads every installed bOpen plugin's `setup/manifest.json`
   (declarative dependency list) and re-runs each check live: CLI version
   commands, env-key presence, third-party skill paths, codex agent delivery,
   hook enable/disable state. Plugins with no manifest still show install
   state, just without a dependency breakdown.
2. **Select** — a local web UI lets the user tick which detected gaps to fix
   and which hooks to toggle, per plugin, per runtime.
3. **Emit** — "Build setup plan" diffs the selections against detected state
   and presents one complete, runtime-tailored instruction prompt inline. Copy
   that full prompt into any agent; it includes its own context, commands,
   verification steps, execution rules, and final-report contract.
4. **PACK dependency pass** — when launched with `--pack`, reads either a
   ToC (`playbooks[].skills`) or the shipped `pack.json`, computes the full
   plugin closure, and shows required vs. installed with exact commands for
   Claude Code, Codex, and Grok Build.

The zero-install fallback only emits prose and copyable commands. The
playground's pack step can execute its validated manifest entries on explicit
user action; it constructs argv from validated plugin, marketplace, and source
fields rather than executing manifest text through a shell.

## How to launch

From the installed plugin root — two paths, identical API contracts:

**Playground (preferred — richer UI, shadcn + dither-kit):**

```bash
bun skills/setup/scripts/playground_server.ts --runtime <claude|codex|grok|opencode|hermes|generic> [--pack <toc.json|pack.json>]
```

A buildable Next.js app on port 7788; the launcher installs and builds on
first run (needs network once), then starts instantly.

**Agent Master + named local interfaces:**

```bash
portless agent-master bun skills/setup/scripts/playground_server.ts --runtime <claude|codex|grok|opencode|hermes|generic> --agent-master
```

This is the desktop-shell entrypoint. Portless supplies the app port and exposes
the configurator at `https://agent-master.localhost`. The configurator also
serves the origin-restricted Agent Master broker API used by bopen.ai to detect
the local service and launch allowlisted skill interfaces. Install Portless
globally (`npm install -g portless`); do not add it to the plugin dependencies.

`--agent-master` opens the broker API; it does not make this session updatable.
Self-update needs a handshake only the packaged shell performs:
`AGENT_MASTER_APP_VERSION`, `AGENT_MASTER_APP_BUNDLE`, and
`AGENT_MASTER_APP_PID`. Without all three, `/api/agent-master/update` reports an
unsupported host and the UI shows nothing — this launcher has no application to
replace. Point `AGENT_MASTER_UPDATE_FEED` at a local release service to exercise
the flow without publishing.

**Zero-install fallback (single file, works offline):**

```bash
bun skills/setup/scripts/server.ts --runtime <claude|codex|grok|opencode|hermes|generic> [--pack <toc.json|pack.json>] [--port 7788]
```

Pass the runtime you already know you're running as — the agent invoking this
skill almost always knows (Claude Code sets `CLAUDECODE`, Codex sets
`CODEX_SANDBOX`/`CODEX_HOME`, etc.). The detector cross-checks that claim
against its own signals and flags a mismatch rather than silently trusting or
overriding it. Default port is `7788`; the server binds `127.0.0.1` only.
Open the printed URL — it serves the UI and a `/api/state` endpoint that
re-runs every check on load and on Refresh.

## The drift principle

Install state is never persisted anywhere. Every page load and every Refresh
click re-runs all checks from scratch (~1-2s) — there is no cache to go
stale, no database row to drift from reality. The manifest itself is a
versioned file shipped inside the plugin, so it updates exactly when the
plugin updates; there is nothing to keep in sync by hand. The single
exception is the marketplace catalog fetch (used to compare installed vs.
latest plugin versions), which caches for the server process's lifetime and
shows its own "fetched N minutes ago" stamp with an independent refresh.

If the marketplace is unreachable, that column shows "unavailable" — local
detection still works. Never fabricate a version number to fill the gap.

## Runtime notes

| Runtime | Mechanism | Agent delivery | Detection signal |
|---|---|---|---|
| Claude Code | `claude plugin install x@marketplace` | bundled with plugin | `CLAUDECODE` env |
| Codex CLI | `codex plugin add` + marketplace | `codex-agent-setup` scripts | Codex session env/paths |
| OpenCode | native bOpen adapter from a persistent prompts checkout | namespaced agents and commands, native skill paths, supported MCP and core hook bridge | `$OPENCODE` / `$AGENT` env, `opencode.json` |
| Grok Build | zero-config Claude Code compat (marketplaces, plugins, skills, agents, hooks, CLAUDE.md) | native (CC compat) | `~/.grok/config.toml` + `grok` on PATH |
| Hermes | SKILL.md supported but installs to `~/.hermes/skills/`, never the repo tree | not deliverable — no CC agent-file parsing | `hermes` on PATH + `~/.hermes/` present |
| Pi / unknown | no skill-discovery mechanism | n/a | none — generic fallback |

OpenCode uses `bun <prompts-checkout>/opencode/install.ts --plugin NAME --global`.
The generated plan keeps the source at `${XDG_DATA_HOME:-$HOME/.local/share}/bopen/opencode-source`,
clones it once, and updates with a clean working tree and fast-forward merge.
Repeat `--plugin` for selected plugins; `--all` is only for an explicit full-suite request.
For project scope, omit `--global` in the target project or pass `--project PATH`.
Use the same scope and selection with `--uninstall` to remove only managed entries.
An existing Claude installation does not prove anything is installed in OpenCode.
Verify the native shim and inspect `opencode debug config`, `opencode debug skill`,
and `opencode debug agent <exact-name>` without making model requests.
Namespaced agents and commands use `bopen-<plugin>-<name>`.
The adapter supports the core source and modules shipped in the prompts repository;
third-party catalog entries need their own supported installation path. Report
unsupported components from the adapter's capability report instead of claiming parity.
Restart OpenCode after changing the installation. Grok Build continues to verify
Claude-compatible discovery with `grok inspect`.
Hermes gets its own dialect since it can't consume agent `.md` files and
caches skill content as injected user messages — the plan calls that out
rather than assuming parity. Unrecognized runtimes get the generic tier:
portable `npx skills add`-style instructions only, no runtime-specific agent
or hook wiring.

## Executing the plan

The setup plan is a self-contained instruction prompt, not a script — it lists
ordered steps (plugins → agents → CLIs → env → third-party skills → hooks
config → skill setup scripts) with commands and verification in the active
runtime's dialect. Paste the full prompt into any agent without supplying a
repository checkout, machine-specific path, or prior conversation.
Hooks-config changes in the prompt are a special case: writing
`hooks-config.json` is ask-tier (per hook-manager's guard semantics), so the
executing agent must confirm with the user before writing it — the plan says
this explicitly rather than assuming silent consent.

## Integration pointers — don't duplicate these paths

- **Hooks only, no full harness view needed** → use
  `Skill(core:hook-manager)` directly. It reads the same
  `hooks/manifest.json` and writes the same `hooks-config.json`; this skill's
  Hooks tab is a visual front end for the same state, not a replacement.
- **Codex agent delivery only** → `codex-agent-setup`'s own `setup.sh` is the
  canonical mechanism; the plan invokes it verbatim rather than reimplementing
  agent copying.
- **A specific plugin's own setup skill** (`gemskills:setup`,
  `sigma-auth:setup`, `codex:setup`) → the plan references
  `Skill(<plugin>:setup)` rather than duplicating that plugin's logic.
- **Per-skill token/config scripts** (`x-tweet-search`, `npm-publish`,
  `statusline-setup`, `persona`) → listed in each plugin's manifest as
  `skillSetupScripts`; the plan tells the agent when to run them, it doesn't
  run them itself.

This skill fronts existing setup mechanisms across every bOpen plugin — it
never replaces one.
