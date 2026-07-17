---
name: create-next-project
description: This skill should be used when the user asks to "create a new project", "scaffold a Next.js app", "initialize a new app", "start a new project", "set up a new Next.js project", or mentions "create-next-project". Provides a guided, opinionated full-stack Next.js project initialization with Biome, Tailwind v4, shadcn/ui, better-auth, and Vercel deployment. Uses agent teams for parallel execution.
version: 2.0.3
---

# Create Next.js Project

Guided full-stack Next.js project scaffolding. Six interactive steps that scaffold, configure, and deploy a production-ready app using agent teams for parallel execution.

## Core Stack (Always Included)

- **Next.js** (latest) with App Router, TypeScript, Tailwind v4, `src/` directory
- **Bun** as package manager and runtime
- **Biome** for linting and formatting (manually installed after scaffolding)
- **shadcn/ui** with dashboard-01 block as app shell
- **tweakcn** for theme customization (web editor at tweakcn.com)
- **next-themes** for light/dark mode
- **better-auth** for authentication
- **Vercel** for deployment

## Data Layer (depends on database choice)

- **Convex** selected: Use Convex's built-in `useQuery`/`useMutation` for all client data. NO TanStack Query needed.
- **All other databases**: Install TanStack Query for client-side data fetching.

---

## Step 0: Load Skills

BEFORE any work, invoke these skills to load guidance into context:

1. `Skill(vercel-react-best-practices)` - React/Next.js optimization rules
2. `Skill(vercel-composition-patterns)` - Component composition patterns
3. `Skill(better-auth-best-practices)` - Auth integration patterns

Apply their guidance throughout all steps.

---

## Step 1: Scaffold + Git + Repo

This step gets the bare project on disk and into version control.

### 1a. Scaffold

If the target directory already has files (e.g., a `.claude/` directory), move them to `/tmp` first, scaffold, then move them back.

`create-next-app` now has a `--biome` flag (its interactive prompt asks "Which linter would you like to use? ESLint / Biome / None") -- pass it directly instead of scaffolding with ESLint and removing it afterward:

```bash
bunx create-next-app@latest <project-name> \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-bun --turbopack --biome --yes
cd <project-name>
```

### 1b. Align biome.json with house config

The generated `biome.json` is a reasonable default, but overwrite it with the house config -- see `references/stack-defaults.md` for the exact JSON and the full list of Biome 2.x rule differences (organizeImports location, no `files.ignore`, folder ignore syntax, `css.parser.tailwindDirectives`).

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

Auto-fix all files:
```bash
bunx biome check --write .
```

### 1c. Git init + verify

```bash
git init
bun run build
bun run lint
git add .
git commit -m "Initial Next.js scaffold with Biome"
```

### 1d. Ask about repo

Prompt the user with 3 options:

1. **Create new GitHub repo** -- list available orgs with `gh org list`, ask the user which one, then run `gh repo create <org>/<name> --private --source=. --remote=origin` (do NOT push yet). Never guess the org name from conversation -- always look it up.
2. **Use existing remote** -- ask for the remote URL, then `git remote add origin <url>` (do NOT push yet)
3. **Skip for now** -- continue without remote

**IMPORTANT: Do NOT push to GitHub yet.** Pushing triggers a Vercel deploy, and the deploy will fail if the database isn't provisioned. The first push happens in Step 6 after all infrastructure is set up.

---

## Step 2: Ask All Project Questions

Now that the scaffold exists, gather ALL requirements in one round. Use `AskUserQuestion` with multiple questions.

### Questions to ask:

1. **Auth methods** (multi-select):
   - Email/password (recommended default)
   - OAuth providers (Google, GitHub, Apple)
   - Sigma/Bitcoin auth (BSV-enabled apps)
   - Passkeys/WebAuthn

2. **Database**:
   - Convex (real-time, serverless) -- NOTE: replaces TanStack Query with Convex's own client
   - Turso/libSQL (edge SQLite)
   - PostgreSQL (traditional)
   - SQLite (local development)

3. **Optional packages** (multi-select):
   - `@ai-sdk/openai` + `ai` - AI/agent features
   - `@bsv/sdk` - BSV blockchain
   - `@1sat-lexi/js` - 1Sat Ordinals
   - `@1sat/connect` + `@1sat/react` - 1Sat wallet integration
   - `clawnet` - ClawNet agent platform
   - `resend` - Transactional email
   - None

