# Agent Provider and ID-JAG

## Apply the right standard layer

Treat ID-JAG as an evolving IETF draft used by the WorkOS auth.md profile.
Draft-03 defines the cross-domain identity assertion grant; WorkOS v0.6.0 adds
its own `/agent/identity` registration, service-signed assertion, required
`auth_time`, verified-identifier rules, and claim step-up.

Do not claim that implementing ID-JAG alone implements auth.md. Do not claim
that a Better Auth Agent Auth JWT is an ID-JAG.

## Obtain provider-side consent

Before minting, show:

- target service identity and exact authorization-server audience;
- protected resource when different from the audience;
- scopes or authorization details requested;
- agent platform and context that will receive the delegation;
- duration, one-time versus persistent consent, and revocation path.

Bind consent to user, issuer, client, audience, resource, scopes, tenant, and
agent context. Never reuse broad consent for a new audience or silently add
scopes.

## Mint a constrained assertion

For draft-03, include and validate the required `iss`, `sub`, `aud`,
`client_id`, `jti`, `exp`, and `iat` claims and JOSE `typ` value
`oauth-id-jag+jwt`. WorkOS additionally requires recent `auth_time` and at
least one verified email or phone signal for its resolution policy.

Apply these rules:

- use an opaque, stable, pairwise subject where possible;
- use the exact configured resource authorization-server issuer as `aud` for
  new draft-aligned deployments;
- carry protected-resource identifiers in `resource` rather than overloading
  `aud`;
- set `exp` to a short lifetime, approximately five minutes unless stricter;
- generate a cryptographically random, never-reused `jti`;
- set `auth_time` to the time of the user's real authentication, not token
  minting or refresh;
- include tenant context when the issuer or client identifiers are
  tenant-scoped;
- include only consented scopes/authorization details;
- identify the client consistently and preserve draft-required client
  continuity where the relying authorization server authenticates a client;
- use a fixed asymmetric algorithm allowlist and a current `kid`.

Never mint from a refresh token or long-lived session without applying current
policy and authentication-freshness requirements. Require interactive
reauthentication when freshness is insufficient.

## Publish identity and keys

Publish an HTTPS issuer and JWKS with planned rotation. Keep private signing
keys in managed key infrastructure. Publish overlapping old/new public keys
long enough to cover assertion lifetime and verifier cache behavior, then
retire old keys deliberately.

Use an OAuth Client ID Metadata Document only when the deployment has defined
and verified that trust model. Do not fetch an arbitrary `client_id` URL from
an unverified assertion. Resolve client identity through the issuer allowlist
and pinned policy first, then fetch/cross-check metadata with SSRF protections.

Never take the provider display name shown during account-link step-up directly
from an untrusted JWT or self-asserted metadata. Configure the service-owned
display name alongside its issuer allowlist.

## Verify an incoming ID-JAG

Apply this order to avoid confused-deputy and key-selection errors:

1. Parse with strict size, segment, JSON, duplicate-key, and supported-critical
   header limits.
2. Read unverified `iss`, `kid`, and `alg` only to select preconfigured policy.
3. Require exact issuer and algorithm allowlist matches.
4. Resolve keys through the issuer's pinned JWKS policy; reject missing,
   ambiguous, stale-without-refresh, or incompatible keys.
5. Verify the signature before trusting identity claims.
6. Require `typ: oauth-id-jag+jwt`.
7. Validate exact `aud`, bounded `iat`, short `exp`, acceptable clock skew,
   required `auth_time`, tenant binding, client identity, and verified identity
   signal.
8. Atomically reserve `(issuer, jti)` in a shared replay store through at least
   assertion lifetime plus skew. Reject an existing entry.
9. Apply current consent/scope policy and account resolution.
10. Require service-side step-up before linking a verified email/phone match to
    an existing account.

Never accept an assertion because its `email_verified` field is true when the
issuer is not explicitly trusted to assert that identity.

## Handle the v0.6.0 audience ambiguity

WorkOS v0.6.0 sources disagree. Prefer draft-03 and the WorkOS reference
verifier contract—authorization-server issuer as `aud`, optional API
`resource`—for new deployments. Pin legacy behavior per service when
interoperability requires it. Reject dual-audience fallback and multi-element
audience arrays when the chosen profile requires a single issuer.

## Revoke and audit

Give users a provider-side ledger of grants by service, resource, scopes, agent
context, authentication assurance, creation, last use, and status. Support
revocation of one context, one audience, all grants for a user, a tenant, a
client, a signing key, or the provider.

When emitting Security Event Tokens or another revocation signal:

- sign with an allowlisted key and unique event `jti`;
- target the exact relying service audience;
- include the minimum stable identifiers needed to find the delegation;
- protect against replay and retry delivery idempotently;
- never place access tokens, passwords, or claim artifacts in the event.

Assume push delivery can fail. Combine event-driven revocation with short
assertion/token lifetimes, generation checks, administrative bulk revocation,
and reconciliation jobs.
