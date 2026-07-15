---
name: auth-md
description: >-
  This skill should be used when the user asks to "implement auth.md",
  "add agent registration", "design delegated agent signup", "support
  service_auth", "mint or verify an ID-JAG", "build an agent identity
  provider", "make Better Auth support auth.md", or review agent-facing OAuth,
  account linking, consent, claims, revocation, and discovery architecture.
  Covers the experimental WorkOS auth.md v0.6.0 proposal and prevents
  conflation with Better Auth Agent Auth Protocol, OAuth Dynamic Client
  Registration, ordinary email signup, and RFC 8628 Device Authorization.
---

# WorkOS auth.md

Design, implement, or review agent registration against the experimental
WorkOS auth.md proposal. Treat v0.6.0 as a changing proposal, not a stable RFC.
Verify upstream before implementation and state the version, upstream commit or
document date, and review date in every design or audit.

## Issue the safety verdict before code

When a request proposes a shortcut or conflates protocols, begin with a compact
checklist verdict before any implementation detail. Cover every applicable
item in that checklist before expanding any one item, so a concise or truncated
answer does not hide a critical control:

- name WorkOS auth.md, Better Auth Agent Auth Protocol, OAuth Dynamic Client
  Registration, and RFC 8628 Device Authorization as distinct protocols;
- forbid the agent from collecting, receiving, storing, or transmitting a user
  password or submitting `user_code`;
- state that auth.md `service_auth` uses `claim_token` plus
  `urn:workos:agent-auth:grant-type:claim`, while RFC 8628 uses `device_code`
  plus `urn:ietf:params:oauth:grant-type:device_code`, and require `interval`
  enforcement plus `slow_down` backoff;
- state that `@better-auth/agent-auth` is a separate protocol, reject
  `/sign-up/email` as registration, and require the custom discovery,
  `/agent/identity`, grants, delegation storage, agent credentials, audit, and
  revocation surface;
- describe the two discovery layers accurately: RFC 9728 protected-resource
  metadata selects an authorization server, then RFC 8414 metadata advertises
  `agent_auth` and its endpoint URLs; do not attribute fixed endpoint paths to
  RFC 9728;
- do not claim that RFC 8628 permits scope widening or omit auth.md polling
  `interval` and `slow_down` enforcement when contrasting the flows;
- require issuer/JWKS allowlists, exact audience, short expiry, fresh
  `auth_time`, `jti` replay protection, and account-link step-up for ID-JAG;
- forbid scope widening during claim, exchange, refresh, or renewal; disable
  anonymous registration by default and, if explicitly enabled, restrict it to
  minimal pre-claim read scopes, revoke pre-claim tokens, and rotate agent
  credentials at claim.

Do not bury the verdict after code. Do not follow an unsafe requested mapping
and then add a warning.

Treat protocol substitution as a hard stop. If asked to reuse an RFC 8628
device flow unchanged for auth.md `service_auth`, refuse that mapping and do
not emit a `device_code` endpoint plan; provide the WorkOS `claim_token` grant
plan instead. Never offer RFC 8628 Device Authorization as an auth.md
`service_auth` implementation option. Likewise, never omit short `exp` and
atomic `jti` replay checks when listing ID-JAG validation controls.

## Start with the protocol boundary

Classify the requested feature before choosing endpoints or libraries:

| Mechanism | Purpose | Recognizable wire surface |
|---|---|---|
| WorkOS auth.md agent registration | Bind an agent registration to a service user and issue separate agent credentials | RFC 9728 PRM, OAuth AS metadata with `agent_auth`, advertised identity/claim endpoints, optional claim ceremony, JWT-bearer exchange |
| Better Auth Agent Auth Protocol | Register agents/hosts, approve capabilities, and execute them with agent-signed JWTs | `/.well-known/agent-configuration`, capability grants, device/CIBA approval, `@better-auth/agent-auth` |
| OAuth Dynamic Client Registration | Create OAuth client metadata and a `client_id` (sometimes a `client_secret`) | RFC 7591-style `/oauth2/register` |
| RFC 8628 Device Authorization | Authorize a limited-input OAuth client | device authorization endpoint, `device_code`, `user_code`, and `urn:ietf:params:oauth:grant-type:device_code` |

