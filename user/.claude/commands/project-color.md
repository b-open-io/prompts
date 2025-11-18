---
version: 1.0.1
allowed-tools: Read, Write, Edit, Bash(jq:*), Bash(mkdir:*)
description: Set VSCode project colors (like Peacock extension) with random, hex, or natural language color descriptions
argument-hint: [color] | --help
tags: design, vscode, peacock, colors, workspace
---

# Project Color

Set VSCode workspace colors to visually distinguish projects, similar to the Peacock extension.

## Usage

**Generate random vibrant color:**
```
/project-color
```

**Use specific hex color:**
```
/project-color #8d0756
/project-color #2e7d32
```

**Natural language colors:**
```
/project-color dark forest green
/project-color vibrant ocean blue
/project-color muted coral
/project-color light purple
/project-color deep magenta
```

**Show help:**
```
/project-color --help
```

## How It Works

This command configures `.vscode/settings.json` in your current working directory with color customizations for:
- Activity Bar (sidebar)
- Status Bar (bottom bar)
- Title Bar (top bar)
- Sash borders and badges

The command automatically:
1. Parses natural language color descriptions OR uses specified hex color OR generates random color
2. Maps color names to hex values using comprehensive color knowledge
3. Calculates lighter variants for visual hierarchy
4. Calculates complementary colors for badges
5. Determines optimal text contrast colors
6. Safely merges with existing VSCode settings (preserves other settings)

## Color Customizations Applied

- `peacock.color` - Base color identifier
- `activityBar.background` - Sidebar color
- `statusBar.background` - Bottom status bar
- `titleBar.activeBackground` - Window title bar
- `activityBarBadge.background` - Badge accent color
- And more for complete visual consistency

## Requirements

- **jq** command-line JSON processor (install with `brew install jq` on macOS)
- Write access to `.vscode/settings.json` in current directory

---

<instructions>
You are tasked with setting VSCode workspace colors for the current project.

## Step 1: Parse Arguments

Check if user requested help by examining $ARGUMENTS.
If $ARGUMENTS contains "--help", show the usage section above and exit.

## Step 2: Determine the Base Color

Parse $ARGUMENTS to determine the base hex color using the following logic:

### If Arguments Start with #
Extract the hex color directly (e.g., "#8d0756")

### If Arguments Contain Color Words (Natural Language)
Use the comprehensive color mapping system below to convert natural language to hex:

#### Base Hue Mappings

**Red:**
- Keywords: red, crimson, ruby, cherry, rose
- Dark: #8B0000 (dark red, deep red)
- Vibrant: #FF6B6B (red, vibrant red, bright red)
- Light: #FFB6C1 (light red, pink)

**Orange:**
- Keywords: orange, rust, amber, tangerine, coral
- Dark: #CC5500 (dark orange, burnt orange)
- Vibrant: #FF8C42 (orange, vibrant orange)
- Light: #FFCC99 (light orange, peach)

**Yellow:**
- Keywords: yellow, gold, lemon, mustard
- Dark: #B8860B (dark yellow, gold)
- Vibrant: #FFD700 (yellow, bright yellow)
- Light: #FFEB99 (light yellow, cream)

**Green:**
- Keywords: green, forest, emerald, lime, olive
- Dark: #2D5016 (dark green, forest green)
- Vibrant: #4CAF50 (green, vibrant green)
- Light: #90EE90 (light green, mint)

**Teal:**
- Keywords: teal, turquoise, aquamarine
- Dark: #123323 (dark teal)
- Vibrant: #20B2AA (teal, vibrant teal)
- Light: #AFEEEE (light teal, aqua)

**Cyan:**
- Keywords: cyan, sky, aqua
- Dark: #006B7D (dark cyan)
- Vibrant: #00CED1 (cyan, bright cyan)
- Light: #E0FFFF (light cyan, ice)

**Blue:**
- Keywords: blue, navy, ocean, azure, sapphire
- Dark: #003E80 (dark blue, navy)
- Vibrant: #4A90E2 (blue, ocean blue, vibrant blue)
- Light: #ADD8E6 (light blue, sky blue)

**Purple:**
- Keywords: purple, violet, lavender, plum
- Dark: #4B0082 (dark purple, indigo)
- Vibrant: #9370DB (purple, vibrant purple)
- Light: #DDA0DD (light purple, lavender)

**Magenta:**
- Keywords: magenta, fuchsia, hot pink
- Dark: #8D0756 (dark magenta, maroon)
- Vibrant: #FF1493 (magenta, hot pink, vibrant magenta)
- Light: #FFB6E5 (light magenta, pink)

**Brown:**
- Keywords: brown, chocolate, coffee, tan, beige
- Dark: #654321 (dark brown, chocolate)
- Vibrant: #A0522D (brown, sienna)
- Light: #D2B48C (light brown, tan, beige)

**Gray:**
- Keywords: gray, grey, silver, slate, charcoal
- Dark: #2C2C2C (dark gray, charcoal)
- Medium: #808080 (gray, grey, slate)
- Light: #D3D3D3 (light gray, silver)

#### Modifier Keywords

**Intensity Modifiers:**
- "dark", "deep", "darker" → use dark variant
- "vibrant", "bright", "vivid", "intense", "saturated" → use vibrant variant
- "light", "lighter", "pale", "pastel", "soft" → use light variant
- "muted", "subtle", "desaturated" → reduce saturation by 30%

#### Parsing Algorithm

