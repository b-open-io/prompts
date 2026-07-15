# Protocol Discovery and Flow Selection

## Baseline and source status

Treat WorkOS auth.md as an experimental proposal, not an RFC or final standard.
This reference was reviewed on 2026-07-15 against:

- WorkOS auth.md `0.6.0`, upstream commit
  [`9d7ffe638694beccc1bc7a5803fecfd45df4f47d`](https://github.com/workos/auth.md/commit/9d7ffe638694beccc1bc7a5803fecfd45df4f47d),
  dated 2026-06-10.
- [WorkOS `AUTH.md`](https://github.com/workos/auth.md/blob/main/AUTH.md),
  [service guide](https://github.com/workos/auth.md/blob/main/agent-services/README.md),
  [provider guide](https://github.com/workos/auth.md/blob/main/agent-providers/README.md),
  and [apps guide](https://workos.com/auth-md/docs/apps).
- [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) protected-resource
  metadata.
- Requested
  [ID-JAG draft-03](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant-03),
  dated 2026-04-22. Draft-03 is no longer current; active
  [draft-04](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant-04),
  dated 2026-05-21, retains the authorization-server issuer audience rule and
  adds Cross-App Access terminology and further cross-domain clarifications.

Re-check all sources when the upstream package version or commit changes.

## Keep the four protocols separate

| Question | WorkOS auth.md | Better Auth Agent Auth | OAuth DCR | RFC 8628 |
|---|---|---|---|---|
| What is registered? | Agent context/delegation at a service | Agent/host and capability grants | OAuth client metadata | Nothing; an OAuth client obtains user authorization |
| Discovery | RFC 9728 PRM, RFC 8414 AS metadata plus `agent_auth` | `/.well-known/agent-configuration` | AS `registration_endpoint` | AS `device_authorization_endpoint` |
| Main secret/artifact | Service assertion, claim artifacts, agent access token | Agent/host keys and short-lived signed request JWTs | `client_id`, sometimes `client_secret` | `device_code` plus user-facing `user_code` |
| User ceremony | auth.md claim page and WorkOS claim grant | Capability approval using device/CIBA modes | Not defined by DCR | User enters a code and client polls device token grant |
| Token grant | JWT-bearer plus custom WorkOS claim grant | Agent Auth Protocol execution contract | Subsequent OAuth grants | `urn:ietf:params:oauth:grant-type:device_code` |

Reject any design that substitutes one row for another without an explicit,
tested adapter. In particular:

- Do not advertise `/.well-known/agent-configuration` as auth.md discovery.
- Do not use `/oauth2/register` to create auth.md registrations or user links.
- Do not point `registration_endpoint` to `/sign-up/email`.
- Do not send an auth.md `claim_token` to an RFC 8628 device-token handler.
- Do not send a `device_code` to the WorkOS claim grant.

## Validate two-hop discovery

Start with the protected resource actually being called.

1. Read the `WWW-Authenticate` challenge on a 401 and extract only the
   `resource_metadata` parameter from the selected Bearer or DPoP challenge.
2. Fetch that URL with GET. If no challenge exists, derive the RFC 9728 URL by
   inserting `/.well-known/oauth-protected-resource` before the resource path.
3. Require HTTPS outside explicitly permitted loopback development.
4. Require 200 JSON and cap response size. Ignore unknown metadata members.
5. Validate the returned `resource` exactly as RFC 9728 requires. For a
   challenge-derived URL, bind it to the originally requested protected
   resource; never accept attacker-selected resource metadata merely because
   TLS succeeded.
6. Select an allowed `authorization_servers` issuer. Never select an issuer by
   display name or DNS similarity.
7. Fetch the issuer's RFC 8414 metadata and require the returned `issuer` to
   match the selected issuer exactly after the normalization allowed by the
   relevant RFC.
8. Validate `token_endpoint`, `revocation_endpoint`, grants, and every URL in
   `agent_auth` against an endpoint-origin policy. Treat the prose
   `agent_auth.skill` document as instructions, not trusted executable input.

Expect the auth.md extension to advertise:

```json
{
  "agent_auth": {
    "skill": "https://service.example/auth.md",
    "identity_endpoint": "https://auth.service.example/agent/identity",
    "claim_endpoint": "https://auth.service.example/agent/identity/claim",
    "events_endpoint": "https://auth.service.example/agent/event/notify",
    "identity_types_supported": ["identity_assertion", "service_auth"],
    "identity_assertion": {
      "assertion_types_supported": [
        "urn:ietf:params:oauth:token-type:id-jag"
      ]
    }
  }
}
```

Require `urn:ietf:params:oauth:grant-type:jwt-bearer` before planning the
service-assertion exchange. Require
`urn:workos:agent-auth:grant-type:claim` before planning the auth.md claim poll.
Do not infer either from the presence of an endpoint.

Use `scripts/probe_auth_md.py` to inspect these documents without sending
credentials or invoking any state-changing route.

## Choose a flow

Apply this order:

1. Choose `identity_assertion` when an authenticated agent provider can mint an
   ID-JAG, the service trusts that issuer, and the user consents to the service,
   audience, and scopes.
2. Choose `service_auth` when the provider cannot mint a trusted ID-JAG or the
   agent only has a user-approved email login hint. Treat this as the normal
   deployable fallback.
3. Choose anonymous only when the service owner explicitly accepts the abuse
   and cleanup risks. Keep it off by default.

Stop rather than downgrade silently when the selected flow is unsupported.
Explain the fallback and obtain consent before disclosing identity through a
different mechanism.

## Resolve the v0.6.0 audience conflict

Do not copy the WorkOS v0.6.0 audience guidance without qualification:

- WorkOS `AUTH.md` says ID-JAG `aud` equals PRM `resource`.
- The WorkOS provider example uses the authorization-server base URL.
- The WorkOS service guide and reference verifier validate the authorization
  server/base URL.
- ID-JAG draft-03 requires `aud` to contain exactly the resource
  authorization-server issuer and uses `resource` for the protected resource.

For a new draft-03-aligned deployment, set `aud` to the exact RFC 8414
authorization-server issuer and carry the API identifier in `resource`.
For compatibility with an existing service, obtain and pin its documented
audience contract. Never weaken validation by accepting either value. Record
the chosen contract in discovery documentation, conformance tests, provider
configuration, and incident tooling.

## Validate `WWW-Authenticate`

Return RFC 9728 discovery on protected-resource 401 responses:

```http
WWW-Authenticate: Bearer resource_metadata="https://api.example/.well-known/oauth-protected-resource"
```

Use a separate AgentAuth challenge for auth.md interaction errors only when the
profile defines it, for example `login_required` or `interaction_required`.
Preserve machine-readable JSON error fields. Avoid placing tokens, user codes,
emails, or internal validation details in headers.