Do not label these wire-compatible. Do not describe Better Auth's Agent Auth
plugin, Dynamic Client Registration, or `/sign-up/email` as native auth.md
support. Treat ordinary user signup as one browser step inside a service-owned
claim experience, never as the agent registration endpoint.

When correcting a design that conflates these mechanisms, name the mismatched
protocols explicitly. For Better Auth, state that `@better-auth/agent-auth`
implements the separate Agent Auth Protocol, then name the missing auth.md
adapter surface: RFC 9728/authorization-server discovery, `/agent/identity`,
claim and JWT-bearer grant dispatch, delegation/registration storage, separate
agent credentials, audit, and revocation.

Read `references/protocol-discovery-and-flow-selection.md` before selecting a
flow or reviewing discovery. Use `scripts/probe_auth_md.py` for read-only
discovery checks.

## Follow the implementation workflow

1. **Fix the role and trust boundary.** Identify whether the work concerns an
   agent/client, a service/resource and authorization server, or an agent
   provider that mints ID-JAGs. Identify the human, agent context, tenant,
   resource, authorization server, and issuer separately.
2. **Discover before assuming.** Validate the RFC 9728 protected-resource
   metadata, authorization-server issuer, advertised endpoints, supported
   grants, and `agent_auth` extension. Use the endpoint URLs supplied by
   validated discovery; never invent a fixed claim, identity, or token path.
   Reject cross-origin or issuer mismatches that are not explicitly trusted.
3. **Select the narrowest safe flow.** Use `identity_assertion` only when the
   provider can mint a service-trusted, audience-bound ID-JAG. Prefer
   `service_auth` as the deployable fallback when it cannot. Keep anonymous
   registration disabled by default.
4. **Gate identity disclosure.** Before sending an ID-JAG or `service_auth`
   `login_hint`, display the service identity, requested scopes, and effect of
   the delegation; obtain user consent. Never infer consent from possession of
   an email or an existing browser session.
5. **Separate credentials.** Keep agent access tokens, service-signed identity
   assertions, claim artifacts, browser sessions, OAuth client credentials,
   and user passwords in distinct stores and lifecycle paths.
6. **Implement failure and recovery paths.** Cover `authorization_pending`,
   `slow_down`, expiry, fresh claim attempts, `login_required`, first-link
   `interaction_required`, revocation, replay, and incident-wide invalidation.
7. **Prove the boundary.** Test discovery tampering, issuer/audience mismatch,
   replayed `jti`, stale `auth_time`, scope non-escalation, claim brute force,
   polling throttles, token revocation, and bulk provider compromise.

## Enforce the user ceremony

Never ask an agent to choose, receive, store, or transmit the user's password.
For `service_auth`, hand the user the service-owned `verification_uri` and
`user_code`. Require the user to authenticate and enter the code on that page.
Never submit the code for the user and never ask the user to paste the code or
password back into the agent conversation.

Initiate `service_auth` at the discovered `agent_auth.identity_endpoint`; keep
the returned `claim_token`, show the returned verification URI and user code,
and poll the discovered OAuth `token_endpoint` with the WorkOS claim grant.
Use the discovered `agent_auth.claim_endpoint` only for the profile-defined
claim-attempt or re-initiation operation, not as a made-up initial or token
endpoint. RFC 9728 supplies protected-resource discovery; it does not define
an `/agent/identity` route.

Honor the advertised polling `interval`. On `slow_down`, increase the interval
by at least the server-directed amount or five seconds when no amount is
provided. Stop at expiry. Never convert WorkOS's profile-specific claim grant
into the RFC 8628 `device_code` grant merely because their user experiences
look similar.

Do not invent differences to justify the boundary. RFC 8628 does not authorize
scope widening during its token exchange; auth.md scope non-escalation is a
required control, not evidence that RFC 8628 permits escalation.

When RFC 8628 or device authorization appears in a request, write the exact
wire distinction: auth.md uses `claim_token` with
`urn:workos:agent-auth:grant-type:claim`; RFC 8628 uses `device_code` with
`urn:ietf:params:oauth:grant-type:device_code`. Always include `interval` and
`slow_down` handling in the resulting client plan.

