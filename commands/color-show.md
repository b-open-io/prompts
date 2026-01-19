---
version: 1.0.0
allowed-tools: Read, Bash
description: Show and copy current project color to clipboard
tags: vscode, colors, info, project-color
---

# Show Current Color

Display the current project's color and copy it to clipboard.

## Usage

```
/color-show
```

---

<instructions>
Display current project color and copy to clipboard.

## Step 1: Read Current Color

Check for `.vscode/settings.json`:
```bash
ls .vscode/settings.json 2>/dev/null || echo "not found"
```

If not found:
```
No project color set

This project doesn't have a color configured.

Set one with /project-color
```
Stop execution.

Extract color:
```bash
jq -r '.["peacock.color"] // empty' .vscode/settings.json
```

If empty, show same message above.

Store as CURRENT_COLOR.

## Step 2: Extract Additional Info

Get complementary colors if they exist:
```bash
jq -r '.workbench.colorCustomizations.titleBar.activeBackground // empty' .vscode/settings.json
jq -r '.workbench.colorCustomizations.activityBar.background // empty' .vscode/settings.json
jq -r '.workbench.colorCustomizations.statusBar.background // empty' .vscode/settings.json
```

## Step 3: Copy to Clipboard

Copy the base color to clipboard:
```bash
echo -n "$CURRENT_COLOR" | pbcopy
```

(On non-macOS, this command may fail gracefully)

## Step 4: Display Info

Output:
```
Current Project Color

Base Color: <hex>
RGB: (<r>, <g>, <b>)

Applied to:
  Title Bar: <hex>
  Status Bar: <hex>
  Activity Bar: <lighter_hex>

Color copied to clipboard!

Modify:
  /color-darken      - Make darker
  /color-lighten     - Make lighter
  /color-save-favorite - Save to favorites

Reset:
  /color-reset
```

If copy failed (non-macOS):
```
Current Project Color

Base Color: <hex>
RGB: (<r>, <g>, <b>)

Applied to:
  Title Bar: <hex>
  Status Bar: <hex>
  Activity Bar: <lighter_hex>

Copy this color: <hex>
```
</instructions>
