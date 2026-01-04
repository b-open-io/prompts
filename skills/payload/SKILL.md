---
name: payload
description: This skill should be used when the user asks to "create a post", "edit a post", "update post content", "list posts", "convert markdown to Lexical", or mentions Payload CMS content management. Handles Payload Local API operations and markdown-to-Lexical conversion.
version: 0.2.0
---

# Payload CMS Operations

Manage Payload CMS content using the Local API (preferred) or REST API. Includes markdown-to-Lexical JSON conversion for rich text fields.

## When to Use

- Creating or editing posts/pages in Payload CMS
- Converting markdown content to Lexical rich text format
- Listing and querying Payload collections
- Bulk content updates

## Authentication Strategy

Payload offers two API approaches:

| Approach | When to Use | Auth Required |
|----------|-------------|---------------|
| **Local API** | Running scripts in the project directory | No |
| **REST API** | External access, remote automation | Yes |

**Prefer Local API** for CLI workflows. It runs server-side with full database access and no authentication overhead.

## Local API Workflow

Run TypeScript scripts with the project's environment variables:

```bash
# From the Payload project directory
PAYLOAD_SECRET="..." DATABASE_URI="..." bunx tsx scripts/update-post.ts my-post-slug content.json
```

### Environment Variables

Required for Local API scripts:

| Variable | Purpose |
|----------|---------|
| `PAYLOAD_SECRET` | Payload encryption secret |
| `DATABASE_URI` | PostgreSQL/MongoDB connection string |
| `NEXT_PUBLIC_SERVER_URL` | Site URL (optional, for output links) |

### List Posts

```bash
PAYLOAD_SECRET="$SECRET" DATABASE_URI="$DB_URI" bunx tsx scripts/list-posts.ts
```

### Update Post Content

1. Convert markdown to Lexical JSON
2. Run the update script

```bash
# Convert markdown
python3 scripts/md_to_lexical.py article.md > /tmp/content.json

# Update the post
PAYLOAD_SECRET="$SECRET" DATABASE_URI="$DB_URI" bunx tsx scripts/update-post.ts my-post-slug /tmp/content.json
```

### Create New Post

```bash
PAYLOAD_SECRET="$SECRET" DATABASE_URI="$DB_URI" bunx tsx scripts/create-post.ts "Post Title" post-slug /tmp/content.json
```

## Markdown to Lexical Conversion

Payload's Lexical editor stores content as JSON. Convert markdown using the included Python script:

```bash
python3 scripts/md_to_lexical.py input.md > output.json
```

### Lexical JSON Structure

```json
{
  "root": {
    "type": "root",
    "format": "",
    "indent": 0,
    "version": 1,
    "children": [
      { "type": "paragraph", ... },
      { "type": "heading", "tag": "h2", ... }
    ],
    "direction": "ltr"
  }
}
```

### Supported Markdown Elements

| Markdown | Lexical Node Type |
|----------|-------------------|
| Paragraphs | `paragraph` |
| `# Heading` | `heading` with tag h1-h6 |
| `**bold**` | text with format: 1 |
| `*italic*` | text with format: 2 |
| `` `code` `` | text with format: 16 |
| Code blocks | `block` with blockType: "code" |
| Lists | `list` with `listitem` children |
| `> quotes` | `quote` |
| `---` | `horizontalrule` |
| `[links](url)` | `link` with fields.url |

### Text Format Bitmask

| Value | Format |
|-------|--------|
| 0 | Normal |
| 1 | Bold |
| 2 | Italic |
| 3 | Bold + Italic |
| 16 | Code |

## Inline Script Example

For simple updates without the helper scripts:

```typescript
import { getPayload } from "payload";
import configPromise from "@payload-config";

const payload = await getPayload({ config: configPromise });

// Find post by slug
const result = await payload.find({
  collection: "posts",
  where: { slug: { equals: "my-post" } },
});

// Update content
await payload.update({
  collection: "posts",
  id: result.docs[0].id,
  data: {
    content: { root: { ... } },
  },
});
```

## Common Collections

| Collection | Slug | Purpose |
|------------|------|---------|
| Posts | `posts` | Blog posts |
| Pages | `pages` | Static pages |
| Media | `media` | Uploaded files |
| Users | `users` | User accounts |
| Categories | `categories` | Post categories |

## Additional Resources

### Reference Files

- **`references/lexical-format.md`** - Complete Lexical node type reference with all fields
- **`references/rest-api.md`** - REST API documentation for external access

### Scripts

- **`scripts/md_to_lexical.py`** - Python markdown-to-Lexical converter
- **`scripts/md-to-lexical.sh`** - Bash wrapper for conversions
- **`scripts/list-posts.ts`** - List posts using Local API
- **`scripts/update-post.ts`** - Update post content using Local API
- **`scripts/create-post.ts`** - Create new post using Local API

## Troubleshooting

**"Cannot find module '@payload-config'"**
Run scripts from the Payload project root directory where `tsconfig.json` defines this path alias.

**"PAYLOAD_SECRET is required"**
Set the environment variable. Check the project's `.env` file for the correct value.

**"Database connection failed"**
Verify `DATABASE_URI` is correct and the database is accessible.

**Post not updating**
Check the post's `_status` field. Posts must be "published" to appear on the site.
