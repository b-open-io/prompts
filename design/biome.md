# Biome - Fast Formatter and Linter for Web Projects

## Overview
Biome is a performant toolchain for web projects that combines formatting and linting in a single, fast binary. Written in Rust, it aims to replace ESLint, Prettier, and other tools with a unified solution that's significantly faster.

## Key Features
- **Blazing Fast**: 25x faster formatting than Prettier, 15x faster linting than ESLint
- **All-in-One**: Replace multiple tools with a single binary
- **Language Support**: JavaScript, TypeScript, JSX, TSX, JSON, CSS, GraphQL
- **Prettier Compatible**: 97% compatibility with Prettier formatting
- **ESLint Compatible**: 333+ rules ported from ESLint and TypeScript ESLint
- **No Node.js Required**: Distributed via npm but runs as native binary

## Installation

```bash
# npm
npm install --save-dev @biomejs/biome

# yarn
yarn add --dev @biomejs/biome

# pnpm
pnpm add --save-dev @biomejs/biome

# bun
bun add --dev @biomejs/biome
```

## Quick Start

### Initialize Configuration
```bash
npx @biomejs/biome init
```

This creates a `biome.json` configuration file:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  }
}
```

## Usage

### CLI Commands
```bash
# Format files
npx @biomejs/biome format --write .

# Lint files
npx @biomejs/biome lint .

# Check formatting and linting
npx @biomejs/biome check .

# Apply safe fixes
npx @biomejs/biome check --write .

# CI mode (exit with error code)
npx @biomejs/biome ci .
```

### Editor Integration

#### VS Code
Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) for:
- Format on save
- Inline diagnostics
- Quick fixes
- Code actions

#### Other Editors
- IntelliJ IDEA
- Neovim
- Helix
- Sublime Text
- Emacs

## Configuration

### Formatter Options
```json
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80,
    "attributePosition": "auto"
  }
}
```

### Linter Rules
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraCognitiveComplexity": "error",
        "noVoid": "warn"
      },
      "style": {
        "noParameterAssign": "error",
        "useConst": "error"
      }
    }
  }
}
```

### Organize Imports
```json
{
  "organizeImports": {
    "enabled": true
  }
}
```

## Migration from ESLint/Prettier

### Automatic Migration
```bash
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write
```

### Manual Migration Steps
1. Install Biome
2. Run migration command
3. Remove old dependencies
4. Update package.json scripts
5. Update CI configuration

## Language Support

### Fully Supported
- JavaScript (.js, .mjs, .cjs)
- TypeScript (.ts, .mts, .cts)
- JSX/TSX
- JSON/JSONC
- CSS
- GraphQL

### Partial Support
- Vue (script blocks only)
- Astro (frontmatter and scripts)
- Svelte (script blocks only)

### Not Yet Supported
- HTML
- Markdown
- SCSS/Sass/Less
- YAML

## Performance Comparison

### Formatting Speed
```
Biome:    ~0.05s
Prettier: ~1.25s
dprint:   ~0.10s
```

### Linting Speed
```
Biome:  ~0.15s
ESLint: ~2.25s
```

## Advanced Features

### Ignore Files
```json
{
  "files": {
    "ignore": ["**/dist", "**/node_modules", "**/.next"]
  }
}
```

### VCS Integration
```json
{
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

### JSON Parsing
```json
{
  "json": {
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": true
    }
  }
}
```

## Limitations

### Current Limitations
- No type-aware linting rules (unlike typescript-eslint)
- Limited plugin system compared to ESLint
- Fewer rules than mature ESLint ecosystem
- Configuration only in JSON/JSONC (no JS config)

### Language Coverage
- HTML, Markdown, SCSS not yet supported
- Framework support (Vue, Svelte) is partial
- Some ESLint rules not yet ported

## Best Practices

### Project Setup
1. Use with Ultracite for zero-config experience
2. Enable strict TypeScript checks
3. Configure editor integration
4. Set up pre-commit hooks

### Performance Tips
- Use ignore patterns for generated files
- Run on changed files only in Git hooks
- Use CI mode for automated checks
- Leverage parallel processing

## Comparison with Alternatives

### vs ESLint + Prettier
- **Pros**: Much faster, single tool, consistent configuration
- **Cons**: Fewer rules, less ecosystem, no plugins

### vs Rome (predecessor)
- Biome is the community fork of Rome
- More active development
- Better stability and performance

### vs dprint
- Similar performance
- Biome has integrated linting
- More language support in Biome

## Resources
- [Official Documentation](https://biomejs.dev)
- [GitHub Repository](https://github.com/biomejs/biome)
- [Configuration Schema](https://biomejs.dev/schemas/)
- [Rule Reference](https://biomejs.dev/linter/rules/)
- [Playground](https://biomejs.dev/playground/)

## Philosophy
"One toolchain for your web project" - Format, lint, and more in a fraction of the time.