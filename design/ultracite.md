# Ultracite - Zero-Config Code Quality for JavaScript/TypeScript

## Overview
Ultracite is a zero-config preset for the Biome formatter/linter that packages an opinionated set of rules, editor integrations, and Git-hook helpers. It enables JavaScript/TypeScript projects to adopt fast, consistent code quality checks without manually tuning every setting.

## Key Features
- **Zero Configuration**: Works out of the box with sensible defaults
- **Lightning Fast**: Built on Biome's Rust-powered engine
- **AI-Ready**: Optimized for use with GitHub Copilot, Cursor, Windsurf, Zed, Claude Code
- **Pre-configured**: Optimized rules for Next.js, React, and TypeScript projects
- **One Command Setup**: Automatic installation of all dependencies and configurations

## Installation

### Automatic Setup (Recommended)
```bash
npx ultracite init
```

This single command:
- Installs Ultracite and Biome
- Configures VS Code settings
- Sets up Git hooks (optional)
- Adds AI assistant rules (optional)

### Manual Setup
```bash
# Install packages
npm install --save-dev ultracite @biomejs/biome

# Create biome.jsonc
echo '{ "extends": ["ultracite"] }' > biome.jsonc

# Add VS Code settings for format on save
```

## Configuration

### Default Settings
- **TypeScript**: Strict mode enforcement
- **React**: JSX + accessibility rules
- **Formatting**: 2-space indent, 80-char line width, single quotes
- **Imports**: Automatic organization and cleanup
- **Environment**: Node.js/Next.js optimized

### Customization
Override rules in `biome.jsonc`:
```json
{
  "extends": ["ultracite"],
  "linter": {
    "rules": {
      "complexity": {
        "noExcessiveCognitiveComplexity": "off"
      }
    }
  }
}
```

### Per-line Suppression
```typescript
// biome-ignore lint/suspicious/noExplicitAny: Legacy code
const data: any = getLegacyData();
```

## Usage

### Editor Integration
- **VS Code**: Automatic formatting on save
- **Problems Panel**: Real-time linting feedback
- **Quick Fixes**: Light bulb suggestions for issues

### CLI Commands
```bash
# Check for issues (no changes)
npx ultracite lint

# Format and fix issues
npx ultracite format
```

### Git Hooks
Pre-commit hook automatically runs formatting on staged files:
```bash
#!/bin/sh
npx ultracite format
```

## AI Assistant Integration

### Editor Rules
During `ultracite init`, you can add rules for:
- GitHub Copilot
- Cursor
- Windsurf
- Zed

These ensure AI-generated code follows your project's style.

### MCP Integration
Expose Ultracite docs to AI assistants via Model Context Protocol:
```json
{
  "mcpServers": {
    "ultracite": {
      "command": "npx",
      "args": ["@ultracite/mcp"]
    }
  }
}
```

## Common Patterns

### Before Ultracite
```javascript
// Unformatted, potential issues
const data=await   fetch(url)
if(data==null) return;
import {unused} from './module'
```

### After Ultracite
```javascript
// Formatted, issues fixed
const data = await fetch(url);
if (data === null) return;
// Unused import removed automatically
```

## Integration with lint-staged
Ultracite can configure lint-staged to run only on staged files:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,json,css,graphql}": ["npx ultracite format"]
  }
}
```

## Troubleshooting

### Common Issues
1. **Not formatting on save**: Check VS Code settings
2. **Conflicts with ESLint/Prettier**: Remove old configs
3. **Ignoring files**: Add patterns to `biome.jsonc`
4. **Strict null checks**: Enable in `tsconfig.json`

### Performance Tips
- Use `.gitignore` patterns in Biome config
- Exclude `node_modules` and build directories
- Run on staged files only in pre-commit hooks

## Why Ultracite?

### vs ESLint + Prettier
- **Single tool** instead of multiple
- **25x faster** formatting
- **15x faster** linting
- **Zero config** vs complex setup

### vs Plain Biome
- **Pre-configured** with best practices
- **Automatic setup** including editor config
- **Git hooks** included
- **AI assistant** integration

## Resources
- [Official Documentation](https://www.ultracite.ai)
- [LLMs.txt](https://www.ultracite.ai/llms.txt) - Complete reference for AI assistants
- [GitHub Repository](https://github.com/haydenbleasel/ultracite)
- [Biome Documentation](https://biomejs.dev)

## Philosophy
"Lightning-fast performance, zero-config by default, but extensible when needed."