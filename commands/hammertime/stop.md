---
description: Pause HammerTime — disables the stop hook until resumed with /hammertime:start
allowed-tools: Bash
user-invocable: true
---

# HammerTime Stop

Disable the HammerTime stop hook by creating the sentinel file:

```bash
mkdir -p ~/.claude/hammertime && touch ~/.claude/hammertime/disabled
```

Then confirm to the user:

```
HammerTime paused. The stop hook will not fire until you run `/hammertime:start`.
Your rules are preserved and will resume exactly where they left off.
```
