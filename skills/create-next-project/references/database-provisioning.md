# Database Provisioning

Full step-by-step for Step 5 (Provision Database via Vercel) of the main workflow, plus Convex `_generated/` stub files and the complete list of Convex pitfalls.

After all build-team agents complete and the build passes locally, provision the database BEFORE the first deploy. Deploying without a database creates broken deployments and can cause duplicate/disconnected database instances.

## 5a. User creates Vercel project (human-in-the-loop checkpoint)

**STOP and instruct the user to do this themselves.** The agent should NOT create the Vercel project. The user needs to:

> 1. Go to [vercel.com/new](https://vercel.com/new)
> 2. Select the correct team/org
> 3. Import the GitHub repo
> 4. Import the `.env.vercel` file (Settings > Environment Variables > Import .env) and fill in any empty values
> 5. **Do NOT deploy yet** -- add storage first (Step 5b)

Wait for the user to confirm they've done this before proceeding.

## 5b. User adds database via Vercel Storage (human-in-the-loop checkpoint)

**STOP and instruct the user to do this themselves.** The user needs to:

> Go to the Vercel project dashboard > **Storage** > **Add** > select your database

## 5c. Link local project to Vercel

After the user confirms the Vercel project exists and storage is added, link the local project. **Never guess the team slug** -- look it up:

```bash
bunx vercel teams list
```

Ask the user which team from the list, then link with the exact slug:

```bash
bunx vercel link --yes --scope <team-slug>
```

Confirm it linked to the correct project.

## 5d. Pull env vars

After linking, pull the env vars that Vercel and the storage integration set automatically:

```bash
vercel env pull
```

This creates `.env.local` with all env vars from the Vercel project. At this stage the expected state is:

- `CONVEX_DEPLOY_KEY` -- **present** (auto-set by the Convex Vercel integration)
- `NEXT_PUBLIC_CONVEX_URL` -- **missing** (this gets set after `bunx convex dev` connects the local project to the Convex deployment in Step 5e)
- All other env vars from `.env.vercel` -- present

This is normal. Do not treat the missing `NEXT_PUBLIC_CONVEX_URL` as an error.

## 5e. Complete database setup

### Convex

**Always provision Convex through the Vercel Marketplace integration** (Step 5b). Never create a standalone Convex project separately -- the Vercel integration automatically connects deploy keys, handles preview deployments, and syncs env vars. Setting up Convex outside the marketplace when deploying to Vercel creates disconnected projects and manual sync headaches.

After Vercel Storage adds Convex, the dashboard shows a 4-step setup guide. Walk the user through it:

**Convex Step 1: Connect to the Convex CLI**

```bash
bunx convex login --vercel
```

This authenticates the CLI with the Vercel-managed Convex team.

**Convex Step 2: Link local project to Convex deployment**

We already have `convex/` with schema and functions. Skip `npm create convex@latest`. Run:

```bash
bunx convex dev
```

Follow the prompts to "Choose an existing project" and select the project from the Vercel-managed Convex team. This:
- Generates the real `convex/_generated/` files (replacing the stubs)
- Pushes your schema and functions to the **dev** deployment
- Writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`
- Starts watching for changes

**Keep `convex dev` running** in its own terminal during development. It continuously syncs your `convex/` code to the dev deployment.

**Convex Step 3: Connect Convex project to Vercel project**

This may already be done by the Vercel Storage integration. If not, in the Convex dashboard, connect to the Vercel project. This syncs `CONVEX_DEPLOY_KEY` to Vercel automatically.

**IMPORTANT**: Enable both "Production" and "Preview" environments. Keep the "Custom Prefix" field **empty**.

**Convex Step 4: Override the Vercel build command**

In Vercel project Settings > Build and Deployment, override the build command:

```
bunx convex deploy --cmd 'bun run build'
```

This is critical: `convex deploy` pushes functions/schema to the **production** Convex deployment, then runs `bun run build` which builds the Next.js frontend with `NEXT_PUBLIC_CONVEX_URL` pointing at production.

**Set Convex server-side env vars:**

Convex has its own environment variables separate from Vercel. These are set via the Convex CLI and are available inside Convex functions (actions, mutations, etc.).

**CRITICAL: `bunx convex env set` targets the DEV deployment by default, NOT production.** Always use `--prod` for production vars:

```bash
# Production (deployed app)
bunx convex env set SITE_URL "https://your-domain.com" --prod
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -hex 32)" --prod

