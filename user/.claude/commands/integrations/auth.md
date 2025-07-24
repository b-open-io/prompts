---
version: 1.1.0
description: OAuth 2.0 and Sigma Identity authentication patterns
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, WebFetch, Bash(curl *), Bash(git *)
argument-hint: [provider] | setup | session | middleware | check-update
---

# OAuth Authentication Guide

## Version Information
!`echo "📌 Current version: 1.1.0"`
!`curl -s https://raw.githubusercontent.com/b-open-io/prompts/master/user/.claude/commands/auth.md 2>/dev/null | grep "^version:" | cut -d' ' -f2 | xargs -I {} echo "☁️  Latest version: {}" || echo "☁️  Latest version: Unable to check"`

## Your Task

If the arguments contain "check-update", show version comparison and stop.
If the arguments contain "--help", show help and stop.

Otherwise, provide authentication implementation guidance based on the arguments:
- No args or "sigma": Show Sigma Identity authentication
- "setup": Show initial setup steps
- Other providers: Show specific OAuth patterns

## Primary Authentication: Sigma Identity

### Overview
**Sigma Identity** (auth.sigmaidentity.com) is our primary authentication mechanism for the BSV ecosystem. It provides:
- OAuth 2.0 compliant authentication
- BSV wallet integration
- Decentralized identity management
- Single Sign-On (SSO) across BSV applications

### Quick Setup with Sigma Identity

#### 1. Register Your Application
```bash
# Visit auth.sigmaidentity.com/developers
# Create a new application to get:
# - Client ID
# - Client Secret (keep secure!)
# - Allowed redirect URIs
```

#### 2. Environment Configuration
```env
# .env.local
SIGMA_CLIENT_ID=your_client_id
SIGMA_CLIENT_SECRET=your_client_secret
SIGMA_REDIRECT_URI=http://localhost:3000/api/auth/callback/sigma
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

#### 3. NextAuth.js Configuration
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'sigma',
      name: 'Sigma Identity',
      type: 'oauth',
      version: '2.0',
      authorization: {
        url: 'https://auth.sigmaidentity.com/oauth/authorize',
        params: {
          scope: 'openid profile email wallet',
          response_type: 'code',
        },
      },
      token: 'https://auth.sigmaidentity.com/oauth/token',
      userinfo: 'https://auth.sigmaidentity.com/oauth/userinfo',
      client: {
        id: process.env.SIGMA_CLIENT_ID!,
        secret: process.env.SIGMA_CLIENT_SECRET!,
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // BSV specific fields
          paymail: profile.paymail,
          publicKey: profile.public_key,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.paymail = profile.paymail
        token.publicKey = profile.public_key
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.paymail = token.paymail
        session.user.publicKey = token.publicKey
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

#### 4. Login Component
```typescript
// components/auth/sigma-login.tsx
'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

export function SigmaLogin() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span>Welcome, {session.user?.name}</span>
        <span className="text-sm text-muted-foreground">
          {session.user?.paymail}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('sigma')}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      Sign in with Sigma Identity
    </button>
  )
}
```

#### 5. Protecting Routes
```typescript
// app/(protected)/dashboard/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <div>
      <h1>Welcome {session.user?.name}</h1>
      <p>Paymail: {session.user?.paymail}</p>
      <p>Public Key: {session.user?.publicKey}</p>
    </div>
  )
}
```

### Sigma Identity API Integration

#### Get User BSV Wallet Info
```typescript
// Fetch extended user profile including wallet details
const response = await fetch('https://auth.sigmaidentity.com/api/v1/user', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
})

const userData = await response.json()
// Returns:
// {
//   id: "user_id",
//   email: "user@example.com",
//   paymail: "user@moneybutton.com",
//   publicKey: "03...",
//   balance: { satoshis: 100000 },
//   capabilities: ["payments", "data", "identity"]
// }
```

#### Request BSV Payment Authorization
```typescript
// For apps that need payment capabilities
const paymentAuth = await fetch('https://auth.sigmaidentity.com/api/v1/authorize/payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 1000, // satoshis
    description: 'API subscription',
    outputs: [
      {
        script: 'OP_DUP OP_HASH160 ...',
        satoshis: 1000,
      },
    ],
  }),
})
```

### Advanced Features

#### Multi-Factor Authentication
```typescript
// Enable MFA requirement for sensitive operations
authorization: {
  url: 'https://auth.sigmaidentity.com/oauth/authorize',
  params: {
    scope: 'openid profile email wallet',
    acr_values: 'mfa', // Require MFA
  },
},
```

#### Organization/Team Management
```typescript
// Check if user belongs to an organization
if (session.user?.organizations?.includes('your-org-id')) {
  // Grant additional permissions
}
```

## Common OAuth Providers

### Generic OAuth 2.0 Flow

1. **Authorization Request**:
   ```typescript
   const authUrl = new URL('https://provider.com/oauth/authorize');
   authUrl.searchParams.append('client_id', process.env.OAUTH_CLIENT_ID!);
   authUrl.searchParams.append('redirect_uri', process.env.OAUTH_REDIRECT_URI!);
   authUrl.searchParams.append('response_type', 'code');
   authUrl.searchParams.append('scope', 'read:user');
   authUrl.searchParams.append('state', generateState());
   ```

2. **Token Exchange**:
   ```typescript
   // app/api/auth/callback/route.ts
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const code = searchParams.get('code');
     const state = searchParams.get('state');
     
     // Verify state to prevent CSRF
     if (!verifyState(state)) {
       return Response.redirect('/auth/error');
     }
     
     const tokenResponse = await fetch('https://provider.com/oauth/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         grant_type: 'authorization_code',
         client_id: process.env.OAUTH_CLIENT_ID!,
         client_secret: process.env.OAUTH_CLIENT_SECRET!,
         code: code!,
         redirect_uri: process.env.OAUTH_REDIRECT_URI!,
       }),
     });
     
     const { access_token } = await tokenResponse.json();
     // Store token and create session
   }
   ```

## Session Management

### Cookie-based Sessions
```typescript
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
    
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession() {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
```

### Middleware Protection
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

## Popular Auth Libraries

### NextAuth.js (Auth.js)
```bash
npm install next-auth
```

### Lucia Auth
```bash
npm install lucia
```

### Clerk
```bash
npm install @clerk/nextjs
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Implement CSRF protection with state parameter**
3. **Store tokens securely (httpOnly cookies)**
4. **Implement proper session expiration**
5. **Use environment variables for secrets**
6. **Validate redirect URIs**

## Resources

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)