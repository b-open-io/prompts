# Better Auth Integration

## State the capability gap first

Better Auth does not currently provide a native WorkOS auth.md plugin. Do not
represent any of these as auth.md support:

- `@better-auth/agent-auth` implements the separate, unstable
  [Agent Auth Protocol](https://better-auth.com/docs/plugins/agent-auth), with
  `/.well-known/agent-configuration`, agent/host registration, capability
  grants, approval, and agent-signed request JWTs.
- [OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider)
  Dynamic Client Registration creates OAuth clients at `/oauth2/register`.
- [Device Authorization](https://better-auth.com/docs/plugins/device-authorization)
  implements RFC 8628 with `/device/code`, `/device/token`, `device_code`, and
  the standard device-code grant.
- `/sign-up/email` creates an end-user account through Better Auth. It is not an
  agent-registration endpoint and must never be advertised as an OAuth
  `registration_endpoint` or auth.md identity endpoint.

Review the official docs and package versions again before implementation.
These integration notes were reviewed on 2026-07-15.

## Reuse appropriate primitives

Use Better Auth for:

- user, account, session, tenant/organization, adapter, and transactional
  persistence primitives;
- ordinary browser sign-in, sign-up, SSO, MFA, email verification, and session
  assurance on the service-owned claim page;
- JWT signing and JWKS publication, with an explicit auth.md compatibility
  endpoint or configured `jwks_uri` when WorkOS consumers expect a different
  path;
- OAuth Provider metadata, consent, scopes, token verification, introspection,
  revocation, storage, and rate-limiting primitives where their semantics
  match;
- bearer or API-key facilities for separately modeled agent credentials;
- hooks and audit integrations;
- the Device Authorization plugin only for actual RFC 8628 use cases;
- the Agent Auth plugin only when the product also wants that separate
  capability protocol.

Never share tables or token namespaces merely because two plugins use a
`user_code`, JWT, or `/agent/*` path.

## Build a custom auth.md plugin boundary

Use Better Auth's documented custom-plugin extension surface—custom endpoints,
schema, middleware/hooks, request/response hooks, and rate-limit rules—as
building blocks. Implement these auth.md-specific pieces explicitly:

1. RFC 9728 protected-resource metadata at the resource root.
2. RFC 8414 metadata extension containing `agent_auth`.
3. `/agent/identity` route dispatch for `identity_assertion`, `service_auth`,
   and optionally anonymous.
4. Claim attempt creation/re-initiation and a service-owned browser claim UI.
5. ID-JAG issuer/JWKS/client/audience/auth-time/replay validation.
6. Registration, delegation, claim, replay, agent-credential, audit, and
   revocation schema.
7. Service-signed identity assertions and their verification policy.
8. WorkOS claim-grant and JWT-bearer grant dispatch.
9. Hashing and lifecycle handling for claim artifacts and opaque tokens.
10. Provider revocation-event validation and bulk incident revocation.

Keep the auth.md layer behind one module boundary so a later native plugin or
protocol revision can replace it without changing browser authentication.

## Route the token endpoint honestly

Better Auth OAuth Provider documentation lists authorization code, client
credentials, and refresh token as its default supported grants. Treat
`customTokenResponseFields` as response decoration, not a way to implement a
new grant.

Choose one explicit architecture:

- place an application-level `/oauth2/token` dispatcher in front of Better
  Auth and route exact WorkOS grants to custom handlers while delegating
  supported OAuth grants to OAuth Provider; or
- expose a separate auth.md authorization-server origin and token endpoint,
  then advertise it consistently in PRM/AS metadata.

For a shared endpoint, prevent body parsing, client authentication, error
format, and rate-limit middleware from consuming or rewriting a request before
the selected grant handler sees it. Add contract tests for each grant and for
cross-store rejection (`claim_token` must never resolve as `device_code`).

## Map persistence without coupling secrets

Link an auth.md delegation to a Better Auth `user.id`, but keep these records
separate from ordinary sessions:

```text
authMdRegistration -> userId? + delegationId? + agentContext + scope policy
authMdDelegation   -> issuer + subject + tenant + userId + consent
authMdClaimAttempt -> registrationId + email binding + secret hashes + state
authMdCredential   -> registrationId + token hash/key id + scope + generation
authMdReplay       -> issuer + jti + expiresAt
```

Use adapter transactions or an idempotent workflow for claim completion and
revocation. Do not put claim tokens or access tokens in Better Auth session
metadata, cookies, user records, or OAuth client records.

## Use browser auth only on the service page

Route `verification_uri` through the product's normal Better Auth login/signup
experience, then return to a service-owned claim page. On that page:

- require an authenticated session;
- verify the intended email/user and tenant again;
- apply ordinary SSO/MFA/risk policy;
- show service-controlled provider and scope information;
- accept the user-entered code;
- complete the claim through server-side code.

The agent may open or display the URL but must not submit the code, call
`/sign-up/email` on behalf of the user, receive a password, or reuse the browser
session as an agent token.

## Avoid key and issuer surprises

Better Auth may expose JWKS at a framework-specific `/jwks` path while WorkOS
examples often use `/.well-known/jwks.json`. Publish the actual `jwks_uri` in
trusted configuration or add a deliberate compatibility alias. Never hard-code
the sample WorkOS path when integrating Better Auth.

Pin issuer and base-path behavior. Better Auth handlers commonly live under
`/api/auth`; RFC 8414 issuer and endpoint values must match externally visible
URLs exactly, including trusted proxy handling. Test host-header and forwarded
header attacks before enabling proxy trust.

## Coexist with Agent Auth or RFC 8628

If the product supports multiple protocols, isolate:

- discovery paths and metadata schemas;
- registration and approval tables;
- user-code formats and lookup namespaces;
- grant types and token handlers;
- JWT types, issuers, audiences, signing keys, and validation policy;
- audit event names and revocation semantics.

Label every UX surface with the protocol and requested capability/scope. Never
auto-convert an approval in one protocol into consent for another.
