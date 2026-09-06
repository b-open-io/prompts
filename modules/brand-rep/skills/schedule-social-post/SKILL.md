---
name: schedule-social-post
version: 1.0.0
description: >-
  This skill should be used when the user asks to "schedule a post", "queue this
  on X", "draft a thread for bopen", "put this on the social calendar", "preview
  the post on bopen.ai", "make a carousel for X", or wants an agent to draft,
  attach images to, and plan an X post through the bopen.ai social scheduler
  from any agent harness. It covers the auth.md agent login, the social:draft
  API, thread and split-carousel rules, and the private review page where the
  user confirms. Not for Typefully, Buffer, or other schedulers, and not for
  LinkedIn or Threads, which bopen.ai does not publish to.
allowed-tools: Bash(curl:*), Bash(python3:*), Bash(${CLAUDE_PLUGIN_ROOT}:*)
---

# Schedule a social post on bopen.ai

bopen.ai has a social scheduler for X. An agent authenticates once with the
auth.md service-auth flow, uploads images, and creates a `planned` post. The
user opens the private review page, sees the post exactly as X will render it,
and confirms. Publishing runs on the site's cron. The agent never posts to X
itself, never holds the user's X credentials, and never confirms on the user's
behalf.

Read `references/bopen-social-api.md` for exact endpoint contracts and
`references/x-carousel.md` before attaching more than one image.

## Boundaries

- **Platform**: X only. The database rejects any other platform. Route
  LinkedIn or Threads requests to a per-platform draft the user pastes by hand.
- **Agent status ceiling**: `draft` and `planned`. `scheduled`, `publishing`,
  `published`, `error`, and `cancelled` are set only from the website session.
  A bearer token that tries to confirm receives `403 Confirm from the website
  session`.
- **Consent before login**: before running `login`, tell the user the host
  (`https://bopen.ai`), the exact scopes (`social:draft`, optionally
  `profile:read`), that a new agent registration links to their bOpen account,
  and that they can revoke it at `https://bopen.ai/agent/access`. Wait for a
  yes. Never ask for a password and never enter the user code yourself.
- **Outward-facing**: show the draft before creating the post, and show the
  review URL after. Do not create a post the user has not read.
- **No invented facts**: metrics, follower counts, quotes, and product claims
  come from the user or a verified source. If a figure is unknown, say so.

## Workflow

### 1. Take the brief

Capture the claim, the audience, whether it is one post or a thread, whether
images or a carousel are wanted, and when it should land. If timing is open,
plan for `next-free`, which takes the account's next configured slot.

### 2. Write the copy

Run `Skill(core:humanize)` on every draft and again on the final. Rules that
survive contact with X:

- One idea per post. A thread is one claim per item, each readable alone.
- Lead with the concrete thing. No throat-clearing, no "excited to announce".
- No hype adjectives, no stacked triads, no "not X, it's Y" pivots.
- Length is X-weighted: 280 units. Every URL counts as 23. Most emoji and CJK
  characters count as 2. The API rejects an item that is over
  (`x_weighted_length`), so count before you send.
- Threads: write the first item so it stands alone, then number nothing.
  The site posts each item as a reply to the previous one in order.
- A quoted X status URL left in the text renders as an embed on the review
  page. Keep it if that is the intent.

### 3. Prepare images

Images are optional. When the post wants visuals, brief Lisa
(`gemskills:content`) with exact pixel sizes and file names. Constraints the
API enforces:

- PNG, JPEG, GIF, or WebP; at most 10 MB per file; at most 4 per item.
- All images on one item must share identical pixel dimensions
  (`media_dimensions` error otherwise). This is also what makes the split
  carousel work.

For a carousel, follow `references/x-carousel.md`: one master scene cut into
two equal portrait tiles or three 1024×2048 slices, uploaded left to right.

### 4. Log in once

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/schedule-social-post/scripts/bopen-social.sh"
"$SCRIPT" login user@example.com "social:draft"
```

The script discovers the endpoints, starts service auth, prints the
verification URL and user code for the user, polls until they approve, and
stores the access token and identity assertion under `~/.core/bopen/` with
mode 600. Access tokens last one hour; `"$SCRIPT" refresh` mints a new one from
the 24-hour assertion without another ceremony. Set `BOPEN_ACCESS_TOKEN` to
bypass the file.

### 5. Upload, then create the post

```bash
"$SCRIPT" accounts                       # pick an account id, check publishHealth
"$SCRIPT" upload ./01-left.png           # -> {"media":{"id":...,"w":1024,"h":2048}}
"$SCRIPT" next-slot <accountId>          # optional: see when next-free lands
cat > post.json <<'JSON'
{
  "accountId": "<accountId>",
  "status": "planned",
  "planAt": "next-free",
  "tz": "America/Detroit",
  "items": [
    { "text": "First item.", "media": [{ "id": "<mediaId>" }] },
    { "text": "Second item." }
  ]
}
JSON
"$SCRIPT" create post.json               # sends an Idempotency-Key automatically
```

`planAt` accepts `next-free` or an ISO instant with an offset or `Z`. Naive
local datetimes are rejected (`naive_datetime`). `tz` is an IANA zone and
defaults to `America/Detroit`. A `409` with `occupyingId` means the slot is
taken; pick another instant or use `next-free`.

An account whose `publishHealth` is `reconnect_required` will fail to publish;
tell the user to reconnect X on bopen.ai before you plan against it.

### 6. Open the preview

```bash
"$SCRIPT" review-url <postId>     # https://bopen.ai/social/review/<token>
"$SCRIPT" open <postId>           # same, opened in the local browser when one exists
```

The review page renders the thread as X will show it: avatar, handle,
connector line, media grid, embedded quotes, and the **Post preview** dialog.
Portrait images with matching dimensions render as a side-by-side pair or a
swipe carousel, the same way X presents them. Give the user the URL in every
harness; in a harness with a browser tool, open it for them. The URL is
unguessable and private to the token; treat it like a secret.

### 7. Hand off

Tell the user the post is `planned` for `<time>` on `@<handle>` and that
confirming happens on the review page. If they ask for changes, `update` the
post while it is still `draft` or `planned`; once they confirm it is
`scheduled` and the site owns it. Run `Skill(core:confess)` before you finish.

## Errors you will meet

| Response | Meaning | Do |
|---|---|---|
| `401` with `WWW-Authenticate: Bearer … scope="social:draft"` | No or expired token | `refresh`, then `login` |
| `403 Agents cannot set scheduled…` | Status above the ceiling | Use `draft` or `planned` |
| `400 x_weighted_length` | Item too long | Cut, re-count |
| `400 media_dimensions` | Mixed image sizes on one item | Re-export at one size |
| `409 That slot is taken.` | Instant already booked | New instant or `next-free` |

## Script reference

`scripts/bopen-social.sh` subcommands: `login`, `refresh`, `whoami`,
`accounts`, `next-slot`, `upload`, `create`, `get`, `update`, `delete`,
`review-url`, `open`. Every command prints the raw JSON response so the agent
can read ids and errors directly. `BOPEN_SITE` overrides the host for a
preview deployment.
