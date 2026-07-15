# Security, Consent, and Operations

## Define the assets and actors

Threat-model at least:

- malicious or compromised agent/provider/service;
- attacker-controlled metadata, redirect, JWKS, or `client_id` URL;
- intercepted claim URL, code, token, or assertion;
- code guessing and polling floods;
- replayed ID-JAG or revocation event;
- email/phone collision and account takeover;
- cross-tenant registration or token confusion;
- scope escalation during claim or renewal;
- compromised issuer key, provider, tenant, or operator account;
- logs, traces, analytics, backups, and support tools leaking secrets.

Treat every bearer artifact as a password-equivalent for its bounded authority,
but never mix it with the user's actual password or browser session.

## Require meaningful consent

Capture consent with:

- service-controlled identity and canonical domain;
- agent provider/platform/context;
- exact audience and resource;
- plain-language and machine scope set;
- one-time/persistent mode and expiry;
- account-link effect and revocation path;
- user, tenant, authentication assurance, timestamp, policy version, and
  request correlation.

Reject consent screens that hide write scopes behind a generic "continue."
Never infer consent from email ownership, prior sign-in, previous access to a
different service, or a provider-wide terms acceptance.

Require new consent for scope growth, new audience/resource, new tenant,
material provider identity change, or a downgraded security mode. Permit
policy-driven scope narrowing without interaction and surface the narrower
result.

## Protect account linking

Resolve a known `(iss, sub[, tenant])` delegation before considering mutable
identifiers. When a verified email or phone matches an existing user but the
provider subject is not linked, require the user to authenticate at the
service and explicitly approve linking. Apply MFA/SSO/domain policy normally.

Never let an issuer-controlled display name or email claim determine which
provider identity is shown. Never silently overwrite an existing delegation or
merge two users. Record link, unlink, conflict, and rejected-link events.

## Store secrets safely

Generate high-entropy `claim_token` and `claim_attempt_token` values. Generate
`user_code` with a CSPRNG and compensate for its small space using short TTL,
strict attempt limits, same-user binding, and rate limits.

Hash at rest:

- `claim_token`;
- `claim_attempt_token`;
- `user_code`;
- opaque access tokens.

Use a keyed hash where database lookup and defense against token-hash leakage
benefit from a server-held key. Store only the minimum searchable prefix or
identifier when necessary. Rotate hash keys with versioned verification.

Encrypt a secret only when the service must recover and present it later;
otherwise prefer non-recoverable hashes. Keep signing keys in KMS/HSM-backed
storage. Never place plaintext secrets in URLs except the protocol-required,
short-lived claim-attempt binding; apply `Referrer-Policy: no-referrer`, avoid
third-party content, and clear sensitive query state after binding.

Redact authorization headers, assertions, claim fields, codes, emails where
not necessary, cookies, and token responses from logs and traces. Test the
redactor with nested JSON, form bodies, headers, exceptions, and debug output.

## Enforce ID-JAG controls

Require:

- explicit issuer and algorithm allowlists;
- SSRF-safe, pinned JWKS resolution and bounded caching;
- signature, `typ`, `kid`, issuer, exact audience, `client_id`, tenant,
  `iat`/`exp`, fresh `auth_time`, verified identifier, and policy checks;
- short assertion lifetime and bounded clock skew;
- atomic shared `(iss, jti)` replay storage through expiry plus skew;
- first-link step-up for existing-account collisions;
- no reuse across downstream trust hops;
- optional sender-constraining only when end-to-end verification is complete.

Do not use successful signature verification as the entire authorization
decision.

## Rate-limit by cost and identity

Apply layered limits:

- edge/IP and network reputation;
- tenant/environment;
- issuer/provider/client;
- registration and user binding;
- endpoint and operation cost;
- concurrent active claim attempts.

Limit anonymous registration most aggressively. Reserve capacity for existing
users and revocation. Enforce claim-code attempts independently from claim
polling. Apply `slow_down` based on stored last-poll state; declaring the error
without measuring interval is not enforcement.

Use generic errors for email/user existence and signature detail. Return a
stable 429 or profile error plus a safe retry signal. Avoid reflecting attacker
input into error descriptions.

## Keep scopes from growing

Persist the originally disclosed/consented scope ceiling. At claim, exchange,
refresh, and policy reevaluation, issue only an intersection of that ceiling
and current authorization. Never copy current product-role permissions into an
old registration if doing so adds effective authority.

For anonymous registrations, define a small, explicit pre-claim allowlist.
Claim must revoke all pre-claim credentials and rotate generation before
post-claim issuance. Test that captured pre-claim tokens fail immediately.

## Audit lifecycle events

Write immutable, queryable audit events for:

- discovery/configuration and trust-list changes;
- registration create/reuse/deny/expire/revoke;
- consent grant/deny/change;
- ID-JAG accept/reject, replay, and stale authentication;
- claim requested, code minted, poll throttled, confirmed, denied, or expired;
- account link/unlink/conflict/step-up;
- assertion and token issue, use, renew, narrow, and revoke;
- provider SET receive/accept/reject/replay;
- bulk incident action and operator override.

Record stable IDs, actor category, tenant, policy result, scopes, timestamps,
and correlation IDs. Exclude plaintext secrets and minimize personal data.
Protect audit access and retention separately from application logs.

## Support complete revocation

Provide user-facing revocation by registration and provider. Provide operator
revocation by user, agent context, tenant, issuer, provider subject, client,
key ID, credential generation, and time window.

Make RFC 7009 token revocation idempotent. Treat registration/provider
revocation as broader than one access token: invalidate service assertions,
derived access tokens, pending claims, and future refresh/exchange. Ensure
cached decisions observe a bounded revocation delay.

Build and test a bulk incident path before launch:

1. Disable an issuer, key, client, or tenant from the trust policy.
2. Increment or revoke credential generations in bulk.
3. Stop new minting and exchange.
4. Invalidate caches and replay-sensitive state safely.
5. Notify affected users/operators without exposing secrets.
6. Preserve evidence and create a reconciliation job.
7. Require deliberate re-consent/re-link after recovery.

## Test abuse and recovery

Include negative tests for malformed discovery, metadata-origin change, issuer
mix-up, unknown/duplicate `kid`, weak algorithm, audience mismatch, expired and
future tokens, stale/missing `auth_time`, replayed `jti`, tenant mismatch,
email collision, code brute force, cross-user code completion, too-fast polls,
scope growth, pre-claim token survival, log leakage, revocation cache lag, and
bulk provider compromise.

Run table-driven state-machine tests and concurrency tests. Verify one-time
transitions under duplicate requests, retries, worker crashes, and multiple
replicas.
