---
name: check-version
description: "Check if the bopen-tools plugin is up to date by comparing local vs GitHub versions. Use this skill at the start of any session where the agent needs current skill/agent definitions, when the user asks 'is everything up to date?', 'check for updates', 'am I on the latest version?', or when you suspect skills may have changed since last install. Also use proactively when a skill seems to behave differently than documented or when instructions reference features you don't recognize. Completes in under 100ms."
user-invocable: true
allowed-tools:
  - Bash
---

# Check Version

Fast plugin version check — compares installed version against GitHub in ~70ms.

## Usage

```bash
bash <skill-path>/scripts/check-version.sh
```

Returns JSON:

```json
{
  "plugin": "bopen-tools",
  "org": "b-open-io",
  "local_version": "1.0.82",
  "remote_version": "1.0.83",
  "status": "outdated",
  "message": "Update available: 1.0.82 -> 1.0.83. Run: claude plugin update bopen-tools@b-open-io"
}
```

## Status Values

| Status | Meaning | Action |
|---|---|---|
| `current` | Installed version matches GitHub | No action needed |
| `outdated` | Newer version available on GitHub | Tell user to run the update command in the message field |
| `ahead` | Local is newer than GitHub (dev environment) | No action needed |
| `not_installed` | Plugin not found in cache | Tell user to install the plugin |
| `check_failed` | Couldn't reach GitHub | Network issue — not critical, continue working |

## When to Check

- At session start if you want to ensure you have latest agents/skills
- When a skill's behavior doesn't match its documentation
- When the user asks about updates
- Before giving advice about agent capabilities (outdated definitions could mislead)

The check is fast enough (~70ms) to run without noticeable delay. If status is `outdated`, tell the user and suggest the update command, but don't block on it — continue working with what's installed.
