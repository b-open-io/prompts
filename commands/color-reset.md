---
version: 1.0.0
allowed-tools: Read, Write, Edit, Bash
description: Remove project colors from current workspace
tags: vscode, colors, reset, project-color
---

# Reset Colors

Remove project color customizations from the current workspace's `.vscode/settings.json`.

## Usage

```
/color-reset
```

---

<instructions>
Remove project color customizations from the current project's `.vscode/settings.json`.

## Step 1: Check for Settings File

```bash
ls .vscode/settings.json 2>/dev/null || echo "not found"
```

If not found:
```
No project colors to reset

This project doesn't have a .vscode/settings.json file.
```
Stop execution.

## Step 2: Read Current Settings

```bash
jq -c . .vscode/settings.json
```

Check if project colors exist:
```bash
jq -e '.["peacock.color"]' .vscode/settings.json 2>/dev/null || echo "not found"
```

If not found:
```
No project colors configured

The project doesn't have color customizations.
```
Stop execution.

## Step 3: Remove Color Properties

Remove color-specific properties:
```bash
jq 'del(.["peacock.color"]) |
    del(.workbench.colorCustomizations.titleBar) |
    del(.workbench.colorCustomizations.statusBar) |
    del(.workbench.colorCustomizations.activityBar) |
    del(.workbench.colorCustomizations.activityBarBadge) |
    # Clean up empty objects
    if (.workbench.colorCustomizations | length) == 0 then
      del(.workbench.colorCustomizations)
    else
      .
    end' \
   .vscode/settings.json > .vscode/settings.json.tmp
mv .vscode/settings.json.tmp .vscode/settings.json
```

## Step 4: Clean Up Empty Files

If settings.json is now empty or only has empty objects:
```bash
if jq -e '. == {}' .vscode/settings.json 2>/dev/null; then
  rm .vscode/settings.json
  rmdir .vscode 2>/dev/null || true
fi
```

## Step 5: Confirm

Output:
```
Project colors removed

Removed from .vscode/settings.json:
  peacock.color
  workbench.colorCustomizations (color entries)

Reload VSCode window to see changes:
  Cmd+Shift+P → "Developer: Reload Window"

The Claude Code statusline will show default colors.
```
</instructions>
