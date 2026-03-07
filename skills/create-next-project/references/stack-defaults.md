# Stack Defaults

Exact configurations and setup patterns for the core stack.

## Biome Configuration

`create-next-app` does NOT have a `--biome` flag. It installs ESLint by default. After scaffolding, manually remove ESLint and replace with Biome:

```bash
bun remove eslint eslint-config-next
rm -f eslint.config.mjs
bun add -d @biomejs/biome
```

Create `biome.json` with the Biome 2.x config:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["**", "!src/components/ui", "!.claude"]
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

Biome 2.x differences from 1.x:
- `organizeImports` is now under `assist.actions.source`, NOT the old `organizeImports.enabled` top-level key
- There is NO `files.ignore` key. Use negation patterns in `files.includes` (e.g., `"!src/components/ui"`)
- Folder ignores do NOT use trailing `/**` (since Biome 2.2.0). Just `"!foldername"`
- `vcs.useIgnoreFile: true` respects `.gitignore` so `.next/` is auto-excluded
- `src/components/ui` is excluded because shadcn generates those components
- `.claude` directory is excluded because it has its own formatting conventions

The `css.parser.tailwindDirectives` setting is required for Tailwind v4 projects using `@theme` blocks, `@apply`, `@variant`, and other Tailwind-specific CSS directives. Without it, Biome will report parse errors on these directives.

After creating biome.json, run `bunx biome check --write .` to fix all files. The project must lint 100% clean at every phase.

## Theme Provider (next-themes)

Create `src/components/theme-provider.tsx`:

```tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

Wrap in root layout `src/app/layout.tsx`:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

Add a theme toggle component using shadcn's dropdown-menu:

```bash
bunx shadcn@latest add dropdown-menu
```

Create `src/components/theme-toggle.tsx` with a Sun/Moon icon button that switches between light, dark, and system themes.

## Tailwind v4

Tailwind v4 is configured automatically by `create-next-app@latest` with `--tailwind`. No additional setup needed. The `src/app/globals.css` file contains the `@import "tailwindcss"` directive.

shadcn/ui init will add CSS variables for theming. tweakcn themes (installed via `bunx shadcn@latest add <tweakcn-url>`) customize these.

## shadcn/ui v4

shadcn CLI v4 (March 2026) adds presets, safety flags, and structured output.

### Presets
Available built-in presets: `nova`, `vega`, `maia`, `lyra`, `mira`. Each encodes a full design system (base library, style, colors, fonts, radius).

```bash
# Init with a named preset
bunx shadcn@latest init --preset nova --yes

# Init with a custom preset code from ui.shadcn.com/create
bunx shadcn@latest init --preset adtk27v --yes

# Switch preset on existing project (re-init)
bunx shadcn@latest init --preset maia --force --yes
```

### Base Library Choice
`--base radix` (default) uses Radix UI primitives. `--base base` uses Base UI. The `style` field in `components.json` reflects both: e.g., `radix-nova` or `base-nova`.

### Safety Flags (for agents and humans)
```bash
bunx shadcn@latest add button --dry-run        # Preview without writing
bunx shadcn@latest add button --dry-run --diff  # Show exact diffs
bunx shadcn@latest add button --view            # View file contents
```

### Project Inspection
```bash
bunx shadcn@latest info --json   # Structured project config (LLM-friendly)
bunx shadcn@latest docs button --json  # Component API docs as JSON
```

### components.json (v4 shape)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

New v4 fields: `menuColor`, `menuAccent`, `registries` (for namespaced third-party registries).

## package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```

Since ESLint was replaced manually, update the lint scripts to use Biome. Remove any `"lint": "next lint"` if present and replace with the above pattern.
