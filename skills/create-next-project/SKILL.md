---
name: create-next-project
description: This skill should be used when the user asks to "create a new project", "scaffold a Next.js app", "initialize a new app", "start a new project", "set up a new Next.js project", or mentions "create-next-project". Provides an opinionated full-stack Next.js project initialization with Biome, Tailwind v4, shadcn/ui, TanStack Query, better-auth, and Vercel deployment.
version: 1.1.0
---

# Create Next.js Project

Opinionated full-stack Next.js project scaffolding. Single app, App Router, TypeScript, with interactive prompts for auth methods, database, and optional packages.

## Core Stack (Always Included)

- **Next.js** (latest) with App Router, TypeScript, Tailwind v4, `src/` directory
- **Bun** as package manager and runtime
- **Biome** for linting and formatting (via `create-next-app --biome` flag)
- **shadcn/ui** with dashboard-01 block as app shell
- **tweakcn** for theme customization (web editor at tweakcn.com)
- **next-themes** for light/dark mode
- **TanStack Query** for all client-side data fetching
- **better-auth** for authentication
- **Vercel** for deployment

## Interactive Prompts

Before scaffolding, prompt the user for each of these decisions. Use AskUserQuestion with multiple-choice options.

### Required Prompts

1. **Project name** - free text, lowercase-hyphenated
2. **Auth methods** (multi-select):
   - Email/password (recommended default)
   - OAuth providers (Google, GitHub, Apple)
   - Sigma/Bitcoin auth (BSV-enabled apps)
   - Passkeys/WebAuthn
3. **Database**:
   - Convex (real-time, serverless)
   - Turso/libSQL (edge SQLite)
   - PostgreSQL (traditional)
   - SQLite (local development)
4. **Optional packages** (multi-select):
   - `@ai-sdk/openai` + `ai` - AI/agent features
   - `@bsv/sdk` - BSV blockchain
   - `@1sat-lexi/js` - 1Sat Ordinals
   - `clawnet` - ClawNet agent platform
   - `resend` - Transactional email
   - None
5. **Skills to reference in CLAUDE.md** (multi-select from installed plugins):
   - List available skills from user's installed plugins
   - Always include `vercel-react-best-practices` and `vercel-composition-patterns`

## Step 0: Invoke Required Skills

BEFORE doing any scaffolding work, invoke these skills to load their guidance into context:

1. `Skill(vercel-react-best-practices)` - React/Next.js optimization rules
2. `Skill(vercel-composition-patterns)` - Component composition patterns
3. `Skill(better-auth-best-practices)` - Auth integration patterns

Apply their guidance throughout all phases. These skills inform architecture decisions, component structure, and data fetching patterns used during setup.

## Execution Flow

Execute phases in order. Use `bun` for ALL commands - never `npm`, `npx`, or `yarn`. Run `bun run build` after phases 2, 4, and 7 to catch issues early.

### Phase 1: Scaffold

The `--biome` flag tells create-next-app to use Biome instead of ESLint. No manual ESLint removal needed.

```bash
bunx create-next-app@latest <project-name> \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-bun --biome --turbopack --yes
cd <project-name>
```

After scaffolding, add Tailwind v4 directive support to biome.json so Biome does not error on `@theme` and other Tailwind directives:

```json
{
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  }
}
```

Merge this into the existing biome.json that create-next-app generated.

Then run `bunx biome check --write .` to auto-fix all files. The project must lint 100% clean at every checkpoint.

Update `package.json` scripts:
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

### Phase 2: UI Foundation

Initialize shadcn/ui (use `--defaults` to skip interactive prompts):
```bash
bunx shadcn@latest init --defaults
```

Install the dashboard block as the app shell:
```bash
bunx shadcn@latest add dashboard-01
```

IMPORTANT: The dashboard block creates example components. Extract the layout structure (sidebar/navbar + content area) but do NOT keep the example dashboard content as-is. Restructure into the single-layout pattern described in `references/layout-architecture.md`.

Install next-themes for dark mode:
```bash
bun add next-themes
```

Set up theme provider wrapping the app. See `references/stack-defaults.md` for the ThemeProvider pattern.

**tweakcn theme customization:**

