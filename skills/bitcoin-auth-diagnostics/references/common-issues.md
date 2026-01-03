# Common Bitcoin Auth Issues and Solutions

Comprehensive troubleshooting guide for bitcoin-auth library.

## Token Structure Issues

### Issue: "Token has X parts (expected 5)"

**Symptoms:**
- `parseAuthToken()` returns `null`
- Token doesn't split into 5 parts

**Root Causes:**
1. Token is truncated or incomplete
2. Extra pipe characters in token components
3. Token was incorrectly concatenated or modified

**Diagnosis:**
```typescript
const token = "...";
const parts = token.split('|');
console.log(`Parts: ${parts.length}`, parts);
```

**Solutions:**
- Check token generation: ensure all 5 parts are included
- Verify token wasn't truncated in transmission
- Check for extra pipes in requestPath (encode if necessary)
- Validate token immediately after generation

### Issue: "Invalid scheme"

**Symptoms:**
- Token parses but scheme is neither 'bsm' nor 'brc77'
- Verification fails immediately

**Root Causes:**
1. Typo in scheme field
2. Using unsupported signing scheme
3. Token corruption

**Diagnosis:**
```typescript
const parsed = parseAuthToken(token);
if (parsed) {
  console.log("Scheme:", parsed.scheme);
  console.log("Valid:", ['bsm', 'brc77'].includes(parsed.scheme));
}
```

**Solutions:**
- Use only 'bsm' or 'brc77' (recommend 'brc77')
- Check token generation code for typos
- Validate scheme in token generation

## Signature Verification Failures

### Issue: "Signature verification failed" (General)

**Symptoms:**
- Token structure is valid
- `verifyAuthToken()` returns `false`
- No specific error message

**Root Causes:**
1. Request path mismatch
2. Timestamp out of range
3. Body hash mismatch
4. Incorrect bodyEncoding
5. Wrong scheme used
6. Corrupted signature

**Diagnosis Checklist:**
```typescript
const parsed = parseAuthToken(token);
const authPayload = {
  requestPath: "/actual/path",
  timestamp: new Date().toISOString(),
  body: requestBody
};

// 1. Check request path
console.log("Paths match:", parsed.requestPath === authPayload.requestPath);

// 2. Check timestamp age
const tokenTime = new Date(parsed.timestamp);
const ageMinutes = (Date.now() - tokenTime.getTime()) / 60000;
console.log("Token age (minutes):", ageMinutes);

// 3. Check scheme
console.log("Scheme:", parsed.scheme);

// 4. Check body presence
console.log("Token has body:", parsed.requestPath.includes('|'));
console.log("Payload has body:", !!authPayload.body);
```

**Solutions:**
- Verify request paths match exactly
- Increase timePad if needed
- Ensure body hash matches
- Check bodyEncoding parameter
- Verify correct scheme is used

### Issue: "Request path mismatch"

**Symptoms:**
- Token's requestPath doesn't match verification requestPath
- Verification fails even with correct timestamp

**Root Causes:**
1. Query parameter order differs
2. URL encoding differences
3. Missing query parameters
4. Case sensitivity
5. Protocol/domain included incorrectly

**Diagnosis:**
```typescript
console.log("Token path:", parsed.requestPath);
console.log("Verify path:", authPayload.requestPath);
console.log("Match:", parsed.requestPath === authPayload.requestPath);

// Character-by-character comparison
for (let i = 0; i < Math.max(parsed.requestPath.length, authPayload.requestPath.length); i++) {
  if (parsed.requestPath[i] !== authPayload.requestPath[i]) {
    console.log(`Differ at position ${i}:`);
    console.log(`  Token: '${parsed.requestPath[i]}' (code: ${parsed.requestPath.charCodeAt(i)})`);
    console.log(`  Verify: '${authPayload.requestPath[i]}' (code: ${authPayload.requestPath.charCodeAt(i)})`);
    break;
  }
}
```

**Solutions:**
- Ensure query parameters are in same order
- Don't URL-encode the request path before signing
- Include full path with query string
- Use lowercase for path (if server normalizes)
- Don't include protocol or domain

**Example:**
```typescript
// ✅ CORRECT
const requestPath = "/api/users?id=123&sort=asc";

// ❌ WRONG - Different parameter order
const requestPath = "/api/users?sort=asc&id=123";

// ❌ WRONG - URL encoded
const requestPath = "/api/users?id%3D123";

// ❌ WRONG - Includes domain
const requestPath = "https://api.example.com/api/users";
```

### Issue: "Token timestamp too old/new"

**Symptoms:**
- Token age exceeds timePad
- "time skew" error
- Verification fails on timestamp check

**Root Causes:**
1. Clock drift between client and server
2. Token cached and reused
3. timePad too restrictive
4. Timezone issues

