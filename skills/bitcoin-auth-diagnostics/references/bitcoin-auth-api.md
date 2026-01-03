# Bitcoin Auth API Reference

Complete API reference for the bitcoin-auth library.

## Installation

```bash
bun add bitcoin-auth
```

## Core Functions

### `getAuthToken(config: AuthConfig): string`

Generates an authentication token for Bitcoin-signed API requests.

**Parameters:**
- `config.privateKeyWif` (string, required) - WIF-encoded private key
- `config.requestPath` (string, required) - Full API path with query parameters
- `config.body?` (string, optional) - Request body to include in signature
- `config.scheme?` ('bsm' | 'brc77', optional) - Signing scheme, default 'brc77'
- `config.bodyEncoding?` ('utf8' | 'hex' | 'base64', optional) - Body encoding, default 'utf8'
- `config.timestamp?` (string, optional) - ISO8601 timestamp, defaults to `new Date().toISOString()`

**Returns:** Token string in format `pubkey|scheme|timestamp|requestPath|signature`

**Example:**
```typescript
import { getAuthToken } from 'bitcoin-auth';
import { PrivateKey } from '@bsv/sdk';

const privateKeyWif = PrivateKey.fromRandom().toWif();
const requestPath = '/api/users?limit=10';
const body = JSON.stringify({ action: 'create' });

const token = getAuthToken({
  privateKeyWif,
  requestPath,
  body,
  scheme: 'brc77',        // Default
  bodyEncoding: 'utf8'    // Default
});
```

### `parseAuthToken(token: string): AuthToken | null`

Parses a token string into its components.

**Parameters:**
- `token` (string) - The auth token to parse

**Returns:** `AuthToken` object or `null` if invalid

**AuthToken Interface:**
```typescript
interface AuthToken {
  pubkey: string;      // Hex-encoded public key
  scheme: 'bsm' | 'brc77';
  timestamp: string;   // ISO8601
  requestPath: string; // Full path with query params
  signature: string;   // Base64-encoded signature
}
```

**Example:**
```typescript
import { parseAuthToken } from 'bitcoin-auth';

const token = "02abc...|brc77|2025-01-15T12:00:00.000Z|/api/endpoint|dGVzdA==";
const parsed = parseAuthToken(token);

if (parsed) {
  console.log("Public key:", parsed.pubkey);
  console.log("Scheme:", parsed.scheme);
  console.log("Timestamp:", parsed.timestamp);
  console.log("Request path:", parsed.requestPath);
  console.log("Signature:", parsed.signature);
} else {
  console.error("Invalid token format");
}
```

### `verifyAuthToken(token: string, target: AuthPayload, timePad?: number, bodyEncoding?: string): boolean`

Verifies an authentication token against a target payload.

**Parameters:**
- `token` (string, required) - The auth token to verify
- `target` (AuthPayload, required) - Expected payload to verify against
- `timePad` (number, optional) - Time padding in minutes, default 5
- `bodyEncoding` ('utf8' | 'hex' | 'base64', optional) - Body encoding, default 'utf8'

**AuthPayload Interface:**
```typescript
interface AuthPayload {
  requestPath: string;  // Must match token's requestPath
  timestamp: string;    // Server's current time (ISO8601)
  body?: string;        // Optional request body
}
```

**Returns:** `true` if valid, `false` otherwise

**Example:**
```typescript
import { verifyAuthToken } from 'bitcoin-auth';
import type { AuthPayload } from 'bitcoin-auth';

// Received token from client
const token = request.headers.get('X-Auth-Token');
const requestBody = await request.text();

// Create payload with server's current time
const authPayload: AuthPayload = {
  requestPath: '/api/endpoint',
  timestamp: new Date().toISOString(),  // Current server time
  body: requestBody
};

// Verify with 5 minute time padding
const isValid = verifyAuthToken(token, authPayload, 5, 'utf8');

if (isValid) {
  // Token is valid, proceed with request
} else {
  // Token verification failed
  return new Response('Unauthorized', { status: 401 });
}
```

## Scheme-Specific Functions

### BRC-77 (Recommended)

```typescript
import { getAuthTokenBRC77, verifyAuthTokenBRC77 } from 'bitcoin-auth';

// Generate BRC-77 token
const token = getAuthTokenBRC77({
  privateKeyWif,
  requestPath,
  body
});

// Verify BRC-77 token
const parsedToken = parseAuthToken(token);
const isValid = verifyAuthTokenBRC77(parsedToken, authPayload, 'utf8');
```

### BSM (Legacy)

```typescript
import { getAuthTokenBSM, verifyAuthTokenBSM } from 'bitcoin-auth';

// Generate BSM token
const token = getAuthTokenBSM({
  privateKeyWif,
  requestPath,
  body
});

// Verify BSM token
const parsedToken = parseAuthToken(token);
const isValid = verifyAuthTokenBSM(parsedToken, authPayload, 'utf8');
```

## Token Structure

### Format

```
pubkey|scheme|timestamp|requestPath|signature
```

### Components

1. **Public Key** (66 chars hex)
   - Compressed public key in hex format
   - Starts with `02` or `03`
   - Example: `02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3`

2. **Scheme** (3-5 chars)
   - `brc77` - BRC-77 signed message (recommended)
   - `bsm` - Bitcoin Signed Message (legacy)

3. **Timestamp** (ISO8601)
   - Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
   - Example: `2025-01-15T14:30:00.123Z`
   - Must be within timePad of server time

