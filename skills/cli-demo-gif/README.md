# cli-demo-gif

Generate polished terminal demo GIFs using [vhs](https://github.com/charmbracelet/vhs) by Charmbracelet.

## Prerequisites

Install vhs:

```bash
brew install vhs
```

## What This Skill Does

When you ask Claude to create a terminal demo GIF, it will:

1. Write a `.tape` file with the correct vhs syntax
2. Place it in `docs/demo/` to keep the project root clean
3. Run `vhs docs/demo/cli.tape` to render the GIF
4. Output the GIF at the path specified in the tape file

## Usage Examples

- "Create a CLI demo GIF for my project"
- "Record a terminal demo of the `--help` output"
- "Make a GIF showing how to run my CLI tool"

## Tape File Reference

```tape
Output docs/demo/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms

Type "command --help"
Enter
Sleep 2s
```

### Key Commands

| Command | Description |
|---------|-------------|
| `Output <path>` | Output file path (.gif, .mp4, .webm) |
| `Set Shell "bash"` | Shell to use |
| `Set FontSize <n>` | Font size (16 recommended) |
| `Set Width <n>` | Terminal width in pixels |
| `Set Height <n>` | Terminal height in pixels |
| `Set Padding <n>` | Padding around terminal |
| `Set Theme "<name>"` | Color theme |
| `Set TypingSpeed <duration>` | Delay between keystrokes |
| `Type "<text>"` | Type text |
| `Enter` | Press enter |
| `Sleep <duration>` | Wait (e.g., 2s, 500ms) |
| `Hide` | Stop recording |
| `Show` | Resume recording |
| `Ctrl+C` | Send interrupt |

## Recommended Themes

- `Catppuccin Mocha` — dark, modern
- `Dracula` — dark purple
- `Tokyo Night` — dark blue
- `One Dark` — dark
- `GitHub Dark` — GitHub's dark theme

## Tips

- Keep GIFs under 1MB for fast loading in README files
- Use `Sleep` generously so viewers can read output
- 50ms typing speed looks natural
- 900x500 works well for most CLIs
- Show 3-5 commands max per GIF
- For unpublished packages, use `Hide`/`Show` to set up aliases silently before the visible demo

## Attribution

Built on [vhs](https://github.com/charmbracelet/vhs) by [Charmbracelet](https://charm.sh).
