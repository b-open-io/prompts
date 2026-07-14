---
name: setup
version: 1.0.2
description: This skill should be used when the user says "bopen setup", "setup ui", "harness install", "audit my setup", "install everything", "unified installer", "setup plan", "/bopen-setup", or wants a single view of which bOpen plugins, CLIs, env keys, third-party skills, agents, and hooks are installed across their agent harness. It audits live state, lets the user select what to fix, and emits a runtime-tailored instruction plan — it never installs anything itself. For hooks-only configuration (enabling/disabling a single hook without the full harness view) the hook-manager skill remains canonical; this skill's Overview and per-plugin tabs point there for that narrower job.
---

# Setup

A cross-plugin installer that shows the true state of a user's agent harness —
plugins, CLIs, env keys, third-party skills, agents, hooks — and turns
selections into a plan the parent agent executes. The installer itself never
installs, writes config, or mutates anything; it declares, detects, and emits.

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

Nothing here calls `npm install`, `claude plugin install`, writes a plan file,
or edits any config file. The prompt is prose and copyable commands; a human
or agent decides whether and when to execute it.

## How to launch

From the installed plugin root — two paths, identical API contracts:

**Playground (preferred — richer UI, shadcn + dither-kit):**

```bash
bun skills/setup/scripts/playground_server.ts --runtime <claude|codex|grok|opencode|hermes|generic>
```

A buildable Next.js app on port 7788; the launcher installs and builds on
first run (needs network once), then starts instantly.

**Zero-install fallback (single file, works offline):**

```bash
bun skills/setup/scripts/server.ts --runtime <claude|codex|grok|opencode|hermes|generic> [--port 7788]
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
| OpenCode | reads `.claude/skills/` + Claude Code agent `.md` natively | native parse of CC agent files | `$OPENCODE` / `$AGENT` env, `opencode.json` |
| Grok Build | zero-config Claude Code compat (marketplaces, plugins, skills, agents, hooks, CLAUDE.md) | native (CC compat) | `~/.grok/config.toml` + `grok` on PATH |
| Hermes | SKILL.md supported but installs to `~/.hermes/skills/`, never the repo tree | not deliverable — no CC agent-file parsing | `hermes` on PATH + `~/.hermes/` present |
| Pi / unknown | no skill-discovery mechanism | n/a | none — generic fallback |

For OpenCode and Grok Build the plan mostly verifies discovery rather than
installing anything new (Grok: `grok inspect` shows exactly what it found).
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
  `Skill(bopen-tools:hook-manager)` directly. It reads the same
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
