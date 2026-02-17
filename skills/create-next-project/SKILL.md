---
name: create-next-project
description: This skill should be used when the user asks to "create a new project", "scaffold a Next.js app", "initialize a new app", "start a new project", "set up a new Next.js project", or mentions "create-next-project". Provides an opinionated full-stack Next.js project initialization with Biome, Tailwind v4, shadcn/ui, TanStack Query, better-auth, and Vercel deployment.
version: 1.2.0
---

# Create Next.js Project

Opinionated full-stack Next.js project scaffolding. Single app, App Router, TypeScript, with interactive prompts for auth methods, database, and optional packages.

## Core Stack (Always Included)

- **Next.js** (latest) with App Router, TypeScript, Tailwind v4, `src/` directory
- **Bun** as package manager and runtime
- **Biome** for linting and formatting (manually installed after scaffolding)
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

Execute phases in order. Use `bun` for ALL commands - never `npm`, `npx`, or `yarn`. Each phase ends with a checkpoint that includes a build verification and a git commit.

### Parallelization (Claude Code Agent Teams)

After Phase 1 completes, subsequent phases can be parallelized using agent teams:

- **Agent 1**: UI foundation + layout (Phases 2 + 3)
- **Agent 2**: Data layer setup (Phase 4) -- if Convex, creates the stub files that Agent 3 needs
- **Agent 3**: Auth setup (Phase 5) -- depends on Phase 4 completing first for Convex `_generated/` stubs

Provide each agent with thorough context since they lack conversation history. If not using agent teams, execute phases sequentially.

---

### Phase 1: Scaffold

Scaffold the project with create-next-app. Note: `create-next-app` does NOT have a `--biome` flag. It installs ESLint by default, which we remove and replace with Biome manually.

```bash
bunx create-next-app@latest <project-name> \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-bun --turbopack --yes
cd <project-name>
```

**Replace ESLint with Biome:**

1. Remove ESLint and its config:
```bash
bun remove eslint eslint-config-next
rm -f eslint.config.mjs
```

2. Install Biome:
```bash
bun add -d @biomejs/biome
```

3. Create `biome.json` with the Biome 2.x config:
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

Key Biome 2.x notes:
- `organizeImports` is under `assist.actions.source`, NOT the old `organizeImports.enabled` top-level key
- There is NO `files.ignore` key. Use negation patterns in `files.includes` (e.g., `"!src/components/ui"`)
- Folder ignores do NOT use trailing `/**` (since Biome 2.2.0). Just `"!foldername"`
- `vcs.useIgnoreFile: true` respects `.gitignore` so `.next/` is auto-excluded
- `css.parser.tailwindDirectives: true` is required for Tailwind v4 (`@theme`, `@apply`, `@variant` directives)
- `src/components/ui` is excluded because shadcn generates those components
- `.claude` directory is excluded because it has its own formatting conventions

4. Auto-fix all files:
```bash
bunx biome check --write .
```

The project must lint 100% clean at every checkpoint.

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

Initialize git and verify:
```bash
git init
bun run build
bun run lint
```

> **CHECKPOINT 1**: `git add . && git commit -m "Initial Next.js scaffold with Biome"`

---

### Phase 2: UI Foundation

Initialize shadcn/ui (use `--defaults` to skip interactive prompts):
```bash
bunx shadcn@latest init --defaults
```

Install the dashboard block as the app shell:
```bash
bunx shadcn@latest add dashboard-01
```

IMPORTANT: The dashboard block creates example components AND a `src/app/dashboard/` route. After extracting the layout structure (sidebar/navbar + content area):
1. Restructure into the single-layout pattern described in `references/layout-architecture.md`
2. **Delete `src/app/dashboard/`** to avoid a dead route -- the layout components are used in the root `(app)/layout.tsx`, not at a separate `/dashboard` path

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

> **CHECKPOINT 2**: `git add . && git commit -m "Add shadcn/ui and theme support"`

---

