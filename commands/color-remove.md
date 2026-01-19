---
version: 1.0.0
allowed-tools: Read, Write, Bash
description: Remove ALL project colors, favorites, and settings
tags: vscode, colors, reset, cleanup, project-color
---

# Remove All Colors

Complete removal of all project color customizations, favorites, and settings. More thorough than `/color-reset`.

## Usage

```
/color-remove
```

---

<instructions>
Completely remove all project color files, settings, and configurations.

## Step 1: Remove Project Colors

Check for `.vscode/settings.json`:
```bash
ls .vscode/settings.json 2>/dev/null || echo "not found"
```

If exists, remove all color properties:
```bash
jq 'del(.["peacock.color"]) |
    del(.workbench.colorCustomizations)' \
   .vscode/settings.json > .vscode/settings.json.tmp
mv .vscode/settings.json.tmp .vscode/settings.json

# Remove if empty
if jq -e '. == {}' .vscode/settings.json 2>/dev/null; then
  rm .vscode/settings.json
  rmdir .vscode 2>/dev/null || true
fi
```

## Step 2: Remove Favorites

Remove favorites file:
```bash
rm ~/.claude/.color-favorites.json 2>/dev/null || true
```

## Step 3: Remove Config

Remove config file if exists:
```bash
rm ~/.claude/.color-config 2>/dev/null || true
```

## Step 4: Confirm

Output:
```
All project colors and settings removed

Removed:
  Project colors (.vscode/settings.json)
  Favorites (~/.claude/.color-favorites.json)
  Configuration (~/.claude/.color-config)

The statusline will show default colors.
iTerm2 tab color will reset to default.

To start fresh, use /project-color
```
</instructions>
