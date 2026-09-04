---
description: Pause HammerTime — disables the stop hook until resumed with /hammertime:start
allowed-tools: Bash
user-invocable: true
---

# HammerTime Stop

Pause HammerTime by resolving its shared state directory and creating only the pause sentinel:

```bash
HAMMERTIME_HOME="$(python3 "${CLAUDE_PLUGIN_ROOT}/skills/hammertime/scripts/hammertime_paths.py")" && mkdir -p -- "$HAMMERTIME_HOME" && touch -- "$HAMMERTIME_HOME/disabled" && test -f "$HAMMERTIME_HOME/disabled"
```

If the command fails or a host guard blocks it, report the failure and do not bypass the guard or claim success. After a successful check, confirm to the user:

```
HammerTime paused. The stop hook will not fire until you run `/hammertime:start`.
Your rules are preserved and will resume exactly where they left off.
```
