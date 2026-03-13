---
name: status
description: Show HammerTime status dashboard — alias for /hammertime with no arguments
allowed-tools: Read, Bash
user-invocable: true
---

# HammerTime Status

This is an alias. Run the same full status dashboard as `/hammertime` with no arguments:

1. **Rules table** — Read builtin rules and user rules from `~/.claude/hammertime/rules.json`, present all rules in a compact table showing name, status, layer counts (keywords, patterns, co-occurrence), threshold, full-turn evaluation, and linked skill.

2. **Debug log** — If `~/.claude/hammertime/debug.log` exists, show last 20 lines. Otherwise note that debug logging is not enabled and show how to enable it: `HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log`

3. **Hook registration** — Check `~/.claude/settings.json` for `hooks.Stop` entries referencing `hammertime.py`. Report whether the hook is registered.

4. **Quick actions** — Show available commands: `/hammertime <description>` to create, `/hammertime:manage` for interactive management.

**Builtin rules** (always present):
- **project-owner** — "Fix all errors instead of dismissing them as pre-existing." (`evaluate_full_turn: true`)
