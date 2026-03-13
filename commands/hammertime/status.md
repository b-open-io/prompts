---
name: status
description: Show HammerTime status — all rules (builtin + user), enabled state, debug log tail, and hook health
allowed-tools: Read, Bash
user-invocable: true
---

# HammerTime Status

Show the current state of the HammerTime stop hook system at a glance.

## Steps

### 1. Read rules

Read the builtin rules from the hook source and user rules from `~/.claude/hammertime/rules.json` (may not exist yet — that's fine, means no user rules).

**Builtin rules** (always present, hardcoded in hook):
- **project-owner** — "Fix all errors instead of dismissing them as pre-existing." (`evaluate_full_turn: true`)

### 2. Show rules table

Present ALL rules in a compact table:

```
## HammerTime Rules

| # | Rule | Status | Layers | Threshold | Full Turn | Skill |
|---|------|--------|--------|-----------|-----------|-------|
| 1 | project-owner (builtin) | enabled | kw:15 pat:8 co:yes | 5 | yes | - |
| 2 | fix-lint-errors | enabled | kw:7 pat:2 co:yes | 5 | yes | - |
| 3 | no-trailing-summaries | disabled | kw:6 pat:2 co:no | 5 | no | - |
```

Where:
- **Layers** shows keyword count, pattern count, and whether co-occurrence (Layer 3) is configured
- **Full Turn** shows whether `evaluate_full_turn` is set
- **Skill** shows the linked skill or `-`

### 3. Show debug log tail (if exists)

Check if `~/.claude/hammertime/debug.log` exists. If so, show the last 20 lines:

```
## Recent Debug Log

(last 20 lines from ~/.claude/hammertime/debug.log)
```

If no debug log exists, show:

```
## Debug Logging

Not enabled. Set `HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log` to enable.
```

### 4. Show hook registration

Check if HammerTime is registered in Claude Code settings by reading `~/.claude/settings.json`. Look for `hooks.Stop` entries that reference `hammertime.py`. Report whether the hook is registered.

### 5. Quick actions reminder

```
## Quick Actions

- `/hammertime <description>` — Create a new rule
- `/hammertime:manage` — Interactive rule management (enable, disable, remove, edit)
- `export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log` — Enable debug logging
```
