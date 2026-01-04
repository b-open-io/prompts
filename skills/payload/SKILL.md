---
name: payload
description: This skill should be used when the user asks to "create a post", "edit a post", "update post content", "list posts", "convert markdown to Lexical", or mentions Payload CMS content management. Handles Payload REST API operations and markdown-to-Lexical conversion.
version: 0.1.0
---

# Payload CMS Operations

Manage Payload CMS content via the REST API, including creating and editing posts with markdown content converted to Lexical JSON format.

## When to Use

- Creating or editing posts/pages in Payload CMS
- Converting markdown content to Lexical rich text format
- Listing and querying Payload collections
- Bulk content updates via API

## Prerequisites

Before making API requests, identify the Payload instance:

1. **Base URL**: The site URL (e.g., `https://bopen.ai`)
2. **API Endpoint**: `/api/{collection}` (e.g., `/api/posts`)
3. **Authentication**: API key or session cookie if required

## Core Operations

### List Posts

Fetch existing posts to find IDs:

```bash
curl -s "https://bopen.ai/api/posts?limit=100" | jq '.docs[] | {id, title, slug}'
```

### Get Single Post

Retrieve a post by ID or slug:

```bash
# By ID
curl -s "https://bopen.ai/api/posts/{id}" | jq

# By slug (query)
curl -s "https://bopen.ai/api/posts?where[slug][equals]=my-post-slug" | jq '.docs[0]'
```

### Create Post

POST to the collection endpoint:

```bash
curl -X POST "https://bopen.ai/api/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post Title",
    "slug": "post-slug",
    "content": { ... lexical JSON ... },
    "_status": "published"
  }'
```

### Update Post

PATCH to update specific fields:

```bash
curl -X PATCH "https://bopen.ai/api/posts/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": { ... lexical JSON ... }
  }'
```

## Markdown to Lexical Conversion

Payload's rich text editor uses Lexical JSON format. To update post content from markdown:

1. Convert markdown to Lexical JSON structure
2. PATCH the `content` field with the Lexical root object

### Lexical JSON Structure

The content field expects this structure:

```json
{
  "root": {
    "type": "root",
    "format": "",
    "indent": 0,
    "version": 1,
    "children": [
      // paragraph, heading, list nodes go here
    ],
    "direction": "ltr"
  }
}
```

### Node Types

**Paragraph:**
```json
{
  "type": "paragraph",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    {"type": "text", "text": "Paragraph content", "format": 0, "version": 1}
  ],
  "direction": "ltr",
  "textFormat": 0
}
```

**Heading (h2):**
```json
{
  "type": "heading",
  "tag": "h2",
  "format": "",
  "indent": 0,
  "version": 1,
  "children": [
    {"type": "text", "text": "Heading Text", "format": 0, "version": 1}
  ],
  "direction": "ltr"
}
```

**Code Block:**
```json
{
  "type": "block",
  "format": "",
  "indent": 0,
  "version": 1,
  "fields": {
    "blockType": "code",
    "code": "const x = 1;",
    "language": "typescript"
  }
}
```

**Bold/Italic Text:**
Text format is a bitmask: 0=normal, 1=bold, 2=italic, 3=bold+italic

```json
{"type": "text", "text": "bold text", "format": 1, "version": 1}
```

### Conversion Process

To convert markdown to Lexical:

1. Parse markdown into blocks (paragraphs, headings, code, lists)
2. Map each block to the appropriate Lexical node type
3. Wrap in the root structure
4. POST/PATCH to Payload API

Use the `scripts/md-to-lexical.sh` script for conversion:

```bash
./scripts/md-to-lexical.sh input.md > lexical.json
```

Or use the Python script for more complex conversions:

```bash
python3 ./scripts/md_to_lexical.py input.md
```

## Authentication

### API Key (if configured)

```bash
curl -H "Authorization: users API-Key YOUR_API_KEY" ...
```

### Session Cookie

For authenticated operations, use a session cookie:

```bash
curl -b "payload-token=YOUR_TOKEN" ...
```

### No Auth Required

Some Payload instances allow public read/write. Check the collection's access control configuration.

## Common Workflows

### Update Post Content from Markdown

1. Write content in markdown file
2. Convert to Lexical JSON
3. Get post ID by slug
4. PATCH the content field

```bash
# Get post ID
POST_ID=$(curl -s "https://bopen.ai/api/posts?where[slug][equals]=my-post" | jq -r '.docs[0].id')

# Convert and update
python3 scripts/md_to_lexical.py content.md | \
  curl -X PATCH "https://bopen.ai/api/posts/$POST_ID" \
    -H "Content-Type: application/json" \
    -d @-
```

### Create New Post from Markdown

```bash
LEXICAL=$(python3 scripts/md_to_lexical.py content.md)

curl -X POST "https://bopen.ai/api/posts" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"My New Post\",
    \"slug\": \"my-new-post\",
    \"content\": $LEXICAL,
    \"_status\": \"published\"
  }"
```

## Payload Collections Reference

Common collections in Payload sites:

| Collection | Endpoint | Purpose |
|------------|----------|---------|
| posts | /api/posts | Blog posts |
| pages | /api/pages | Static pages |
| media | /api/media | Uploaded files |
| users | /api/users | User accounts |
| categories | /api/categories | Post categories |

## Error Handling

**400 Bad Request**: Invalid JSON or missing required fields
**401 Unauthorized**: Authentication required
**403 Forbidden**: Insufficient permissions
**404 Not Found**: Collection or document doesn't exist
**500 Server Error**: Check server logs

## Additional Resources

### Reference Files

- **`references/lexical-format.md`** - Complete Lexical node type reference
- **`references/payload-api.md`** - Full Payload REST API documentation

### Scripts

- **`scripts/md_to_lexical.py`** - Python markdown-to-Lexical converter
- **`scripts/md-to-lexical.sh`** - Bash wrapper for simple conversions