4. **Theme**: "Pick a preset (nova, vega, maia, lyra, mira), create a custom one at ui.shadcn.com/create, or pick a theme at tweakcn.com and paste the registry URL."

5. **Skills to reference in CLAUDE.md** (multi-select from installed plugins):
   - List available skills
   - Always include `vercel-react-best-practices` and `vercel-composition-patterns`

Record all answers -- they inform the research agents and build team.

---

## Step 3: Dispatch Research Agents

Send **parallel research agents** (using the Agent tool with `run_in_background: true`) to gather context for each build workstream. Each agent reads relevant source code, docs, or skills so the build agents have everything they need.

### Agent assignments (run simultaneously):

**Research Agent 1: UI + Layout**
- Read `references/layout-architecture.md` and `references/stack-defaults.md`
- If user provided a tweakcn URL, note it for the build agent
- If the project has specific layout needs (e.g., Discord-like, dashboard), research the pattern

**Research Agent 2: Auth**
- Read `references/auth-setup.md`
- Invoke relevant auth skills based on user selections:
  - Sigma: `Skill(sigma-auth:setup-convex)` or `Skill(sigma-auth:setup-nextjs)`
  - Passkeys: read better-auth passkey docs
  - OAuth: note required env vars per provider
- If using Convex, research the `@convex-dev/better-auth` adapter pattern

**Research Agent 3: Data Layer**
- If Convex: invoke `Skill(convex-best-practices)`, read Convex schema patterns
- If Turso/PostgreSQL/SQLite: read `references/tanstack-query-setup.md`
- If the project has an existing data model or old project to port from, read those source files
- Identify all env vars the data layer needs

**Research Agent 4: Optional Packages** (only if user selected packages)
- Research configuration needs for each selected package
- Identify env vars, provider setup, and integration patterns

Wait for all research agents to complete before Step 4.

---

## Step 4: Dispatch Build Team

Create an agent team (using `TeamCreate`) with specialized agents. Provide each agent with FULL context from Step 2 answers and Step 3 research results.

### Team structure:

- **Agent 1: UI + Layout + Theme** (Phases 2-3) -- shadcn init, dashboard-01 block, theme provider, single-layout restructure
- **Agent 2: Data Layer** (Phase 4) -- Convex or TanStack Query setup depending on database choice
- **Agent 3: Auth** (Phase 5, waits for Agent 2) -- better-auth server/client config, login/signup pages, middleware
- **Agent 4: Config + Optional Packages** (Phases 6-7, waits for all others) -- optional packages, `.claude/CLAUDE.md`, `.env.vercel`, final build/lint check

### Agent coordination:
- Agent 1 (UI) and Agent 2 (Data) can run in parallel
- Agent 3 (Auth) must wait for Agent 2 to complete (needs data layer stubs/config)
- Agent 4 (Config) runs after all others complete (needs to know all env vars)

Every agent MUST receive the project path, the Step 2 answers, the relevant Step 3 research, the specific reference file contents they need, the Biome 2.x rules (no non-null assertions, etc.), and instructions to run `bun run build` + `bun run lint` before committing with a descriptive message.

See `references/build-team.md` for the exact command-by-command responsibilities of each agent.

---

## Step 5: Provision Database via Vercel

After all agents complete and the build passes locally, provision the database BEFORE the first deploy. Deploying without a database creates broken deployments and can cause duplicate/disconnected database instances.

This is a human-in-the-loop sequence: the user creates the Vercel project and adds storage themselves (the agent should NOT create the Vercel project). Then link the local project with `vercel link`, pull env vars with `vercel env pull`, and complete database-specific setup -- Convex requires walking through a 4-step guide via the Vercel Marketplace integration; Turso/PostgreSQL/SQLite are simpler CLI or dashboard steps.

See `references/database-provisioning.md` for the full step-by-step (Vercel project + storage setup, linking, env pull, and per-database configuration for Convex/Turso/PostgreSQL/SQLite), the Convex `_generated/` stub files, and the complete list of Convex-specific pitfalls.

---

## Step 6: First Deploy + Ongoing Workflow

Once the database is provisioned and env vars are set, push to trigger the first deploy:

```bash
git push -u origin main
```

Or if the user hasn't set up a GitHub remote yet, list orgs with `gh org list`, ask the user which one, then `gh repo create <org>/<name> --private --source=. --remote=origin --push`.