1. Extract all color-related words from $ARGUMENTS
2. Identify base hue (red, blue, green, etc.)
3. Identify intensity modifier (dark, light, vibrant, muted)
4. Map to appropriate hex value:
   - If "dark" or "deep" → use dark variant
   - If "vibrant" or "bright" → use vibrant variant
   - If "light" or "pale" → use light variant
   - If "muted" → use vibrant variant but reduce saturation
   - If no modifier → use vibrant variant (default)

### If Arguments Are Empty
Generate a random vibrant color using one of these vibrant hues:
- #FF6B6B (vibrant red)
- #FF8C42 (vibrant orange)
- #FFD700 (vibrant yellow)
- #4CAF50 (vibrant green)
- #20B2AA (vibrant teal)
- #00CED1 (vibrant cyan)
- #4A90E2 (vibrant blue)
- #9370DB (vibrant purple)
- #FF1493 (vibrant magenta)

Randomly select one of these colors.

## Step 3: Calculate Color Variants

Once you have the base hex color, calculate:

### Lighter Variant (for activity bar)
Add approximately 30% brightness to RGB values, cap at 255:
```
lighter_r = min(base_r + 77, 255)
lighter_g = min(base_g + 77, 255)
lighter_b = min(base_b + 77, 255)
```

### Complementary Color (for badges)
Rotate hue by 180 degrees:
1. Convert RGB to HSL
2. Add 180 to hue (wrap if > 360)
3. Convert back to RGB

### Text Contrast Color
Calculate relative luminance: L = 0.2126*R + 0.7152*G + 0.0722*B
- Use #e7e7e7 (light text) if L < 0.5
- Use #15202b (dark text) if L >= 0.5

## Step 4: Create .vscode Directory

Use Bash tool to ensure .vscode directory exists:
```
Bash(mkdir:-p .vscode)
```

## Step 5: Read Existing Settings

Use Read tool to check for existing settings:
```
Read(file_path=".vscode/settings.json")
```

If the file doesn't exist, treat it as an empty JSON object: {}

## Step 6: Generate Color Settings Object

Create the workbench.colorCustomizations object with these properties:

```json
{
  "peacock.color": "<base_color>",
  "workbench.colorCustomizations": {
    "activityBar.activeBorder": "<complementary_color>",
    "activityBar.background": "<lighter_variant>",
    "activityBar.foreground": "<text_color>",
    "activityBar.inactiveForeground": "<text_color_50%_opacity>",
    "activityBarBadge.background": "<complementary_color>",
    "activityBarBadge.foreground": "#e7e7e7",
    "editorGroup.border": "<base_color>",
    "panel.border": "<base_color>",
    "sash.hoverBorder": "<base_color>",
    "sideBar.border": "<base_color>",
    "statusBar.background": "<base_color>",
    "statusBar.foreground": "<text_color>",
    "statusBarItem.hoverBackground": "<lighter_variant>",
    "statusBarItem.remoteBackground": "<base_color>",
    "statusBarItem.remoteForeground": "<text_color>",
    "tab.activeBorder": "<complementary_color>",
    "titleBar.activeBackground": "<base_color>",
    "titleBar.activeForeground": "<text_color>",
    "titleBar.inactiveBackground": "<base_color_90%_opacity>",
    "titleBar.inactiveForeground": "<text_color_60%_opacity>"
  }
}
```

## Step 7: Merge Settings

Use Bash with jq to merge the new color settings with existing settings:

```bash
# Create temp file with new settings
echo '<new_settings_json>' > /tmp/new_colors.json

# Merge with existing settings (existing settings take precedence for non-color keys)
jq -s '.[0] * .[1]' .vscode/settings.json /tmp/new_colors.json > /tmp/merged.json

# Clean up temp files after reading merged result
```

Read the merged result and use Edit or Write tool to update .vscode/settings.json.

## Step 8: Confirm Success

Display a success message showing:
- The base color that was set (show hex value)
- A description of the color if natural language was used
- The color interpretation (e.g., "Interpreted 'dark forest green' as #2D5016")
- Instructions to reload VSCode window

Example output:
```
✅ Project color set to #2D5016 (dark forest green)

Color applied to:
- Activity Bar: #529D38 (lighter variant)
- Status Bar: #2D5016 (base color)
- Title Bar: #2D5016 (base color)
- Badges: #9D382D (complementary)

Reload VSCode window to see changes:
Cmd+Shift+P → "Developer: Reload Window"
```

## Important Notes

- NEVER use `!` syntax - that's for hooks only
- Always use proper tool calls: Bash(), Read(), Write(), Edit()
- Handle missing jq gracefully - suggest installation if needed
- Validate hex color format before processing
- Preserve all existing VSCode settings when merging
- Use absolute paths for temp files if needed

</instructions>

## Example Output

```
✅ Project color set to #8d0756 (dark magenta)

Interpreted: "dark magenta" → #8d0756

Color applied to:
- Activity Bar: #A87BAB (lighter variant)
- Status Bar: #8d0756 (base color)
- Title Bar: #8d0756 (base color)
- Badges: #07568D (complementary - blue)

Reload VSCode window to see changes:
Cmd+Shift+P → "Developer: Reload Window"
```

## Notes

- Colors persist in `.vscode/settings.json` (committed to git by default)
- Safe to run multiple times - preserves other VSCode settings
- To remove colors, manually delete the workbench.colorCustomizations key
- Works with or without Peacock extension installed
- Natural language parsing understands intensity modifiers and color names
