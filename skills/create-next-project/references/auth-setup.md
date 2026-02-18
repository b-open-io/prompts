# Authentication Setup

better-auth configuration patterns for each auth method.

> For general Better Auth concepts (session management, plugins, hooks, database adapters), see `Skill(better-auth-best-practices)`. This file covers project-specific wiring patterns and Convex-specific pitfalls.

## Base Setup (Always)

### Server Configuration (`src/lib/auth.ts`)

```ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  // Database adapter configured based on user's database choice
  database: {
    // See database-specific section below
  },
  emailAndPassword: {
    enabled: true, // if user selected email/password
  },
  socialProviders: {
    // Added based on user selections
  },
})
```

### Client Configuration (`src/lib/auth-client.ts`)

```ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
})

export const { signIn, signUp, signOut, useSession } = authClient
```

### API Route (`src/app/api/auth/[...all]/route.ts`)

For standard (non-Convex) setups:

```ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

For Convex setups, use **lazy initialization** to prevent build-time crashes when env vars are not yet set:

```ts
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

The `convexBetterAuthNextJs` function throws eagerly at import time if env vars are missing. Wrapping it in a function defers evaluation to request time, allowing builds to succeed without env vars.

**CRITICAL: `NEXT_PUBLIC_CONVEX_SITE_URL` vs `NEXT_PUBLIC_CONVEX_URL`** -- these are DIFFERENT values:
- `NEXT_PUBLIC_CONVEX_URL` = `https://<deployment>.convex.cloud` (client SDK connection for queries/mutations)
- `NEXT_PUBLIC_CONVEX_SITE_URL` = `https://<deployment>.convex.site` (HTTP actions URL, where auth proxy forwards requests)

If you set `NEXT_PUBLIC_CONVEX_SITE_URL` to your app domain (e.g., `https://myapp.com`) instead of the `.convex.site` URL, the auth proxy loops back to itself, causing infinite redirects or timeouts during sign-in. This is the most common deployment-breaking mistake.

### Middleware (`src/middleware.ts`)

```ts
import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "better-auth/types"
import { type NextRequest, NextResponse } from "next/server"

export default async function authMiddleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  )

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protected routes - add patterns here
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
}
```

## Auth Method: Email/Password

Already enabled in base config above. The login-05 and signup-05 shadcn blocks provide the UI. Wire them to `authClient.signIn.email()` and `authClient.signUp.email()`.

## Auth Method: OAuth Providers

### Google

```bash
# Required env vars:
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
```

```ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

socialProviders: {
  google: {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  },
},
```

### GitHub

```bash
# Required env vars:
# GITHUB_CLIENT_ID
# GITHUB_CLIENT_SECRET
```

```ts
socialProviders: {
  github: {
    clientId: requireEnv("GITHUB_CLIENT_ID"),
    clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
  },
},
```

### Apple

```bash
# Required env vars:
# APPLE_CLIENT_ID
# APPLE_CLIENT_SECRET
# APPLE_TEAM_ID
# APPLE_KEY_ID
```

```ts
socialProviders: {
  apple: {
    clientId: requireEnv("APPLE_CLIENT_ID"),
    clientSecret: requireEnv("APPLE_CLIENT_SECRET"),
  },
},
```

Add OAuth buttons to the login/signup blocks. The shadcn login-05/signup-05 blocks include social login button placeholders.

## Auth Method: Sigma/Bitcoin Auth

Requires the `sigma-auth` plugin and `@sigmaidentity/client` package:

```bash
bun add @sigmaidentity/client
```

Use the `Skill(sigma-auth:setup-nextjs)` skill for full integration guide. Key steps:
1. Register an OAuth client with Sigma Identity
2. Configure `SIGMA_MEMBER_PRIVATE_KEY` env var
3. Add Sigma as a custom OAuth provider in better-auth
4. Add "Sign in with Bitcoin" button to auth pages

## Auth Method: Passkeys/WebAuthn

```bash
bun add @simplewebauthn/server @simplewebauthn/browser
```

Enable the passkey plugin in better-auth:

```ts
import { betterAuth } from "better-auth"
import { passkey } from "better-auth/plugins/passkey"

export const auth = betterAuth({
  plugins: [passkey()],
  // ... rest of config
})
```

Client-side:

```ts
import { createAuthClient } from "better-auth/react"
import { passkeyClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [passkeyClient()],
})
```

## Database Adapters

### Convex

Use the Convex adapter for better-auth via `@convex-dev/better-auth`. Follow the `Skill(convex)` skill for Convex setup:

```bash
bun add convex @convex-dev/better-auth
bunx convex init
```

IMPORTANT: Create `convex/convex.config.ts` to register the better-auth component:

```ts
import betterAuth from "@convex-dev/better-auth/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);

export default app;
```

Also create `convex/_generated/` stub files so the build passes before a Convex deployment exists. See the main SKILL.md Phase 4 for the full stub file contents.

### Turso/libSQL

```bash
bun add @libsql/client
```

```ts
import { betterAuth } from "better-auth"

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;
if (!tursoUrl) throw new Error("TURSO_DATABASE_URL is required");
if (!tursoToken) throw new Error("TURSO_AUTH_TOKEN is required");

export const auth = betterAuth({
  database: {
    type: "sqlite",
    url: tursoUrl,
    authToken: tursoToken,
  },
})
```

### PostgreSQL

```bash
bun add pg
```

```ts
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

database: {
  type: "postgres",
  url: databaseUrl,
},
```

### SQLite (Local Dev)

```ts
database: {
  type: "sqlite",
  url: "./dev.db",
},
```

## Wiring shadcn Auth Blocks

The `login-05` and `signup-05` blocks from shadcn/ui provide styled forms. After installing:

1. Locate the generated components (typically in `src/components/`)
2. Replace form submission handlers with better-auth client calls
3. Add OAuth buttons if selected
4. Add passkey button if selected
5. Wire form validation (the blocks include basic validation)
6. Add redirect logic after successful auth

The blocks are starting points - customize them to match the auth methods selected.

**For Sigma-only auth**: Remove email/password input fields entirely. Keep the layout, branding, and terms/privacy links. Replace the form with a single "Sign in with Sigma Identity" button. Add your project logo using `next/image` instead of the default email icon.

## Auth UI in the App Shell

A login page alone is not sufficient. Users need auth controls accessible from within the app:

1. **Sidebar footer**: Show sign-in button when unauthenticated, show user info + sign-out button when authenticated
2. **Header/navbar**: Show a "Sign in" button when unauthenticated
3. **Root page**: Check auth state before redirecting into protected routes. Don't blindly redirect unauthenticated users into the app -- redirect them to `/login` instead.

## Route Protection

Use middleware to prevent unauthenticated users from accessing the app:

```typescript
// src/middleware.ts
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { type NextRequest, NextResponse } from "next/server";

export default async function authMiddleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") || "" },
    },
  );

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)"],
};
```

Without this, unauthenticated users land in the app shell with broken/empty state.
