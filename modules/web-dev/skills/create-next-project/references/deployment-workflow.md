# Deployment Workflow

Full detail for Step 6 (First Deploy + Ongoing Workflow) of the main workflow, plus the `.env.vercel` file pattern used in Step 1/4.

## First deploy

Now that the database is provisioned and env vars are set, push to trigger the first deploy:

```bash
git push -u origin main
```

Or if the user hasn't set up a GitHub remote yet, list orgs with `gh org list`, ask the user which one, then:

```bash
gh repo create <org>/<name> --private --source=. --remote=origin --push
```

The Vercel deploy will:
1. Run `bunx convex deploy --cmd 'bun run build'` (per the build override)
2. `convex deploy` pushes functions/schema to the **production** Convex deployment
3. `convex deploy` sets `NEXT_PUBLIC_CONVEX_URL` to the production URL
4. `bun run build` builds the Next.js app pointing at production Convex
5. Vercel deploys the built frontend

## Ongoing development workflow

**Two terminals, always:**

```bash
# Terminal 1: Convex dev server (watches convex/ and pushes to DEV deployment)
bunx convex dev

# Terminal 2: Next.js dev server (uses NEXT_PUBLIC_CONVEX_URL from .env.local pointing at DEV)
bun dev
```

`convex dev` continuously:
- Pushes backend code changes to your dev deployment on every save
- Regenerates `convex/_generated/` types
- Enforces schema changes
- Shows function logs

Your local Next.js app (via `bun dev`) connects to the **dev** Convex deployment. The production app connects to the **production** deployment. They have separate data, separate env vars, and separate function code.

## Dev vs Production -- key differences

| | Dev deployment | Production deployment |
|---|---|---|
| **Connected by** | `bunx convex dev` | `bunx convex deploy` (Vercel build) |
| **URL in** | `.env.local` | Set automatically by `convex deploy` during build |
| **Env vars set with** | `bunx convex env set VAR val` | `bunx convex env set VAR val --prod` |
| **Data** | Separate (dev data) | Separate (production data) |
| **Schema pushed by** | `convex dev` (on save) | `convex deploy` (on Vercel build) |
| **When to use** | Local development | Deployed app |

## Verification

After first deploy completes:
- Visit the Vercel URL and confirm the app loads without client errors
- Check Convex dashboard to confirm schema was pushed to production
- Verify both dev and production deployments exist in the Convex dashboard
- Test auth flow if configured
- Confirm theme toggle works
- Run `Skill(react-doctor)` (`npx -y react-doctor@latest . --verbose --diff`) and fix everything it flags -- a brand-new project should score 100, not just "pass"
- Run `bun run lint` one final time -- Biome must be 100% clean, not just building

---

## .env.vercel Pattern

Create a `.env.vercel` file committed to the repo with ALL env vars the project needs. Known defaults are pre-filled; unknowns are left empty. Add a `.gitignore` exception:

```gitignore
# env files
.env*
!.env.vercel
```

Example `.env.vercel`:
```bash
# Vercel Environment Variables
# Import this file into Vercel: Settings > Environment Variables > Import .env
# Values marked with comments must be filled in during setup

# Database (Convex example)
# IMPORTANT: NEXT_PUBLIC_CONVEX_URL = .convex.cloud (client SDK)
# IMPORTANT: NEXT_PUBLIC_CONVEX_SITE_URL = .convex.site (auth proxy destination)
# These are DIFFERENT URLs! Do NOT set SITE_URL to your app domain.
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=
CONVEX_DEPLOY_KEY=

# Auth
BETTER_AUTH_SECRET=

# OAuth (if selected)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# Sigma Auth (if selected)
NEXT_PUBLIC_SIGMA_CLIENT_ID=your-app-name
NEXT_PUBLIC_SIGMA_AUTH_URL=https://auth.sigmaidentity.com
```

Only include env vars for features the user actually selected.