Ongoing development runs two terminals: `bunx convex dev` (if using Convex, pushes to the dev deployment) alongside `bun dev` (Next.js, connects to dev Convex via `.env.local`). Production connects to the production Convex deployment via `convex deploy` during the Vercel build -- dev and production have separate data, env vars, and function code.

After deploy, verify the app loads without client errors, auth works, and the theme toggle works. Run `Skill(react-doctor)` and `bun run lint` and fix everything flagged -- a brand-new project should score 100, not just "pass".

See `references/deployment-workflow.md` for the full first-deploy sequence, the two-terminal dev workflow, the dev-vs-production comparison table, the complete verification checklist, and the `.env.vercel` file pattern (create this file in Step 1/4 with ALL env vars the project needs, committed to the repo as a `.gitignore` exception).

---

## Key Principles

- **Bun everywhere** -- never npm, npx, or yarn. Use `bun`, `bunx` for everything
- **Scaffold with `--biome` directly** -- `create-next-app` has a `--biome` flag now; pass it at scaffold time instead of removing ESLint afterward. Still overwrite the generated `biome.json` with the house config
- **Biome 2.x config** -- `assist.actions.source.organizeImports`, negation patterns in `files.includes` (no `files.ignore`), `css.parser.tailwindDirectives: true`
- **react-doctor to 100** -- run `Skill(react-doctor)` before calling the project done. A new project has no excuse for anything less than a 100 score
- **No non-null assertions** -- Biome flags `process.env.FOO!`. Always validate env vars and throw informatively:
  ```typescript
  // WRONG
  const url = process.env.DATABASE_URL!;
  // RIGHT
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  ```
- **Lazy handler initialization** -- auth route handlers that depend on env vars must defer to request time, not module evaluation time
- **Explicit return types on cron actions** -- avoids circular type references
- **Convex replaces TanStack Query** -- when using Convex, use `useQuery`/`useMutation` from `convex/react`. Do NOT install TanStack Query.
- **CLIs first** -- use `create-next-app`, `shadcn`, `biome`, `vercel`, `gh` CLIs
- **shadcn v4 safety flags** -- use `--dry-run` and `--diff` when iterating on component additions to preview changes before applying
- **Latest versions** -- always `@latest` for all installations
- **Build verification** -- run `bun run build` at every commit checkpoint
- **No push before database** -- NEVER push to GitHub before the database is provisioned via Vercel Storage. Pushing triggers a Vercel deploy that will fail without a connected database, creating broken deployments and potentially duplicate disconnected database instances
- **Agent teams** -- in Claude Code, use `TeamCreate` to parallelize Phases 2-7. Provide each agent thorough context since they lack conversation history.

## Additional Resources

### Reference Files

- **`references/stack-defaults.md`** -- read when configuring Biome, the theme provider, Tailwind, or shadcn/ui; exact configs, presets, and safety flags
- **`references/layout-architecture.md`** -- read when restructuring the dashboard-01 block into the single-layout pattern (navbar/sidebar shell + route content)
- **`references/auth-setup.md`** -- read when wiring better-auth for any auth method (email/password, OAuth, Sigma, passkeys) or database adapter
- **`references/tanstack-query-setup.md`** -- read when setting up the data layer for non-Convex projects (provider, custom hooks)
- **`references/build-team.md`** -- read before dispatching Step 4's build team; the exact command-by-command responsibilities and context checklist for each agent
- **`references/database-provisioning.md`** -- read during Step 5; full Vercel + database provisioning steps (Convex, Turso, PostgreSQL, SQLite), Convex `_generated/` stubs, and Convex pitfalls
- **`references/deployment-workflow.md`** -- read during Step 6; first-deploy sequence, ongoing dev workflow, dev-vs-prod table, verification checklist, and the `.env.vercel` pattern

### Related Skills

- **`vercel-react-best-practices`** -- React/Next.js optimization rules
- **`vercel-composition-patterns`** -- Component composition for scalable apps
- **`frontend-design`** -- UI design avoiding generic aesthetics
- **`better-auth-best-practices`** -- Auth integration patterns
- **`convex-best-practices`** -- Convex patterns (when using Convex)
- **`sigma-auth:setup-convex`** -- Sigma auth with Convex
- **`sigma-auth:setup-nextjs`** -- Sigma auth with Next.js (non-Convex)
