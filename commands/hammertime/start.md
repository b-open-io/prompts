---
description: Resume HammerTime — re-enables the stop hook after /hammertime:stop
allowed-tools: Bash
user-invocable: true
---

# HammerTime Start

Re-enable HammerTime by resolving its shared state directory and removing only the pause sentinel:

```bash
HAMMERTIME_HOME="$(python3 "${CLAUDE_PLUGIN_ROOT}/skills/hammertime/scripts/hammertime_paths.py")" && rm -f -- "$HAMMERTIME_HOME/disabled" && test ! -e "$HAMMERTIME_HOME/disabled"
```

If the command fails or a host guard blocks it, report the failure and do not bypass the guard or claim success. After a successful check, confirm to the user:

```
HammerTime active. All enabled rules are now enforced.
Run `/hammertime:status` to see your current rules.
```