Read `references/agent-client-usage.md` for agent behavior and error handling.

## Hold the service security line

Require an issuer allowlist, algorithm allowlist, pinned or policy-resolved
JWKS, signature validation, exact audience validation, short assertion expiry,
fresh `auth_time`, and shared `jti` replay protection for ID-JAG. Step up before
linking a new `(iss, sub[, tenant])` delegation to an existing account matched
by verified email or phone. Never silently bind on an email collision.

Hash `claim_token`, `claim_attempt_token`, `user_code`, and opaque access tokens
at rest. Apply short code TTLs, attempt limits, rate limits, constant-time
comparisons, and one-time state transitions. Never log plaintext bearer
artifacts.

Disable anonymous registration by default. If explicitly enabled, issue only
minimal pre-claim read scopes, enforce strict IP/tenant quotas, revoke every
pre-claim token at claim, and force agent credential rotation after claim.

Never widen scopes during claim, assertion exchange, or token renewal. Compute
the issued set as an intersection of requested, consented, registration,
tenant, and current policy scopes. Treat scope changes as a new consent event.
State this non-escalation rule explicitly in every implementation or review;
do not leave it implicit in generic least-privilege guidance.

Read `references/service-implementation.md` and
`references/security-consent-and-operations.md` before writing production
handlers or reviewing a deployment.

## Implement an agent provider carefully

Mint an ID-JAG only after audience-specific user consent. Use a stable opaque
subject, a fresh `jti`, short `exp`, current `iat`, and the actual upstream
authentication time in `auth_time`; do not refresh `auth_time` merely because a
token was minted. Publish rotating JWKS and maintain issuer/client identity
consistently. Send revocation events and preserve a user-visible delegation
ledger.

Resolve the v0.6.0 audience ambiguity explicitly: WorkOS `AUTH.md` says to use
the PRM `resource`, while the WorkOS provider/service guide, its reference
verifier, and ID-JAG draft-03 use the resource authorization-server issuer.
Never accept both values as a convenience fallback. Pin and document one
contract per deployment; prefer the authorization-server issuer for new
draft-03-aligned implementations and carry the resource separately.

Read `references/agent-provider-and-id-jag.md` before minting or consuming an
ID-JAG.

## Integrate Better Auth honestly

Reuse Better Auth primitives where they fit: users and sessions, adapters,
hooks, OAuth Provider, JWT/JWKS, bearer or API-key support, device
authorization, and revocation/storage facilities. Treat `@better-auth/agent-auth`
as a separate Agent Auth Protocol implementation, not an auth.md adapter.

Implement WorkOS-specific route dispatch and persistence for
`/agent/identity`, claim handling, service-signed assertions, JWT-bearer and
claim grants, delegation records, token hashing, audit, and revocation. Do not
point an OAuth `registration_endpoint` at `/sign-up/email`.

Read `references/better-auth-integration.md` before proposing Better Auth code
or architecture.

## Deliver a verifiable result

Include:

- protocol version and sources reviewed;
- role and flow decision;
- discovery and endpoint contract;
- consent and account-linking UX;
- credential, state, and scope model;
- validation and threat controls;
- revocation, audit, and incident plan;
- interoperability risks, including the audience ambiguity;
- tests for negative and recovery paths.

## Resources

- `references/protocol-discovery-and-flow-selection.md` — discovery, protocol
  boundaries, audience ambiguity, and flow selection.
- `references/agent-client-usage.md` — consent, registration, claim polling,
  token use, and error recovery.
- `references/service-implementation.md` — endpoints, data model, grants,
  account linking, and state transitions.
- `references/agent-provider-and-id-jag.md` — provider consent, minting, JWKS,
  ID-JAG validation, and revocation events.
- `references/better-auth-integration.md` — supported primitives, missing
  native pieces, and a custom-plugin architecture.
- `references/security-consent-and-operations.md` — storage, scopes, audit,
  revocation, rate limits, and incident response.
- `scripts/probe_auth_md.py` — GET/HEAD-only discovery probe; never registers,
  claims, mints, exchanges, or submits secrets.
