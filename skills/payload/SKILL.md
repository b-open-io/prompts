---
name: payload
description: This skill should be used when the user asks to "create a post", "edit a post", "update post content", "list posts", "convert markdown to Lexical", "write article to Payload", or mentions Payload CMS content management. Handles both production and local Payload sites via REST API with authentication.
version: 0.4.0
---

# Payload CMS Operations

Manage Payload CMS content via REST API. Works with any Payload deployment (production or local).

## When to Use

- Creating or editing posts/pages in Payload CMS
- Converting markdown content to Lexical rich text format
- Listing and querying Payload collections
- Bulk content updates

## Workflow: REST API with Authentication

### Step 1: Determine the API Endpoint

Ask the user for their Payload site URL, or check common locations:

```bash
# Production site (ask user or check project config)
curl -s "https://your-site.com/api/posts?limit=1" | head -c 100

# Local development
curl -s "http://localhost:3000/api/posts?limit=1" 2>/dev/null | head -c 100
curl -s "http://localhost:3010/api/posts?limit=1" 2>/dev/null | head -c 100
```

### Step 2: Authenticate

For mutations (create/update/delete), authentication is required. Payload uses session-based auth.

**Option A: User provides credentials**
```bash
# Login to get auth token
curl -X POST "https://your-site.com/api/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "..."}' \
  -c cookies.txt

# Use the cookie file for authenticated requests
curl -X POST "https://your-site.com/api/posts" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "...", "content": {...}}'
```

**Option B: User logs in via admin UI**
Have the user log in at `/admin`, then extract the `payload-token` cookie from their browser for use in API calls.

### Step 3: Create/Update Content

```bash
# Create a post
curl -X POST "https://your-site.com/api/posts" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Post Title",
    "slug": "post-slug",
    "content": { "root": { ... } },
    "_status": "published"
  }'

# Update a post
curl -X PATCH "https://your-site.com/api/posts/POST_ID" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content": { "root": { ... } }}'
```

### Step 4: Verify

```bash
# Check the post was created
curl -s "https://your-site.com/api/posts?where[slug][equals]=post-slug" | jq '.docs[0]'
```

## Lexical JSON Structure

Payload's Lexical editor stores content as JSON:

```json
{
  "root": {
    "type": "root",
    "format": "",
    "indent": 0,
    "version": 1,
    "direction": "ltr",
    "children": [
      {
        "type": "paragraph",
        "format": "",
        "indent": 0,
        "version": 1,
        "direction": "ltr",
        "children": [
          {"type": "text", "text": "Content here", "mode": "normal", "format": 0, "detail": 0, "version": 1, "style": ""}
        ]
      }
    ]
  }
}
```

### Supported Node Types

| Markdown | Lexical Node |
|----------|--------------|
| Paragraphs | `paragraph` |
| `# Heading` | `heading` with tag h1-h6 |
| `**bold**` | text with format: 1 |
| `*italic*` | text with format: 2 |
| `` `code` `` | text with format: 16 |
| Code blocks | `block` with blockType: "code" |
| Lists | `list` with `listitem` children |
| `> quotes` | `quote` |

### Text Format Bitmask

| Value | Format |
|-------|--------|
| 0 | Normal |
| 1 | Bold |
| 2 | Italic |
| 3 | Bold + Italic |
| 16 | Code |

## Markdown to Lexical Conversion

The skill includes a Python script for converting markdown to Lexical JSON:

```bash
python3 ${SKILL_DIR}/scripts/md_to_lexical.py article.md > /tmp/content.json
```

## Common Collections

| Collection | Slug | Purpose |
|------------|------|---------|
| Posts | `posts` | Blog posts |
| Pages | `pages` | Static pages |
| Media | `media` | Uploaded files |
| Users | `users` | User accounts |

## Local Development Alternative

If working locally and REST auth is problematic, write an inline script in the project:

```typescript
// scripts/create-post.ts
import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
await payload.create({
  collection: 'posts',
  data: { title: '...', content: {...}, _status: 'published' }
})
process.exit(0)
```

Run with: `source .env.local && bunx tsx scripts/create-post.ts`

**Note**: If Drizzle prompts for schema migration, answer 'n' and use REST API instead.

## Payload CLI Commands

The Payload CLI provides comprehensive database and project management:

### Migration Commands
```bash
# Check migration status
bun run payload migrate:status

# Run pending migrations
bun run payload migrate

# Create a new migration
bun run payload migrate:create migration-name

# Rollback last migration
bun run payload migrate:down

# Rollback and re-run all migrations
bun run payload migrate:refresh

# Reset all migrations (rollback everything)
bun run payload migrate:reset

# Fresh start - drop all tables and re-run migrations
bun run payload migrate:fresh
```

