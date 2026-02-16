# Authentication Setup

better-auth configuration patterns for each auth method.

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

```ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

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
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
    clientId: process.env.APPLE_CLIENT_ID!,
    clientSecret: process.env.APPLE_CLIENT_SECRET!,
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

Use the Convex adapter for better-auth. Follow the `Skill(convex)` skill for Convex setup:

```bash
bun add convex better-auth-convex
bunx convex dev --once  # Initialize Convex project
```

### Turso/libSQL

```bash
bun add @libsql/client
```

```ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  database: {
    type: "sqlite",
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

### PostgreSQL

```bash
bun add pg
```

```ts
database: {
  type: "postgres",
  url: process.env.DATABASE_URL!,
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
