# ccstatusline Guide

[ccstatusline](https://github.com/sirmalloc/ccstatusline) is a third-party widget-based status line tool with an interactive TUI for configuration.

## Installation

No global installation required. Run directly:

```bash
# Using Bun (faster)
bunx ccstatusline@latest

# Using npm
npx ccstatusline@latest
```

## Quick Start

### Interactive Configuration

```bash
bunx ccstatusline@latest
```

This launches a React/Ink TUI where you can:
- Configure multiple status lines
- Add/remove/reorder widgets
- Customize colors per widget
- Preview changes in real-time
- Install/uninstall to Claude Code settings

### Direct Settings Configuration

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": "bunx ccstatusline@latest"
}
```

## Available Widgets

### Information Displays

| Widget | Description |
|--------|-------------|
| Model Name | Active Claude model (Opus, Sonnet, etc.) |
| Git Branch | Current git branch name |
| Git Changes | Uncommitted changes count |
| Git Worktree | Git worktree information |
| Session Clock | Current time during session |
| Session Cost | Session expenses in USD |
| Block Timer | 5-hour block progress |
| Current Working Dir | Present working directory |
| Version | Claude Code version |
| Output Style | Current output formatting |

### Token Metrics

| Widget | Description |
|--------|-------------|
| Tokens Input | Input tokens consumed |
| Tokens Output | Output tokens generated |
| Tokens Cached | Cached tokens available |
| Tokens Total | Combined token usage |
| Context Length | Total context window size |
| Context Percentage | Context usage as percentage |

### Custom Widgets

| Widget | Description |
|--------|-------------|
| Custom Text | Static text with emoji support |
| Custom Command | Execute shell commands |
| Separator | Visual separator |
| Flex Separator | Flexible spacing |

## Configuration Options

### Global Options

```json
{
  "defaultPadding": true,
  "defaultSeparator": true,
  "colorInheritance": true,
  "globalBold": false,
  "foregroundColor": "#ffffff",
  "backgroundColor": "#000000"
}
```

### Widget-Specific Options

```json
{
  "widget": "TokensTotal",
  "rawValue": true,
  "color": "#00ff00",
  "bold": true
}
```

## Block Timer

Tracks progress through Claude Code's 5-hour usage blocks.

### Display Modes

| Mode | Description |
|------|-------------|
| time | Time elapsed ("3hr 45m") |
| progress | Full progress bar (32 chars) |
| compact | Compact progress bar (16 chars) |

### Configuration

```json
{
  "widget": "BlockTimer",
  "displayMode": "progress"
}
```

## Custom Command Widget

Execute shell commands that receive Claude Code JSON data via stdin.

### Examples

```bash
# Current directory name
pwd | xargs basename

# Current time
date +%H:%M

# Git commit hash
git rev-parse --short HEAD

# Custom usage metrics
npx -y ccusage@latest statusline
```

### Configuration

```json
{
  "widget": "CustomCommand",
  "command": "git rev-parse --short HEAD",
  "timeout": 1000
}
```

**Note**: Commands timeout after 1000ms by default (configurable).

## Multi-Line Configuration

ccstatusline supports unlimited independent status lines:

```json
{
  "lines": [
    {
      "widgets": ["Model", "GitBranch", "SessionCost"]
    },
    {
      "widgets": ["TokensTotal", "ContextPercentage"]
    }
  ]
}
```

## Powerline Support

Enable Powerline styling with arrow separators:

```json
{
  "powerline": true,
  "powerlineFont": true
}
```

**Requires**: [Powerline fonts](https://github.com/powerline/fonts) installed.

### Windows Installation

```powershell
winget install --id Nerd.Fonts.JetBrainsMono
```

## Configuration File

Settings are stored at: `~/.config/ccstatusline/settings.json`

### Full Example

```json
{
  "lines": [
    {
      "widgets": [
        {
          "type": "Model",
          "color": "#ff6b6b"
        },
        {
          "type": "Separator"
        },
        {
          "type": "GitBranch",
          "color": "#4ecdc4"
        },
        {
          "type": "GitChanges",
          "color": "#ffe66d"
        },
        {
          "type": "FlexSeparator"
        },
        {
          "type": "SessionCost",
          "color": "#95e1d3"
        },
        {
          "type": "ContextPercentage",
          "color": "#f38181"
        }
      ]
    }
  ],
  "powerline": true,
  "defaultPadding": true
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CONFIG_DIR` | Custom config directory path |

## Comparison with Manual Scripts

| Feature | ccstatusline | Manual Script |
|---------|--------------|---------------|
| Setup | TUI configuration | Write code |
| Customization | Widget-based | Unlimited |
| Powerline | Built-in | Manual setup |
| Multi-line | Supported | Complex |
| Dependencies | Bun/Node | Bash/jq |
| Performance | ~10-50ms | ~5-20ms |

### When to Use ccstatusline

- Quick setup without coding
- Standard widget set is sufficient
- Want TUI configuration
- Multi-line status needed
- Powerline styling desired

### When to Use Manual Script

- Full customization control
- Custom data sources (lint status, etc.)
- Peacock/VSCode color integration
- Performance critical
- Complex multi-project awareness

## Related Projects

- [tweakcc](https://github.com/Piebald-AI/tweakcc) - Claude Code theme customization
- [ccusage](https://github.com/ryoppippi/ccusage) - Usage metrics tracker