### Generation Commands
```bash
# Generate TypeScript types from collections
bun run payload generate:types

# Generate import map
bun run payload generate:importmap

# Generate Drizzle database schema
bun run payload generate:db-schema
```

### Utility Commands
```bash
# Show Payload project info
bun run payload info

# Run a custom script with Payload initialized
bun run payload run scripts/my-script.ts
```

### Jobs Commands (if using Payload Jobs)
```bash
# Run queued jobs
bun run payload jobs:run

# Run jobs with options
bun run payload jobs:run --limit 10 --queue default

# Handle scheduled jobs
bun run payload jobs:handle-schedules
```

## Database Security (RLS)

**CRITICAL**: Payload uses application-level access control by default. For production security, implement Row Level Security (RLS) at the database level:

### Why RLS Matters
- Application-level filtering can be bypassed with direct database connections
- RLS enforces security at the database level
- Even table owners cannot bypass RLS when `FORCE ROW LEVEL SECURITY` is enabled

### RLS Migration Template

Create a migration for user-data tables:

```typescript
// src/migrations/YYYYMMDDHHMMSS_enable_rls.ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Helper function to check admin status
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION is_admin()
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $$
      SELECT COALESCE(
        CURRENT_SETTING('app.current_user_role', TRUE) = 'admin',
        FALSE
      );
    $$;
  `);

  // Enable RLS on sensitive tables
  await db.execute(sql`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE users FORCE ROW LEVEL SECURITY;
    
    -- Users can only access their own data
    CREATE POLICY users_select_policy ON users
      FOR SELECT USING (id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
    
    CREATE POLICY users_update_policy ON users
      FOR UPDATE USING (id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP FUNCTION IF EXISTS is_admin();`);
  await db.execute(sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`);
}
```

### Tables Requiring RLS
- `users` - User profiles and sensitive data
- `api_keys` - API credentials
- `deposits` - Financial transaction data
- `usage_logs` - Audit trails and usage data
- Any table with user-specific data

### Performance Optimization
- Always add indexes on columns used in RLS policies (e.g., `user_id`)
- Use `(SELECT function())` pattern for caching auth checks per query
- Create helper functions with `SECURITY DEFINER` for complex logic

## Migration Workflows

### Development Mode vs Migrations

**Development Mode (Push)**:
- Automatic schema updates via `push: true` (default)
- Good for rapid prototyping
- NOT for production

**Migration Mode**:
- Explicit schema control via migration files
- Required for production databases
- Version-controlled schema changes

### Typical Workflow

1. **Develop locally with push mode** (default)
   - Make changes to Payload config
   - Drizzle automatically pushes changes to local DB

2. **Create migration when feature is complete**
   ```bash
   bun run payload migrate:create feature-name
   ```

3. **Review generated migration** before committing

4. **Run migrations in production** before deployment
   ```bash
   # In CI/CD pipeline
   bun run payload migrate && bun run build
   ```

### Migration Sync Issues

If you get "dev mode" warnings when running migrations:

```bash
# Mark existing migrations as already run
psql "$DATABASE_URL" -c "
INSERT INTO payload_migrations (name, batch, created_at, updated_at)
SELECT * FROM (VALUES 
  ('20250101_000000_migration_name', 1, NOW(), NOW())
) AS v(name, batch, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM payload_migrations WHERE name = v.name
);
"
```

## Project Maintenance

### Dependency Updates
```bash
# Check for outdated packages
bun outdated

# Update specific packages
bun update package-name

# Update all packages
bun update
```

### Type Generation
After modifying collections or globals:
```bash
bun run generate:types
```

### Database Connection
Payload uses connection pooling. Common connection strings:
- `DATABASE_URI` - Primary connection (often pooled)
- `POSTGRES_URL_NON_POOLING` - Direct connection for migrations

### Troubleshooting

**Migration timeout**: Use non-pooled connection string
```bash
# Use POSTGRES_URL_NON_POOLING for migrations
DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env.local | cut -d'"' -f2)
```

**Drizzle schema prompts**: Answer 'n' to avoid conflicts with migrations

**Type errors after updates**: Run `bun run generate:types`

## Additional Resources

- **`references/lexical-format.md`** - Complete Lexical node type reference
- **`references/rest-api.md`** - Full REST API documentation
- **`references/database-security.md`** - RLS and security best practices
- **`scripts/md_to_lexical.py`** - Markdown to Lexical converter
- **`scripts/create-post.ts`** - Example local API script
- **Payload Docs**: https://payloadcms.com/docs