### Phase 3: Layout Architecture

CRITICAL: Follow `references/layout-architecture.md` exactly.

- One root layout with navbar/sidebar from dashboard-01
- Content area renders `{children}` from route segments
- Navigation uses Next.js `<Link>` components
- Active route highlighting in navbar
- NO component tree restating across routes
- Each route is a `page.tsx` that renders only its unique content

Verify: `bun run build` should pass.

> **CHECKPOINT 3**: `git add . && git commit -m "Set up layout architecture"`

---

### Phase 4: Data Layer

Install TanStack Query:
```bash
bun add @tanstack/react-query
```

Set up the QueryClientProvider. See `references/tanstack-query-setup.md` for:
- Provider wrapping in root layout
- Custom hook patterns for data fetching
- ALL client-side data fetching must go through TanStack Query - no raw `fetch` in components

Install the selected database adapter and configure the connection.

#### Convex-Specific Setup

If Convex is the selected database:

```bash
bun add convex @convex-dev/better-auth
bunx convex init
```

**Create `convex/convex.config.ts`** -- required when using Convex components like `@convex-dev/better-auth`:

```typescript
import betterAuth from "@convex-dev/better-auth/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);

export default app;
```

**Create `convex/_generated/` stubs** so the project builds before a Convex deployment exists. Running `bunx convex init` without a deployment does NOT create the `_generated/` directory, and imports from `convex/_generated/api` will fail at build time.

Create these stub files:

`convex/_generated/api.d.ts`:
```typescript
import type { AnyApi } from "convex/server";
declare const api: AnyApi;
declare const internal: AnyApi;
export { api, internal };
```

`convex/_generated/api.js`:
```javascript
import { anyApi } from "convex/server";
export const api = anyApi;
export const internal = anyApi;
```

`convex/_generated/server.d.ts`:
```typescript
export {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "convex/server";
```

`convex/_generated/server.js`:
```javascript
export {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "convex/server";
```

`convex/_generated/dataModel.d.ts`:
```typescript
import type { GenericDataModel } from "convex/server";
export type DataModel = GenericDataModel;
```

These stubs get overwritten on first `bunx convex dev`. They exist solely to unblock `bun run build` before a deployment is created.

> **CHECKPOINT 4**: **STOP** -- Before continuing, the user must:
> 1. Create a Convex deployment: `bunx convex dev` (sets up the project in Convex dashboard)
> 2. Create a Vercel project: `bunx vercel link` (connects the local directory)
> 3. Set env vars on Vercel: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`
>
> If not using Convex, just verify `bun run build` passes and commit.
>
> `git add . && git commit -m "Add data layer"`

---

### Phase 5: Authentication

Install better-auth:
```bash
bun add better-auth
```

Install auth UI blocks:
```bash
bunx shadcn@latest add login-05 signup-05
```

Configure based on user's auth method selections. See `references/auth-setup.md` for per-provider patterns.

#### Convex Auth Route Handler (Lazy Initialization)

When using Convex as the database with `@convex-dev/better-auth`, the auth route handler at `src/app/api/auth/[...all]/route.ts` **MUST use lazy initialization**. The `convexBetterAuthNextJs` function throws eagerly at import time if `NEXT_PUBLIC_CONVEX_URL` or `NEXT_PUBLIC_CONVEX_SITE_URL` are not set. This causes build failures in CI/CD and local builds where env vars are not yet configured.

```typescript
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

function createHandler() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!convexUrl || !convexSiteUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL must be set",
    );
  }
  return convexBetterAuthNextJs({ convexUrl, convexSiteUrl }).handler;
}

export const GET = async (req: Request) => {
  const { GET } = createHandler();
  return GET(req);
};

