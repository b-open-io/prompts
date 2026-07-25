# Build Team — Agent Responsibilities

Full per-agent breakdown for Step 4 (Dispatch Build Team) of the main workflow. Create an agent team (using `TeamCreate`) with these specialized agents. Provide each agent with FULL context from Step 2 answers and Step 3 research results.

## Team structure

**Agent 1: UI + Layout + Theme** (Phases 2-3)
Responsibilities:
- `bunx shadcn@latest init --preset nova --yes` (or use the user's chosen preset from Step 2)
- If user provided a preset code from ui.shadcn.com/create, use `--preset <code>` instead
- ```bash
  # If user chose Base UI instead of Radix
  bunx shadcn@latest init --base base --preset nova --yes
  ```
- `bunx shadcn@latest add dashboard-01`
- Install tweakcn theme if URL provided
- `bun add next-themes`
- Set up ThemeProvider (see `references/stack-defaults.md`)
- Restructure into single-layout pattern (see `references/layout-architecture.md`)
- Delete `src/app/dashboard/` (dead route from dashboard-01 block)
- Create route group structure: `(app)/`, `(auth)/`
- Run `bun run build` and `bun run lint` to verify
- Commit: `"Add UI foundation and layout architecture"`

**Agent 2: Data Layer** (Phase 4)
Responsibilities depend on database choice:

*If Convex:*
- `bun add convex`
- `bunx convex init` (creates `convex/` directory)
- Create `convex/_generated/` stub files so build passes pre-deployment (see `references/database-provisioning.md`)
- Create `convex/schema.ts` based on project needs
- Create query/mutation files
- NO TanStack Query -- Convex replaces it entirely
- Create `src/components/convex-provider.tsx`
- Run `bun run build` to verify
- Commit: `"Add Convex data layer"`

*If other databases:*
- Install TanStack Query: `bun add @tanstack/react-query`
- Optionally: `bun add -d @tanstack/react-query-devtools`
- Set up QueryProvider (see `references/tanstack-query-setup.md`)
- Install database adapter (Turso, pg, etc.)
- Run `bun run build` to verify
- Commit: `"Add data layer"`

**Agent 3: Auth** (Phase 5 -- depends on Agent 2 completing first if Convex)
Responsibilities:
- `bun add better-auth`
- If Convex: `bun add @convex-dev/better-auth` + create `convex/convex.config.ts`
- If Sigma: `bun add @sigma-auth/better-auth-plugin`
- `bunx shadcn@latest add login-05 signup-05`
- Configure server auth (`convex/auth.ts` or `src/lib/auth.ts`)
- Configure client auth (`src/lib/auth-client.ts`)
- Create API route handler (`src/app/api/auth/[...all]/route.ts`) -- use lazy initialization pattern for Convex
- Create callback page if using OAuth
- Create login/signup pages wired to auth client
- Set up middleware for protected routes
- Run `bun run build` to verify
- Commit: `"Add authentication"`

**Agent 4: Config + Optional Packages** (Phase 6-7)
Responsibilities:
- Install optional packages from user selections
- Create `.claude/CLAUDE.md` with project conventions, commands, selected skills
- Create `.env.vercel` with ALL env vars the project needs (see `references/deployment-workflow.md`)
- Add `.gitignore` exception for `.env.vercel`
- Run `bun run build` and `bun run lint` final check
- Commit: `"Add project configuration and optional packages"`

## Agent coordination

- Agent 1 (UI) and Agent 2 (Data) can run in parallel
- Agent 3 (Auth) must wait for Agent 2 to complete (needs data layer stubs/config)
- Agent 4 (Config) runs after all others complete (needs to know all env vars)

## What to tell each agent

Every agent MUST receive:
1. The project path
2. The user's answers from Step 2
3. The relevant research results from Step 3
4. The specific reference file contents they need
5. The Biome 2.x rules (no non-null assertions, etc.)
6. Instruction to run `bun run build` and `bun run lint` before committing
7. Instruction to commit their work with a descriptive message
