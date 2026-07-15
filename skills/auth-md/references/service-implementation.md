# Service Implementation

## Split the service into explicit boundaries

Implement the resource server, authorization server, user-facing claim UI, and
credential store as distinct logical components even when deployed together.
Keep browser sessions and agent credentials on separate validation paths.

Expose:

- RFC 9728 protected-resource metadata and a matching
  `WWW-Authenticate ... resource_metadata=...` challenge;
- RFC 8414 authorization-server metadata extended with `agent_auth`;
- `POST /agent/identity` for the advertised registration shapes;
- `POST /agent/identity/claim` for claim attempt creation or re-initiation;
- a service-owned authenticated claim page and completion action;
- a token endpoint dispatching the JWT-bearer and WorkOS claim grants;
- RFC 7009-style revocation where applicable;
- a provider event receiver only when SET verification and replay protection
  are implemented.

Do not expose the user-facing completion action as an agent tool.

## Model state separately

Use separate records for:

- **registration** — ID, tenant, type, status, agent context, provider subject,
  user binding, allowed scopes, created/expiry/revoked timestamps, credential
  generation;
- **delegation** — issuer, subject, tenant context, local user, consented
  scopes, link assurance, auth and revocation metadata;
- **claim attempt** — registration, email binding, hashed attempt token, hashed
  user code, status, attempt counter, created/expiry/completion timestamps;
- **agent credential** — registration, token hash or key identifier, scope,
  audience/resource, expiry, generation, revoked timestamp;
- **replay entry** — issuer, `jti`, expiry and tenant, stored in a shared
  atomic backend;
- **audit event** — actor category, registration/delegation IDs, event type,
  request correlation, policy result, timestamp, redacted metadata.

Never reuse a browser session ID, password hash, OAuth client secret, or user
refresh token as an agent credential.

## Dispatch `/agent/identity` by type

### `identity_assertion`

1. Enforce request and tenant rate limits before expensive cryptography.
2. Decode only enough JOSE header/payload to select configured issuer and key;
   do not trust decoded claims yet.
3. Enforce issuer and algorithm allowlists, resolve JWKS, verify signature,
   then validate all claims and replay state.
4. Resolve an existing delegation by stable provider identity
   `(iss, sub[, tenant])`.
5. JIT-provision only when policy permits and no existing account collision
   exists.
6. Require first-link step-up when verified email or phone matches an existing
   account without a delegation. Never bind silently.
7. Mint a short-lived service assertion with registration ID as subject and a
   generation or revocation marker.
8. Return scopes already narrowed by consent and current policy.

### `service_auth`

1. Require service-controlled validation and normalization of `login_hint`.
2. Create a pending registration without an agent credential.
3. Bind the intended email to the claim attempt.
4. Generate independent random `claim_token`, `claim_attempt_token`, and
   `user_code` values.
5. Store only their hashes and return each plaintext only where the protocol
   requires it.
6. Return a service-owned verification URI, user code, expiry, and interval.
7. Issue no service assertion or access token before successful user
   authentication and claim completion.

### `anonymous`

Keep disabled unless explicitly enabled by tenant policy. When enabled:

- allocate a strict per-IP and per-tenant quota;
- issue a short-lived registration and only minimal read-only pre-claim scopes;
- deny payment, export, sharing, mutation, personal-data, and administrative
  capabilities;
- require claim before any sensitive operation;
- revoke all pre-claim credentials and force a new credential generation at
  claim completion.

## Make the claim state machine atomic

Use explicit states such as `pending`, `attempt_active`, `claimed`, `denied`,
`expired`, and `revoked`. Permit only documented transitions. Perform code
verification, same-user binding, state change, old-token revocation, and new
credential issuance in one transaction or an idempotent state machine.

On the service-owned claim page:

1. Authenticate the user through the service's normal sign-in policy.
2. Apply SSO, MFA, bot detection, terms, tenant, and risk controls normally.
3. Display the service-controlled provider name, agent context, and requested
   scopes.
4. Require the signed-in user to enter the code.
5. Recheck email/user/tenant binding on both view and submit.
6. Compare the code safely, enforce attempt limits, and consume it once.

Never accept an agent-submitted code as proof of user presence.

## Dispatch token grants without collision

Route by exact `grant_type`:

- `urn:ietf:params:oauth:grant-type:jwt-bearer` — verify the service-signed
  assertion and issue an access token within its registration scope;
- `urn:workos:agent-auth:grant-type:claim` — look up the hashed claim token,
  enforce polling interval and state, and return pending/slow-down/expiry or
  the post-claim token response;
- `urn:ietf:params:oauth:grant-type:device_code` — route only to a separate RFC
  8628 implementation, never to auth.md claim storage.

Do not assume an OAuth framework's token handler accepts new grants merely
because it supports custom response fields. Implement and test dispatch,
validation, storage, and errors for each grant.

## Compute scopes monotonically

At every issuance, compute:

```text
issued = requested ∩ user-consented ∩ registration-allowed
         ∩ tenant-policy ∩ currently-available
```

For anonymous pre-claim issuance, intersect again with the minimal pre-claim
set. Claim completion may select the previously disclosed post-claim set but
must never add a scope the user did not see. Refresh or assertion exchange may
narrow scopes but never widen them. Require a new consent event for growth.

## Verify access and revocation

For JWT access tokens, validate signature, issuer, audience/resource, expiry,
scope, registration generation, and revocation policy. For opaque tokens,
store a keyed hash or cryptographic hash suited to token entropy and compare
without logging plaintext. Cache positive validation only inside the shortest
relevant revocation window.

Support revocation by token, registration, user, agent context, issuer,
provider key, tenant, and credential generation. Provide a bulk incident path
that can invalidate every delegation and credential from a compromised
provider or key without a table scan on the hot path.

## Return actionable errors

Use stable OAuth/profile error codes and generic public descriptions. Preserve
`login_required` versus `interaction_required`. Include `WWW-Authenticate`
where the client needs discovery or standardized recovery. Never leak whether
an arbitrary email has an account, signature internals, stored hashes, tokens,
or provider allowlist contents.
