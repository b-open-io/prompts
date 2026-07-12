---
name: hook-manager
version: 2.0.0
description: Manage bopen-tools plugin hooks — list, enable, disable, diagnose, and run first-time setup. This skill should be used when the user asks to "list hooks", "disable a hook", "enable a hook", "hook setup", "which hooks are running", "turn off the publish gate", "hooks config", or when session context contains a [BOPEN-HOOKS-SETUP] directive.
---

# Hook Manager

Manage the hooks that ship with the bopen-tools plugin. The catalog source of
truth is `hooks/manifest.json` in the installed plugin — read it live rather
than trusting a memorized list:

```bash
cat "$(ls -d ~/.claude/plugins/cache/b-open-io/bopen-tools/*/ | sort -V | tail -1)hooks/manifest.json"
```

Each entry carries `name`, `event`, `matcher`, `runtimes`, `summary`, and
`description`. Hooks register automatically when the plugin is installed;
this skill controls which ones actually run.

## The config file

Per-hook enable/disable lives in a JSON config. Resolution order (first file
with an explicit `true`/`false` verdict for a hook wins):

1. `$BOPEN_HOOKS_CONFIG` — explicit override (tests, scripts)
2. `<project>/.claude/bopen-hooks.json` — per-project
3. `~/.claude/bopen-tools/hooks-config.json` — per-user

```json
{
  "version": 1,
  "hooks": {
    "bouncer": true,
    "damage-control": true,
    "publish-gate": true,
    "agent-browser-solo": true,
    "session-context": true,
    "hammertime": true,
    "browser-intent": true
  }
}
```

A hook is disabled ONLY by an explicit `false`. Missing files, missing keys,
or unparseable JSON all mean enabled — a broken config must never silently
switch the guards off. Changes take effect on the next hook invocation; no
restart is required.

## First-time setup (the [BOPEN-HOOKS-SETUP] directive)

When session context carries `[BOPEN-HOOKS-SETUP]`, the user has no config
yet. Do not interrupt their task; offer setup at a natural pause. The flow:

1. Read the manifest (command above) and present the hooks in two tiers via
   AskUserQuestion (multiSelect):
   - **Guards (recommended on)**: bouncer, damage-control, publish-gate —
     they prevent work loss, secret exposure, and unticketed publishes.
   - **Workflow (preference)**: agent-browser-solo, session-context,
     hammertime, browser-intent.
2. Run the prerequisite checks below and fold findings into the
   recommendation (e.g. agent-browser-solo without agent-browser installed
   silently falls back to native WebFetch — still safe to leave on).
3. Write `~/.claude/bopen-tools/hooks-config.json` with the full hooks map —
   include every hook with an explicit boolean, even the all-defaults case.
   Writing the file is what dismisses the setup notice permanently.

## Enabling / disabling a hook

Edit the user config (or project config for repo-scoped changes) with the
Read and Write tools — read, flip the boolean, write back. Create the file
from the template above when it does not exist. Never edit files inside the
plugin cache; updates overwrite them.

Warn before disabling guards: bouncer stops `git reset --hard`-class work
loss, damage-control enforces zero-access paths like `.env`, publish-gate
blocks unticketed npm/on-chain publishes. Disabling them is the user's call,
but say plainly what protection goes away.

## Diagnosis

When a hook misbehaves or the user asks "why did X get blocked/skipped":

```bash
# Which config verdict applies to a hook?
for f in "$BOPEN_HOOKS_CONFIG" ./.claude/bopen-hooks.json ~/.claude/bopen-tools/hooks-config.json; do
  [ -f "$f" ] && echo "$f: $(jq -r '.hooks["<name>"] // "no verdict"' "$f")"
done

# Prerequisites
command -v jq || echo "jq missing — hooks fail open without it"
command -v agent-browser || echo "agent-browser missing — agent-browser-solo falls back to native WebFetch"
[ -n "$LINEAR_API_KEY" ] || echo "LINEAR_API_KEY unset — publish-gate fails closed on gated publishes"
command -v python3 || echo "python3 missing — hammertime and JSON escaping degrade"
```

- Hard denies surface to the model as structured permission denials; on the
  Codex runtime they arrive as stderr JSON with exit 2. Both are by design.
- hammertime also has its own controls — `Skill(bopen-tools:hammertime)` and
  the `hammertime:manage` skill — for rule-level tuning beyond on/off.
- The definitive behavior reference for every hook is its script header in
  the plugin's `hooks/` directory; read it before guessing.

## What this skill never does

- Never copies hook files into `~/.claude` — hooks ship with the plugin and
  update through `claude plugin update bopen-tools@b-open-io`.
- Never edits `hooks/*.sh`, `claude-hooks.json`, or anything in the plugin
  cache.
- Never disables a guard hook without telling the user what it protected.