tweakcn is a web-based theme editor at [tweakcn.com](https://tweakcn.com). Users pick a theme visually, then install it via a shadcn registry URL.

Prompt the user: "Pick a theme at tweakcn.com and paste the registry URL, or skip to use the default shadcn theme."

If the user provides a tweakcn URL, install it:
```bash
bunx shadcn@latest add <tweakcn-theme-url>
```

If skipped, proceed with the default shadcn theme.

Verify: `bun run build` should pass.

### Phase 3: Layout Architecture

CRITICAL: Follow `references/layout-architecture.md` exactly.

- One root layout with navbar/sidebar from dashboard-01
- Content area renders `{children}` from route segments
- Navigation uses Next.js `<Link>` components
- Active route highlighting in navbar
- NO component tree restating across routes
- Each route is a `page.tsx` that renders only its unique content

### Phase 4: Authentication

Install better-auth:
```bash
bun add better-auth
```

Install auth UI blocks:
```bash
bunx shadcn@latest add login-05 signup-05
```

Configure based on user's auth method selections. See `references/auth-setup.md` for per-provider patterns.

Wire login/signup pages into the layout using route groups:
- `(auth)/login/page.tsx` - renders login-05 block
- `(auth)/signup/page.tsx` - renders signup-05 block
- `(auth)/layout.tsx` - centered layout without navbar

Set up middleware for protected routes.

Verify: `bun run build` should pass.

### Phase 5: Data Layer

Install TanStack Query:
```bash
bun add @tanstack/react-query
```

Set up the QueryClientProvider. See `references/tanstack-query-setup.md` for:
- Provider wrapping in root layout
- Custom hook patterns for data fetching
- ALL client-side data fetching must go through TanStack Query - no raw `fetch` in components

Install the selected database adapter and configure the connection.

### Phase 6: Optional Packages

Install packages based on user selections. Add appropriate configuration files and update CLAUDE.md references.

### Phase 7: Project Configuration

Create `.claude/` directory with:
- `CLAUDE.md` referencing selected skills, project conventions, and commands
- `settings.json` if needed

Initialize git:
```bash
git init
git add .
git commit -m "Initial project scaffold"
```

Link to Vercel (do NOT deploy - pushing to GitHub handles that):
```bash
bunx vercel link
```

Create GitHub repo and push:
```bash
gh repo create <project-name> --private --source=. --remote=origin --push
```

### Phase 8: Verification

```bash
bun run build
bun run lint
bun dev
```

Confirm the dev server starts, dashboard layout renders, auth pages load, and theme toggle works.

## Key Principles

- **Bun everywhere** - never npm, npx, or yarn. Use `bun`, `bunx` for everything
- **`--biome` flag** - create-next-app natively supports Biome, no manual ESLint removal needed
- **tailwindDirectives** - always add `css.parser.tailwindDirectives: true` to biome.json for Tailwind v4 compatibility
- **CLIs first** - use `create-next-app`, `shadcn`, `biome`, `vercel`, `gh` CLIs. Prefer CLI initialization over manual file creation
- **Biome defaults** - no custom rules, lint 100% clean at every checkpoint
- **TanStack Query for ALL frontend requests** - no raw fetch in components
- **Single layout** - navbar persists, routes swap content area only
- **Latest versions** - always `@latest` for all installations
- **No deployment on scaffold** - git push triggers Vercel deploy automatically
- **Build verification** - run `bun run build` at key checkpoints

## Additional Resources

### Reference Files

- **`references/stack-defaults.md`** - Exact configs for Biome, theme provider, Tailwind, shadcn
- **`references/layout-architecture.md`** - Single-layout pattern with navbar and route-based content
- **`references/auth-setup.md`** - better-auth setup per provider (email, OAuth, Sigma, passkeys)
- **`references/tanstack-query-setup.md`** - Provider setup, custom hooks, server prefetching patterns

### Related Skills

- **`vercel-react-best-practices`** - 57 React/Next.js optimization rules
- **`vercel-composition-patterns`** - Component composition for scalable apps
- **`frontend-design`** - UI design avoiding generic aesthetics
- **`better-auth-best-practices`** - Auth integration patterns
