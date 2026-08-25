---
name: typefully
version: 1.0.0
description: Draft, schedule, and review social posts in Typefully across X, LinkedIn, Threads, Bluesky, and Mastodon. Use when asked to "draft this in Typefully", "schedule this post", "put it in the queue", "what's scheduled this week", "list my Typefully drafts", or when a social post needs to reach a real account. Creates plain drafts by default and never publishes without an explicit flag. Requires TYPEFULLY_API_KEY.
allowed-tools: Bash(curl:*), Bash(jq:*), Bash(${CLAUDE_SKILL_DIR}:*)
---

# Typefully

Draft, schedule, and review posts through the Typefully v2 API. One draft can
target X, LinkedIn, Threads, Bluesky, Mastodon, and Substack at once.

## Setup

```bash
export TYPEFULLY_API_KEY="your-key"   # Typefully → Settings → API
```

Every request sends `Authorization: Bearer $TYPEFULLY_API_KEY`. Keys inherit the
permissions of the user who created them.

## Find the social set first

Every draft belongs to a *social set* — a group of connected accounts. Get its id
before anything else:

```bash
${CLAUDE_SKILL_DIR}/scripts/social-sets.sh
```

Export it so the other scripts pick it up, or pass `--social-set <id>`:

```bash
export TYPEFULLY_SOCIAL_SET="12345"
```

## Create a draft

Each text argument becomes one post in the thread, in order.

```bash
# Plain draft on X — nothing is scheduled, nothing is published
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x "First post" "Second post"

# Same copy to X and LinkedIn
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --platform linkedin "One post"

# Give it a title in the Typefully sidebar
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --title "Launch thread" "..."
```

Valid platforms: `x`, `linkedin`, `threads`, `bluesky`, `mastodon`, `substack`,
`x_article`.

## Scheduling and publishing

**Both require an explicit flag. Without one the script only ever creates a
plain draft.** Confirm with the person before using either.

```bash
# Specific time — ISO 8601 with an offset, never a bare local time
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --at "2026-09-02T09:00:00-04:00" "..."

# Next open slot in the queue
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --at next-free-slot "..."

# Dated but inert — occupies a queue slot and waits for a human to confirm
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --plan "2026-09-02T09:00:00-04:00" "..."

# Publish immediately
${CLAUDE_SKILL_DIR}/scripts/draft.sh --platform x --publish-now "..."
```

`--plan` is the safest of the three: it reserves the slot without auto-publishing.

`--publish-now` is asynchronous. The response carries
`"publish_state": "in_progress"`; poll `drafts.sh --id <draft_id>` until it reads
`finished` before reporting the post as live.

## Review what exists

```bash
${CLAUDE_SKILL_DIR}/scripts/drafts.sh                    # all drafts
${CLAUDE_SKILL_DIR}/scripts/drafts.sh --status scheduled # scheduled only
${CLAUDE_SKILL_DIR}/scripts/drafts.sh --status published
${CLAUDE_SKILL_DIR}/scripts/drafts.sh --id 987           # one draft, full detail
${CLAUDE_SKILL_DIR}/scripts/drafts.sh --queue            # the queue view
```

Status values: `draft`, `scheduled`, `planned`, `published`, `publishing`,
`error`.

## Rules

1. **Never schedule or publish without an explicit go-ahead.** A plain draft is
   reversible; a published post is not.
2. **Always pass a timezone offset** in `--at` and `--plan`. A bare timestamp is
   interpreted somewhere you did not intend.
3. **Run the humanize pass before drafting here.** Typefully is the last stop,
   not the place to fix copy.
4. **Report the draft id and the Typefully URL** so the person can open it.
5. **Do not invent engagement numbers.** Read them from the analytics endpoints
   or say the data was not pulled.

## API surface

Base URL `https://api.typefully.com/v2`.

| Method | Path | Used by |
|---|---|---|
| GET | `/me` | `social-sets.sh --me` |
| GET | `/social-sets` | `social-sets.sh` |
| GET | `/social-sets/{id}/drafts` | `drafts.sh` |
| POST | `/social-sets/{id}/drafts` | `draft.sh` |
| GET | `/social-sets/{id}/drafts/{draft_id}` | `drafts.sh --id` |
| GET | `/social-sets/{id}/queue` | `drafts.sh --queue` |

Update, delete, media upload, tags, queue schedule, and analytics endpoints exist
but are not wrapped here — call them with `curl` directly and check the reference
below first, since this API is versioned and moves.

## References

- https://typefully.com/docs/api
- https://support.typefully.com/en/articles/8718287-typefully-api