export const POST = async (req: Request) => {
  const { POST } = createHandler();
  return POST(req);
};
```

This pattern defers env var access to request time instead of module evaluation time, so the build succeeds even without env vars.

#### Wiring Auth Pages

Wire login/signup pages into the layout using route groups:
- `(auth)/login/page.tsx` - renders login-05 block
- `(auth)/signup/page.tsx` - renders signup-05 block
- `(auth)/layout.tsx` - centered layout without navbar

Set up middleware for protected routes.

Verify: `bun run build` should pass.

> **CHECKPOINT 5**: `git add . && git commit -m "Add authentication"`

---

### Phase 6: Optional Packages

Install packages based on user selections. Add appropriate configuration files and update CLAUDE.md references.

---

### Phase 7: Project Configuration

Create `.claude/` directory with:
- `CLAUDE.md` referencing selected skills, project conventions, and commands
- `settings.json` if needed

Create `.env.vercel` with ALL env vars the project needs (known defaults pre-filled, unknowns left empty). This file is committed to the repo and imported into Vercel during setup. Add a `.gitignore` exception for it:

```gitignore
# env files
.env*
!.env.vercel
```

The `.env.vercel` should include comments explaining where to get each value. Example:
```bash
# Vercel Environment Variables
# Import: Settings > Environment Variables > Import .env

# Database - get from your provider dashboard
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Link to Vercel (if not already done in Phase 4):
```bash
bunx vercel link
```

Create GitHub repo and push:
```bash
git add .
git commit -m "Add project configuration"
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
- **Manual Biome setup** - `create-next-app` does NOT have a `--biome` flag. Remove ESLint after scaffolding, install `@biomejs/biome`, and create `biome.json` manually
- **Biome 2.x config** - use `assist.actions.source.organizeImports`, negation patterns in `files.includes` (no `files.ignore`), and `css.parser.tailwindDirectives: true` for Tailwind v4
- **No non-null assertions** - Biome's recommended rules flag `process.env.FOO!` as `noNonNullAssertion`. Always validate env vars explicitly and throw an informative error instead. Example:
  ```typescript
  // WRONG - Biome error
  const url = process.env.DATABASE_URL!;

  // RIGHT - validate and throw
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  ```
- **CLIs first** - use `create-next-app`, `shadcn`, `biome`, `vercel`, `gh` CLIs. Prefer CLI initialization over manual file creation
- **Biome defaults** - no custom rules, lint 100% clean at every checkpoint
- **TanStack Query for ALL frontend requests** - no raw fetch in components
- **Single layout** - navbar persists, routes swap content area only
- **Latest versions** - always `@latest` for all installations
- **No deployment on scaffold** - git push triggers Vercel deploy automatically
- **Build verification** - run `bun run build` at every checkpoint
- **Lazy handler initialization** - auth route handlers that depend on env vars must defer access to request time, not module evaluation time, to avoid build crashes
- **Explicit return types on cron actions** - when Convex cron jobs reference `internal.moduleName.functionName`, the module's action handlers must have explicit return type annotations to avoid circular type references between the cron module and the action module

## Convex Pitfalls

These are common issues when using Convex as the data layer:

1. **Missing `_generated/` stubs** -- `bunx convex init` without a deployment does not create `convex/_generated/`. Create stub files (see Phase 4) so the build passes before first deployment.

2. **Missing `convex.config.ts`** -- required when using Convex components like `@convex-dev/better-auth`. Without it, the component is not registered and Convex will fail at deploy time.

3. **Auth handler eager initialization** -- `convexBetterAuthNextJs()` throws at import time if env vars are missing. Use the lazy initialization pattern (see Phase 5).

4. **Circular type references in cron jobs** -- when `convex/crons.ts` references `internal.someModule.someAction`, and that module's return type depends on the `internal` type (which includes the cron module), TypeScript gets a circular reference. Fix by adding explicit return type annotations (`Promise<void>`, `Promise<string>`, etc.) to the action handlers referenced by crons.

5. **Env var mismatch: dev vs production** -- `bunx convex env set` targets the dev deployment by default. Always use `--prod` for production: `bunx convex env set VAR_NAME "value" --prod`.

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
