---
description: OAuth 2.0 authentication patterns and setup
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, WebFetch
argument-hint: [provider] | setup | session | middleware
---

# OAuth Authentication Guide

$ARGUMENTS

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