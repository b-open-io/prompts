# Agent and Client Usage

## Preserve the human boundary

Treat the agent as a delegated client, never as the user's authenticator.

Before sending an `identity_assertion` request or a `service_auth` login hint:

1. Display the service-controlled resource name and canonical host.
2. Display the exact requested scopes in plain language.
3. Explain whether the action creates a new registration, links an account, or
   reuses an existing delegation.
4. State what the agent will be able to do and how the user can revoke it.
5. Obtain an affirmative user decision tied to this service and scope set.

Never ask for, receive, store, transmit, or choose a password. Never treat a
password already present in conversation history as permission to use it.

## Use identity assertion

Choose this flow only after discovery confirms ID-JAG support and the provider
is trusted by the service.

1. Request an audience-specific ID-JAG from the provider after consent.
2. POST the ID-JAG to the advertised `agent_auth.identity_endpoint` as
   `type: identity_assertion` with the ID-JAG assertion type.
3. On success, keep the service-signed `identity_assertion` separate from the
   original provider ID-JAG.
4. Exchange the service assertion at `token_endpoint` using the advertised
   JWT-bearer grant.
5. Send the resulting access token only to its bound resource and through the
   advertised bearer method.

Handle two user-interaction cases distinctly:

- On `login_required`, return to the agent provider, require the user to
  reauthenticate there, and mint a fresh ID-JAG with a real fresh `auth_time`.
  Do not send the user to the service claim page for this error.
- On `interaction_required`, display the service-owned claim URL and code so
  the user can approve first-link account linking at the service.

Never retry a rejected ID-JAG with a broader audience, older authentication,
different issuer, or suppressed identity claims.

## Use `service_auth` as the deployable fallback

Choose `service_auth` when the agent provider cannot mint ID-JAGs and the user
authorizes disclosure of a login email.

1. Obtain consent before sending `login_hint`.
2. POST `{ "type": "service_auth", "login_hint": "..." }` to the advertised
   identity endpoint.
3. Keep `claim_token` in volatile secret storage for the ceremony. Never print
   or log it.
4. Display `verification_uri` and `user_code` together.
5. Instruct the user to open the service-owned URL, authenticate directly with
   the service, and enter the code on that page.
6. Explicitly instruct the user not to send the code or a password back to the
   agent.
7. Poll the advertised token endpoint using the WorkOS claim grant and
   `claim_token`.
8. On success, store the access token and service assertion in the dedicated
   agent credential store; discard the plaintext claim artifacts.

The agent must not call the service's claim-completion form, even when it can
automate a browser. User presence and service-owned authentication are the
security boundary.

## Poll safely

Use the server's `interval` as a minimum. Apply these transitions:

| Result | Action |
|---|---|
| `authorization_pending` | Wait at least `interval`; keep the same attempt |
| `slow_down` | Add the server-directed delay or at least five seconds; retain the slower interval |
| `expired_token` | Stop polling; request a fresh claim attempt only if the outer claim remains valid |
| `access_denied` | Stop and tell the user; do not restart automatically |
| success | Replace old credentials atomically and stop polling |
| network/5xx | Retry with bounded exponential backoff inside the original expiry window |

Use monotonic time for polling deadlines. Add small jitter without polling
earlier than the minimum. Limit total polls and concurrent ceremonies. Never
turn `slow_down` into a high-frequency retry loop.

When a user-code attempt expires but the outer claim remains active, request a
fresh attempt through the advertised claim endpoint and show the new URI/code.
Do not reuse or display the old code. Restart registration only after the outer
claim expires or the service rejects re-initiation.

## Treat RFC 8628 as a different flow

Recognize the visual similarity but preserve the wire boundary:

- auth.md polling uses `claim_token` and
  `urn:workos:agent-auth:grant-type:claim`;
- RFC 8628 polling uses `device_code` and
  `urn:ietf:params:oauth:grant-type:device_code`.

Do not call auth.md `service_auth` "device authorization." Describe it as an
auth.md claim ceremony borrowing RFC 8628 user-code and polling vocabulary.

## Use and refresh agent credentials

Keep the original provider ID-JAG, service-signed assertion, and service access
token separate. Never attach any of them to browser cookies or ordinary user
sessions.

Refresh access by presenting the still-valid service assertion through the
JWT-bearer grant when the service supports that path. If the assertion is
expired or revoked, restart from `/agent/identity`. Do not silently use a user
refresh token or browser session as an agent credential.

Validate every token response before storage:

- require expected token type and bounded expiry;
- require returned scopes to be a subset of consented scopes;
- reject a changed issuer, audience, subject, registration, or tenant;
- never accept scope growth on claim, refresh, or retry;
- store opaque access tokens hashed where server-side lookup permits it and
  encrypted only where retrieval is operationally required.

## Handle revocation

On a 401 with updated `resource_metadata`, re-fetch and revalidate discovery
before any new authorization. On an explicit delegation revocation, delete
local agent credentials and stop work. Never fall back to anonymous
registration to evade a revoked user delegation.

Expose enough local identity to let the user identify the registration:
service, provider, scopes, agent context, creation time, last use, and revoke
status. Avoid displaying raw tokens or claim artifacts.
