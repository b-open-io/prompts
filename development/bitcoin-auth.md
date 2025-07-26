# Bitcoin Auth

The "Bitcoin Auth" library simplifies authenticating REST APIs using Bitcoin keys by generating and verifying cryptographic signatures in an `X-Auth-Token` header.

## Installation

Install with Bun:

```bash
bun add bitcoin-auth
```

## Generating an Auth Token

Import and generate the token:

```typescript
import { getAuthToken } from 'bitcoin-auth';

// Get a token
const token = getAuthToken({ privateKeyWif, requestPath });

// Include it in your API request
const response = await fetch("https://somedomain.com" + requestPath, {
  headers: { 'X-Auth-Token': token }
});
```

When your request includes a `body`:

```typescript
const token = getAuthToken({ privateKeyWif, requestPath, body });
```

Using Bitcoin Signed Message and specifying `bodyEncoding`:

```typescript
const token = getAuthToken({
  privateKeyWif,
  requestPath,
  scheme: 'bsm',
  body: "eyJrZXkiOiJ2YWx1ZSJ9",
  bodyEncoding: 'base64'
});
```

## Features

* **Auth Token Generation & Verification**: Simple functions for handling tokens.
* **Dual Cryptographic Schemes**: Supports legacy 'bsm' and modern 'brc77' (recommended, [BRC-77](https://github.com/bitcoin-sv/BRCs/blob/master/peer-to-peer/0077.md)).
* **Minimal Dependencies**: Only requires the peer dependency `@bsv/sdk`.

## Usage Details

Tokens include:

* Request path (with query parameters)
* ISO8601 timestamp
* SHA256 hash of the body (if present)
* Signing scheme ('bsm' or 'brc77')

Token format:

```
pubkey|scheme|timestamp|requestPath|signature
```

Cryptographic schemes:

* `'brc77'`: Default and recommended, uses `SignedMessage.sign()` from BSV SDK.
* `'bsm'`: Legacy Bitcoin Signed Message (`BSM.sign()` from BSV SDK).

### Example Token Generation

```typescript
import { getAuthToken, parseAuthToken, verifyAuthToken, AuthToken } from 'bitcoin-auth';
import { PrivateKey } from "@bsv/sdk";

const privateKeyWif = PrivateKey.fromRandom().toWif();
const requestPath = "/some/api/path?param1=value1";
const body = JSON.stringify(["hello", "world"]);

// body present, default (brc77) signing scheme, default body encoding (utf8)
const token = getAuthToken({ privateKeyWif, requestPath, body });

// no body, bsm signing scheme
const token = getAuthToken({ privateKeyWif, requestPath, scheme: 'bsm' });
```

## Parsing & Verification

Parsing a token:

```typescript
const parsedToken: AuthToken | null = parseAuthToken(tokenWithBody);
if (!parsedToken) {
  console.error("Failed to parse bitcoin-auth token")
}
const { scheme, timestamp, requestPath, signature } = parsedToken;
```

Verifying tokens:

```typescript
const authPayload: AuthPayload = {
  requestPath,
  timestamp: new Date().toISOString(),
  body
};

const isValid = verifyAuthToken(tokenWithBody, authPayload);

const payloadNoBody: AuthPayload = {
  requestPath,
  timestamp: new Date().toISOString()
};

const isValidNoBody = verifyAuthToken(tokenNoBodyBsm, payloadNoBody);
```

**Security Note**: Always securely handle `privateKeyWif`.

### Types and Interfaces

Core authentication types:

* `AuthConfig`: Configuration for generating auth tokens
* `AuthToken`: `{ pubkey, scheme, timestamp, requestPath, signature }`
* `AuthPayload`: Data required for signing/verification:

```typescript
export interface AuthPayload {
  requestPath: string;
  timestamp: string; // ISO8601 format
  body?: string;
}
```

Example payload construction:

```typescript
const payloadWithBody: AuthPayload = {
  requestPath: '/api/items',
  timestamp: new Date().toISOString(),
  body: JSON.stringify({ name: "gadget", price: 9.99 })
};

const payload: AuthPayload = {
  requestPath: '/api/items/123',
  timestamp: new Date().toISOString()
};
```

### API Reference

#### `getAuthToken(config)`

Generates a token using an `AuthConfig` object:

* `config.privateKeyWif`: Private key in WIF format (required)
* `config.requestPath`: Full URL path (required)
* `config.body?`: Optional request body string
* `config.scheme?`: Signing scheme (`'brc77'` or `'bsm'`, default `'brc77'`)
* `config.bodyEncoding?`: Encoding for the `body` (`'utf8'`, `'hex'`, or `'base64'`, default `'utf8'`)

#### `verifyAuthToken(token, target, timePad?, bodyEncoding?)`

Verifies a token:

* `token`: Token string
* `target`: Expected `AuthPayload`
* `timePad`: Allowed time skew in minutes (default `5`)
* `bodyEncoding`: Encoding type (default `'utf8'`)

Returns `true` if valid, else `false`.

#### `parseAuthToken(token)`

Parses token into `AuthToken` or returns `null`.

## Development

Use Bun to build and test:

```bash
bun run build
bun test
```

## Other Implementations

- **Go**: [b-open-io/go-bitcoin-auth](https://github.com/b-open-io/go-bitcoin-auth)
- **GitHub**: [bitcoin-auth](https://github.com/b-open-io/bitcoin-auth)
- **NPM**: `bitcoin-auth`