4. **Request Path** (variable length)
   - Full path including query parameters
   - Example: `/api/users?id=123&sort=desc`
   - Must match exactly during verification

5. **Signature** (base64)
   - Base64-encoded signature
   - Scheme-specific format (BRC77 vs BSM)
   - Example: `dGVzdHNpZ25hdHVyZWRhdGE=`

### Message Signing

The message signed in the token is:
```
requestPath|timestamp|bodyHash
```

Where:
- `bodyHash` = hex(SHA256(body)) if body present, otherwise empty string
- Body is encoded according to bodyEncoding before hashing

### Example Token

```
02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3|brc77|2025-01-15T14:30:00.123Z|/api/users?limit=10|QXNkZmdoamtsMTIzNDU2Nzg5MA==
```

Parsed:
- pubkey: `02a1b2c3d4...`
- scheme: `brc77`
- timestamp: `2025-01-15T14:30:00.123Z`
- requestPath: `/api/users?limit=10`
- signature: `QXNkZmdoamtsMTIzNDU2Nzg5MA==`

## Usage Patterns

### Client-Side Token Generation

```typescript
import { getAuthToken } from 'bitcoin-auth';

// Without body (GET request)
const token = getAuthToken({
  privateKeyWif: userPrivateKey,
  requestPath: '/api/users/123'
});

fetch('https://api.example.com/api/users/123', {
  headers: { 'X-Auth-Token': token }
});

// With body (POST request)
const requestBody = JSON.stringify({ name: 'Alice' });
const token = getAuthToken({
  privateKeyWif: userPrivateKey,
  requestPath: '/api/users',
  body: requestBody
});

fetch('https://api.example.com/api/users', {
  method: 'POST',
  headers: {
    'X-Auth-Token': token,
    'Content-Type': 'application/json'
  },
  body: requestBody
});
```

### Server-Side Token Verification

```typescript
import { parseAuthToken, verifyAuthToken } from 'bitcoin-auth';
import type { AuthPayload } from 'bitcoin-auth';

async function authenticateRequest(request: Request): Promise<boolean> {
  // Extract token from header
  const token = request.headers.get('X-Auth-Token');
  if (!token) return false;

  // Parse token
  const parsed = parseAuthToken(token);
  if (!parsed) return false;

  // Get request path from URL
  const url = new URL(request.url);
  const requestPath = url.pathname + url.search;

  // Get request body if present
  const body = ['POST', 'PUT', 'PATCH'].includes(request.method)
    ? await request.text()
    : undefined;

  // Create auth payload with server's current time
  const authPayload: AuthPayload = {
    requestPath,
    timestamp: new Date().toISOString(),
    body
  };

  // Verify token
  return verifyAuthToken(token, authPayload, 5, 'utf8');
}
```

## Body Encoding

### UTF-8 (Default)

```typescript
const body = JSON.stringify({ key: 'value' });
const token = getAuthToken({
  privateKeyWif,
  requestPath,
  body,
  bodyEncoding: 'utf8'  // Default
});
```

### Hexadecimal

```typescript
const body = Buffer.from('data').toString('hex');
const token = getAuthToken({
  privateKeyWif,
  requestPath,
  body,
  bodyEncoding: 'hex'
});
```

### Base64

```typescript
const body = Buffer.from('data').toString('base64');
const token = getAuthToken({
  privateKeyWif,
  requestPath,
  body,
  bodyEncoding: 'base64'
});
```

## Time Padding

The `timePad` parameter allows for clock skew between client and server:

```typescript
// Allow 5 minute time difference (default)
verifyAuthToken(token, authPayload, 5);

// Allow 10 minute time difference
verifyAuthToken(token, authPayload, 10);

// Strict verification (1 minute)
verifyAuthToken(token, authPayload, 1);
```

## Error Handling

```typescript
import { parseAuthToken, verifyAuthToken } from 'bitcoin-auth';

const token = request.headers.get('X-Auth-Token');

// Check token exists
if (!token) {
  return new Response('No auth token provided', { status: 401 });
}

// Check token format
const parsed = parseAuthToken(token);
if (!parsed) {
  return new Response('Invalid token format', { status: 400 });
}

// Verify signature
const authPayload = {
  requestPath: request.url,
  timestamp: new Date().toISOString(),
  body: await request.text()
};

const isValid = verifyAuthToken(token, authPayload);
if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}

// Token is valid, proceed with request
```

## TypeScript Types

```typescript
// Configuration for generating tokens
interface AuthConfig {
  privateKeyWif: string;
  requestPath: string;
  body?: string;
  scheme?: 'bsm' | 'brc77';
  bodyEncoding?: 'utf8' | 'hex' | 'base64';
  timestamp?: string;
}

// Parsed token structure
interface AuthToken {
  pubkey: string;
  scheme: 'bsm' | 'brc77';
  timestamp: string;
  requestPath: string;
  signature: string;
}

// Payload for verification
interface AuthPayload {
  requestPath: string;
  timestamp: string;
  body?: string;
}
```

## Security Notes

1. **Never expose private keys** - Store securely, never log or transmit
2. **Use HTTPS** - Tokens should only be sent over secure connections
3. **Validate timestamps** - Use appropriate timePad for your use case
4. **Match request paths** - Ensure exact match including query parameters
5. **Use BRC77** - Prefer `brc77` scheme over legacy `bsm`
6. **Verify on server** - Always verify tokens server-side, never trust client