# Dev (local development) -- same vars, different values
bunx convex env set SITE_URL "http://localhost:3000"
bunx convex env set BETTER_AUTH_SECRET "dev-secret-change-me"
```

Without `--prod`, you are ONLY setting vars on the dev deployment. Your production app will have missing env vars and fail silently or throw errors. This mismatch is a common source of hours-long debugging sessions.

**Commit the generated files:**

After `convex dev` runs, commit the real `convex/_generated/` files:

```bash
git add convex/_generated/
git commit -m "Add Convex generated files from dev deployment"
```

These should be checked in so teammates can type-check without running `convex dev`.

### Turso

> Provision via Vercel Storage or CLI:
> ```bash
> turso db create <name>
> turso db show <name> --url     # TURSO_DATABASE_URL
> turso db tokens create <name>  # TURSO_AUTH_TOKEN
> ```
> Set both on Vercel.

### PostgreSQL

> Add via Vercel Storage (Neon) or use an external provider (Supabase, Railway).
> Set `DATABASE_URL` on Vercel.

### SQLite

> Local development only. No provisioning needed. Uses `./dev.db`.

---

## Convex Stubs

When using Convex, the `convex/_generated/` directory does not exist until `bunx convex dev` runs. Create stub files so `bun run build` passes pre-deployment:

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

**Important**: If using `@convex-dev/better-auth` or other Convex components, the `api.d.ts` stub must also export `components`:

```typescript
import type { AnyApi } from "convex/server";
declare const api: AnyApi;
declare const internal: AnyApi;
declare const components: Record<string, AnyApi>;
export { api, internal, components };
```

```javascript
import { anyApi } from "convex/server";
export const api = anyApi;
export const internal = anyApi;
export const components = { betterAuth: anyApi };
```

These stubs get overwritten on first `bunx convex dev`.

---

## Convex Pitfalls

1. **Missing `_generated/` stubs** -- `bunx convex init` without a deployment does not create `convex/_generated/`. Create stub files (see above) so the build passes before first deployment.

2. **Missing `convex.config.ts`** -- required when using Convex components like `@convex-dev/better-auth`. Without it, the component is not registered and Convex fails at deploy time:
   ```typescript
   import betterAuth from "@convex-dev/better-auth/convex.config";
   import { defineApp } from "convex/server";
   const app = defineApp();
   app.use(betterAuth);
   export default app;
   ```

3. **Auth handler eager initialization** -- `convexBetterAuthNextJs()` throws at import time if env vars are missing. Use the lazy initialization pattern (see `references/auth-setup.md`).

4. **Circular type references in cron jobs** -- when `convex/crons.ts` references `internal.someModule.someAction`, and that module's return type depends on the `internal` type, TypeScript gets a circular reference. Fix by adding explicit return type annotations to action handlers referenced by crons.

5. **Env var mismatch: dev vs production** -- `bunx convex env set` targets the dev deployment by default. Always use `--prod` for production: `bunx convex env set VAR_NAME "value" --prod`.

6. **`NEXT_PUBLIC_CONVEX_SITE_URL` must be `.convex.site`, NOT the app domain** -- The auth proxy (`convexBetterAuthNextJs`) forwards `/api/auth/*` requests to this URL. If it points to your app domain (e.g., `https://myapp.com`), the proxy loops back to itself causing infinite redirects. Must be `https://<deployment>.convex.site`.

7. **`NEXT_PUBLIC_CONVEX_URL` must be set on Vercel** -- This env var (`https://<deployment>.convex.cloud`) is NOT auto-set by the Convex Vercel integration. You must add it manually to Vercel env vars, or pull it after `vercel env pull`. Without it, the production app has no Convex connection.

8. **Convex functions not deployed to production** -- `bunx convex dev` only pushes to the dev deployment. For production, run `bunx convex deploy --yes`. Without this, your production Convex deployment has no functions, queries, or HTTP actions.

9. **Sigma `SIGMA_MEMBER_PRIVATE_KEY` must be on Convex prod** -- This WIF key is required for server-side OAuth token exchange. Without it on production (`bunx convex env set SIGMA_MEMBER_PRIVATE_KEY "..." --prod`), sign-in silently fails.
