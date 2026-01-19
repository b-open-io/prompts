---
version: 1.0.0
allowed-tools: Read, Write, Bash
description: Save current project color to favorites list
tags: vscode, colors, favorites, project-color
---

# Save Favorite

Save the current project's color to your favorites list.

## Usage

```
/color-save-favorite
```

Optional with custom name:
```
/color-save-favorite magenta theme
```

---

<instructions>
Save the current project's color to favorites.

## Step 1: Read Current Project Color

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

Store as CURRENT_COLOR.

## Step 2: Get Favorite Name

If arguments provided, use as favorite name.
Otherwise, prompt for name or use color hex as name.

## Step 3: Load or Create Favorites File

Check for `~/.claude/.color-favorites.json`:
```bash
ls ~/.claude/.color-favorites.json 2>/dev/null || echo "not found"
```

If not found, create with empty array:
```bash
echo '[]' > ~/.claude/.color-favorites.json
```

## Step 4: Add to Favorites

Read existing favorites:
```bash
jq -c . ~/.claude/.color-favorites.json
```

Add new favorite (check for duplicates first):
```bash
jq --arg color "$CURRENT_COLOR" --arg name "$FAV_NAME" \
   '. |
    if any(.[]; .color == $color) then
      .
    else
      . + [{name: $name, color: $color, added: now}]
    end' \
   ~/.claude/.color-favorites.json > ~/.claude/.color-favorites.json.tmp
mv ~/.claude/.color-favorites.json.tmp ~/.claude/.color-favorites.json
```

## Step 5: Confirm

Output:
```
Saved to favorites: <color> (<name>)

Total favorites: <count>

Use your favorites:
  /color-favorite
```
</instructions>