**Diagnosis:**
```typescript
const tokenTime = new Date(parsed.timestamp);
const serverTime = new Date();
const diffMinutes = (serverTime - tokenTime) / 60000;

console.log("Token time:", tokenTime.toISOString());
console.log("Server time:", serverTime.toISOString());
console.log("Difference (minutes):", diffMinutes);
console.log("TimePad:", 5); // Default
console.log("Valid:", diffMinutes <= 5);
```

**Solutions:**
- Increase timePad parameter (e.g., from 5 to 10 minutes)
- Sync clocks using NTP
- Generate new token for each request (don't cache)
- Use UTC timestamps consistently

**Example:**
```typescript
// Allow more time skew
const isValid = verifyAuthToken(token, authPayload, 10); // 10 minutes

// Check server clock
console.log("Server time:", new Date().toISOString());
```

### Issue: "Body hash mismatch"

**Symptoms:**
- Verification fails when body is present
- Succeeds without body, fails with body

**Root Causes:**
1. Body was modified between signing and verification
2. Wrong bodyEncoding used
3. JSON serialization differences
4. Body encoding issues (charset, newlines)

**Diagnosis:**
```typescript
import { Hash, Utils } from '@bsv/sdk';
const { toArray, toHex } = Utils;

// Compute body hash with different encodings
const bodyUtf8Hash = toHex(Hash.sha256(toArray(body, 'utf8')));
const bodyHexHash = toHex(Hash.sha256(toArray(body, 'hex')));
const bodyBase64Hash = toHex(Hash.sha256(toArray(body, 'base64')));

console.log("Body (first 100 chars):", body.substring(0, 100));
console.log("Body length:", body.length);
console.log("UTF-8 hash:", bodyUtf8Hash);
console.log("Hex hash:", bodyHexHash);
console.log("Base64 hash:", bodyBase64Hash);
```

**Solutions:**
- Use exact same body string (don't re-serialize JSON)
- Match bodyEncoding between generation and verification
- Preserve whitespace and formatting
- Use consistent character encoding

**Example:**
```typescript
// ✅ CORRECT - Same body string
const body = JSON.stringify({ key: 'value' });
const token = getAuthToken({ privateKeyWif, requestPath, body });
// ... send request with same body ...
const isValid = verifyAuthToken(token, { requestPath, timestamp, body });

// ❌ WRONG - Re-serialized (whitespace may differ)
const body = JSON.stringify({ key: 'value' });
const token = getAuthToken({ privateKeyWif, requestPath, body });
const bodyToSend = JSON.stringify(JSON.parse(body)); // Different!
```

## Integration Issues

### Issue: Sigma Auth integration failures

**Symptoms:**
- Token verification fails at `/api/auth/token-for-endpoint`
- "Invalid token format" error from Sigma Auth

**Root Causes:**
1. Wrong requestPath (should be `/api/auth/token-for-endpoint`)
2. Body not included when required
3. Request body format incorrect

**Diagnosis:**
```typescript
// Check request structure
console.log("Endpoint:", "/api/auth/token-for-endpoint");
console.log("Method:", "POST");
console.log("Body structure:", {
  authToken: "...",
  requestBody: "..." // Optional
});
```

**Solutions:**
- Use exact requestPath: `/api/auth/token-for-endpoint`
- Include requestBody in POST body if token was signed with body
- Format body as `{ authToken: "...", requestBody: "..." }`

**Example:**
```typescript
// Generate token
const requestBody = JSON.stringify({ action: 'test' });
const token = getAuthToken({
  privateKeyWif,
  requestPath: "/api/auth/token-for-endpoint",
  body: requestBody
});

// Send to Sigma Auth
const response = await fetch("https://auth.sigmaidentity.com/api/auth/token-for-endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    authToken: token,
    requestBody: requestBody
  })
});
```

### Issue: Wallet connect flow failures

**Symptoms:**
- Wallet connect authentication fails
- BSM signature verification fails

**Root Causes:**
1. Using brc77 instead of bsm for wallet connect
2. Wrong requestPath
3. Body included when not expected

**Solutions:**
- Use BSM scheme for wallet compatibility
- Use exact requestPath: `/wallet/connect`
- Don't include body for wallet connect

**Example:**
```typescript
// ✅ CORRECT - Wallet connect
const token = getAuthToken({
  privateKeyWif,
  requestPath: "/wallet/connect",
  scheme: 'bsm'  // Important: use BSM for wallets
});

// ❌ WRONG - Using BRC77
const token = getAuthToken({
  privateKeyWif,
  requestPath: "/wallet/connect",
  scheme: 'brc77'  // Wallets may not support BRC77
});
```

## Development/Testing Issues

### Issue: Test failures with static tokens

**Symptoms:**
- Static tokens in tests fail verification
- Timestamp validation fails in tests

**Root Causes:**
1. Timestamp in test token is too old
2. timePad not adjusted for testing
3. Server time differs from test time

**Solutions:**
- Generate fresh tokens in tests
- Mock timestamp generation
- Use larger timePad in tests
- Mock `Date.now()` to control time

**Example:**
```typescript
import { jest } from 'bun:test';

// Mock timestamp for consistent testing
const fixedTime = new Date('2025-01-15T12:00:00.000Z');
const originalToISOString = Date.prototype.toISOString;
Date.prototype.toISOString = jest.fn(() => fixedTime.toISOString());

// Generate token with fixed time
const token = getAuthToken({ privateKeyWif, requestPath });

// Restore original
Date.prototype.toISOString = originalToISOString;

// Verify with same timestamp
const isValid = verifyAuthToken(token, {
  requestPath,
  timestamp: fixedTime.toISOString()
});
```

### Issue: Environment differences (dev vs prod)

**Symptoms:**
- Works in development, fails in production
- Inconsistent verification results

**Root Causes:**
1. Clock drift in production
2. Different bodyEncoding defaults
3. URL rewriting/normalization
4. Proxy modifications

**Diagnosis:**
```typescript
// Log environment details
console.log("Environment:", process.env.NODE_ENV);
console.log("Server time:", new Date().toISOString());
console.log("Request URL:", request.url);
console.log("Request path:", new URL(request.url).pathname + new URL(request.url).search);
```

**Solutions:**
- Ensure consistent time synchronization (NTP)
- Explicitly set bodyEncoding (don't rely on defaults)
- Verify request paths aren't modified by proxies
- Test with production-like environment

## Public Key Issues

### Issue: "Invalid public key format"

**Symptoms:**
- Public key validation fails
- pubkey doesn't start with 02 or 03
- Public key wrong length

**Root Causes:**
1. Uncompressed public key used
2. Invalid WIF private key
3. Public key corruption

**Diagnosis:**
```typescript
const parsed = parseAuthToken(token);
console.log("Public key:", parsed.pubkey);
console.log("Length:", parsed.pubkey.length); // Should be 66
console.log("Starts with 02/03:", /^0[23]/.test(parsed.pubkey));
console.log("Is hex:", /^[0-9a-fA-F]+$/.test(parsed.pubkey));
```

**Solutions:**
- Use compressed public keys (default in BSV SDK)
- Validate WIF private key before use
- Ensure public key isn't truncated

**Example:**
```typescript
import { PrivateKey } from '@bsv/sdk';

// Generate proper compressed public key
const privateKey = PrivateKey.fromWif(wif);
const publicKey = privateKey.toPublicKey();
const pubkeyHex = publicKey.toString(); // Compressed, 66 chars
```

## Debugging Workflow

When facing verification failures, follow this diagnostic sequence:

1. **Validate Token Structure**
   ```typescript
   const parsed = parseAuthToken(token);
   if (!parsed) {
     console.error("Token structure invalid");
     return;
   }
   ```

2. **Check Request Path**
   ```typescript
   if (parsed.requestPath !== authPayload.requestPath) {
     console.error("Path mismatch");
     return;
   }
   ```

3. **Check Timestamp**
   ```typescript
   const age = (Date.now() - new Date(parsed.timestamp)) / 60000;
   if (age > 5) {
     console.error("Token too old");
     return;
   }
   ```

4. **Check Scheme**
   ```typescript
   console.log("Using scheme:", parsed.scheme);
   ```

5. **Verify Signature**
   ```typescript
   const isValid = verifyAuthToken(token, authPayload);
   if (!isValid) {
     console.error("Signature verification failed");
     // Try different bodyEncoding
     const isValidHex = verifyAuthToken(token, authPayload, 5, 'hex');
     const isValidBase64 = verifyAuthToken(token, authPayload, 5, 'base64');
     console.log("Valid with hex:", isValidHex);
     console.log("Valid with base64:", isValidBase64);
   }
   ```

## Quick Fixes Reference

| Symptom | Quick Fix |
|---------|-----------|
| "Invalid token format" | Check token has 5 pipe-separated parts |
| "Time skew" | Increase timePad parameter |
| "Path mismatch" | Log and compare requestPath values |
| "Signature failed" | Check body and bodyEncoding match |
| Works without body, fails with | Verify exact body string used |
| Works in dev, fails in prod | Check server time synchronization |
| BSM scheme fails | Verify public key is compressed |
| BRC77 scheme fails | Update to latest @bsv/sdk |

## Getting Help

If issues persist after troubleshooting:

1. **Collect Debug Info:**
   - Token structure (parsed components)
   - Request path used
   - Body (if present, first 100 characters)
   - Timestamp difference
   - Scheme used
   - Bitcoin-auth version

2. **Test with Known Good:**
   - Use test vectors from bitcoin-auth test suite
   - Generate and immediately verify token
   - Test with minimal example

3. **Check Version Compatibility:**
   - Ensure @bsv/sdk is up to date
   - Check bitcoin-auth version matches docs
   - Verify peer dependencies

4. **Open Issue:**
   - GitHub: https://github.com/b-open-io/bitcoin-auth/issues
   - Include sanitized debug output (no private keys!)
   - Provide minimal reproducible example
