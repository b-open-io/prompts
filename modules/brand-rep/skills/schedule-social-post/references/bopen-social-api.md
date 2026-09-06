# bopen.ai social API contract

Read from the bopen-ai source on 2026-09-02. Re-check `https://bopen.ai/auth.md`
and `https://bopen.ai/api/openapi.json` when something disagrees; the live
documents win.

## Authentication (auth.md service-auth)

1. `GET https://bopen.ai/.well-known/oauth-protected-resource` → pick
   `authorization_servers[0]`.
2. `GET <issuer>/.well-known/oauth-authorization-server` → read
   `token_endpoint`, `revocation_endpoint`, and `agent_auth.identity_endpoint`
   / `agent_auth.claim_endpoint`. Today these are `/oauth2/token`,
   `/oauth2/revoke`, `/agent/identity`, `/agent/identity/claim`.
3. `POST <identity_endpoint>` JSON:
   ```json
   {"type":"service_auth","login_hint":"user@example.com","scope":"social:draft"}
   ```
   Response: `registration_id`, `claim_token`, `claim_token_expires`, and
   `claim: {user_code, verification_uri, expires_in, interval}`.
4. Show the user `verification_uri` and `user_code` together. They sign in on
   bopen.ai and enter the code there. The agent never submits the code.
5. Poll `POST <token_endpoint>` form-encoded:
   `grant_type=urn:workos:agent-auth:grant-type:claim&claim_token=<claim_token>`.
   `authorization_pending` → wait `interval` seconds (5 by default);
   `slow_down` → add five seconds; `access_denied` or `expired_token` → stop.
   If only the ten-minute code attempt expired, `POST <claim_endpoint>` with
   the same `claim_token` to get a fresh code.
6. Success returns `access_token` (1 hour), `expires_in`, and
   `identity_assertion` (24 hours). Re-mint with
   `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>&resource=https://bopen.ai`.
   There is no refresh token. The user revokes at `https://bopen.ai/agent/access`.

Scopes that matter here: `social:draft` (accounts, posts, media). `social:read`
is separate and only unlocks timeline reads in the site's own chat; it is not
needed to schedule.

Send `Authorization: Bearer <access_token>` on every call below. Responses are
`Cache-Control: private, no-store`.

## Endpoints (scope `social:draft`)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/social/accounts` | | `{accounts:[{id, xHandle, label, publishHealth}]}`; `publishHealth` ∈ `unverified`, `verified`, `reconnect_required` |
| GET | `/api/social/posts?account=&from=&to=` | | `{posts: SocialPost[]}` |
| POST | `/api/social/posts` | see below | `201 {post}`; with a repeated `Idempotency-Key` header, `200 {post}` |
| GET | `/api/social/posts/{id}` | | `{post}` or `404 {error:"Not found"}` |
| PATCH | `/api/social/posts/{id}` | `{items?, accountId?, tz?, planAt?, status?}` | `{post}`; only while status is `draft` or `planned` |
| DELETE | `/api/social/posts/{id}` | | `{ok:true}` |
| POST | `/api/social/media` | multipart `file`, or JSON `{"dataUrl":"data:image/png;base64,…"}` | `{media:{id,url,pathname,w,h,bytes,mime}}` |
| GET | `/api/social/next-slot?account=` | | `{publishAt: ISO}` |

Create body:

```json
{
  "accountId": "acc_…",
  "items": [
    {"text": "one", "media": [{"id": "<media uuid>"}]},
    {"text": "two"}
  ],
  "tz": "America/Detroit",
  "planAt": "next-free",
  "status": "planned"
}
```

- `items` is the thread, in order; one item is a single post. Each is posted
  as a reply to the previous item's tweet id.
- `status` for agents: `draft` or `planned`. Anything else → `403`.
- `planAt`: `"next-free"`, an ISO instant with `Z` or an offset, or `null`.
- Media ids come from `POST /api/social/media`. Up to 4 per item; all must
  share pixel dimensions.

Browser-session-only (the agent cannot call these; the user does them on the
review page): `POST /api/social/posts/{id}/confirm` (`{publishAt}` or
`{publishNow:true}` or `{slot:"next-free"}`), `/retry`, `/resolve`,
`/rotate-token`, and `GET|PUT /api/social/slots`.

## Post object

`SocialPost`: `id`, `userId`, `platform:"x"`, `accountId`, `accountSnapshot`
(with `profile.displayName`, `profile.xHandle`, `profile.avatarUrl` when
known), `status`, `tz`, `planAt`, `publishAt`, `reviewToken`, `attempts`,
`error`, `createdAt`, `updatedAt`, `items[]`.

`items[]`: `idx`, `text`, `media: MediaRef[]`, `remoteId` (tweet id once
posted), `callState` ∈ `idle | inflight | posted | ambiguous`.

Statuses: `draft → planned → scheduled → publishing → published`, plus `error`
and `cancelled`. The cron runs every five minutes and publishes anything
`scheduled` whose `publishAt` has passed. Slots snap to five-minute marks.
Default slots when the account has no rules: 09:00, 13:00, 17:00 on weekdays
in the account's zone.

## Preview

`https://bopen.ai/social/review/{reviewToken}`. No session is required to
view; the token is the secret. The owner's browser session adds the confirm,
retry, resolve, and delete controls. Image bytes for the page come from
`/api/social/review/{token}/media?i=<itemIdx>&m=<mediaIdx>`.

Share cards for the review URL come from `/api/og?review={token}` and show the
first item's text and first image only.

## Validation error codes

`empty_thread`, `x_weighted_length`, `media_count`, `media_dimensions`,
`unsupported_image`, `media_size`, `blob_missing`, `naive_datetime`. Slot
collisions return `409 {error:"That slot is taken.", occupyingId}`.
