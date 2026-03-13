---
name: cli-demo-gif
version: 1.0.1
description: Generate CLI demo GIFs using vhs (Charmbracelet). Use when creating terminal recordings for README files or documentation.
---

# CLI Demo GIF Generator

Generate terminal demo GIFs using vhs. When asked to create a CLI demo GIF, produce a `.tape` file and render it.

## Steps

### 1. Create tape file

Place tape files in `docs/demo/` to keep the project root clean:

```bash
mkdir -p docs/demo
```

Write the tape file with appropriate settings for the project's CLI:

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

### 2. For unpublished CLI packages

Use `Hide`/`Show` to configure aliases before the visible demo starts:

```tape
Hide
Type "alias mycli='bun run src/cli/index.ts'"
Enter
Sleep 500ms
Show

Type "mycli --help"
Enter
Sleep 2s
```

### 3. Render the GIF

```bash
vhs docs/demo/cli.tape
```

## Tape Command Reference

| Command | Description |
|---------|-------------|
| `Output <path>` | Output file path (.gif, .mp4, .webm) |
| `Set Shell "bash"` | Shell to use |
| `Set FontSize <n>` | Font size |
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

## Default Settings

Use these defaults unless the user specifies otherwise:

- **Theme**: `Catppuccin Mocha`
- **TypingSpeed**: `50ms`
- **Width**: `900`, **Height**: `500`
- **FontSize**: `16`
- **Output directory**: `docs/demo/`
