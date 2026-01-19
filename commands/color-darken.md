---
version: 1.0.0
allowed-tools: Read, Write, Edit, Bash
description: Darken the current project color by 10%
tags: vscode, colors, adjust, project-color
---

# Darken Project Color

Darken the current project's color by 10%.

## Usage

```
/color-darken
```

---

<instructions>
Darken the current project color and apply the result.

## Step 1: Read Current Color

Check for `.vscode/settings.json`:
```bash
ls .vscode/settings.json 2>/dev/null || echo "not found"
```

If not found:
```
No project color set

Set a color first with /project-color
```
Stop execution.

Extract current color:
```bash
jq -r '.["peacock.color"] // empty' .vscode/settings.json
```

If empty, show same error above.

Store as CURRENT_COLOR.

## Step 2: Darken Color

Convert hex to RGB.

Darken by 10% (multiply each RGB component by 0.9):
```
new_r = current_r * 0.9
new_g = current_g * 0.9
new_b = current_b * 0.9
```

Round to integers.
Convert back to hex.

Store as DARKENED_COLOR.

## Step 3: Apply Darkened Color

Use same logic as `/project-color`:
1. Calculate variants (lighter, text, complementary)
2. Update `.vscode/settings.json`
3. Merge with existing settings

## Step 4: Confirm

Output:
```
Color darkened by 10%

Before: <current_hex>
After:  <darkened_hex>

Applied to:
  Title Bar: <darkened_hex>
  Status Bar: <darkened_hex>
  Activity Bar: <lighter_hex>

Reload VSCode window:
  Cmd+Shift+P → "Developer: Reload Window"

Too dark? Use /color-lighten
```
</instructions>
