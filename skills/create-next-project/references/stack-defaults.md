# Stack Defaults

Exact configurations and setup patterns for the core stack.

## Biome Configuration

`create-next-app@latest` with the `--biome` flag scaffolds the project with Biome pre-configured. No manual ESLint removal or `bunx biome init` needed.

After scaffolding, add Tailwind v4 directive support so Biome does not error on `@theme`, `@apply`, and other Tailwind directives. Merge this into the generated `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
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
    "indentStyle": "tab"
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

The `css.parser.tailwindDirectives` setting is required for Tailwind v4 projects using `@theme` blocks, `@apply`, `@variant`, and other Tailwind-specific CSS directives. Without it, Biome will report parse errors on these directives.

After updating biome.json, run `bunx biome check --write .` to fix all files. The project must lint 100% clean at every phase.

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

The `--biome` flag in create-next-app sets up the lint script automatically, but verify it matches the above pattern. Remove any `"lint": "next lint"` if present.
