# Database Security with Payload CMS

## Row Level Security (RLS) Implementation

### Overview

Payload CMS uses application-level access control by default. However, for production-grade security, you must implement Row Level Security (RLS) at the database level to prevent unauthorized access via direct database connections.

### Why RLS is Critical

1. **Application-level filtering can be bypassed** - Direct database connections can read all data
2. **Defense in depth** - RLS provides database-level enforcement
3. **Compliance requirements** - Many security standards require database-level access controls
4. **Multi-tenant isolation** - Ensures users can only access their own data

### Implementation Steps

#### 1. Create RLS Migration

Create a new migration file in `src/migrations/`:

```typescript
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Helper function to get current user ID
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION get_current_user_id()
    RETURNS INTEGER
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $$
      SELECT NULLIF(CURRENT_SETTING('app.current_user_id', TRUE), '')::INTEGER;
    $$;
  `);

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

  // Enable RLS on tables
  await db.execute(sql`
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE users FORCE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS users_select_policy ON users;
    DROP POLICY IF EXISTS users_update_policy ON users;
    DROP POLICY IF EXISTS users_insert_policy ON users;
    DROP POLICY IF EXISTS users_delete_policy ON users;
    
    CREATE POLICY users_select_policy ON users
      FOR SELECT
      USING (id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
    
    CREATE POLICY users_update_policy ON users
      FOR UPDATE
      USING (id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
    
    CREATE POLICY users_insert_policy ON users
      FOR INSERT
      WITH CHECK ((SELECT is_admin()));
    
    CREATE POLICY users_delete_policy ON users
      FOR DELETE
      USING ((SELECT is_admin()));
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP FUNCTION IF EXISTS get_current_user_id();`);
  await db.execute(sql`DROP FUNCTION IF EXISTS is_admin();`);
  await db.execute(sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`);
}
```

#### 2. Register Migration

Add to `src/migrations/index.ts`:

```typescript
import * as migration_20260203_103216_enable_rls_security from "./20260203_103216_enable_rls_security";

export const migrations = [
  // ... existing migrations
  {
    up: migration_20260203_103216_enable_rls_security.up,
    down: migration_20260203_103216_enable_rls_security.down,
    name: "20260203_103216_enable_rls_security",
  },
];
```

#### 3. Run Migration

```bash
# Check status
bun run migrate:status

# Run migration (answer 'y' to dev mode warning)
echo "y" | bun run migrate
```

### Security Policy Patterns

#### User-Owned Data
```sql
-- Users can only access their own records
CREATE POLICY table_select_policy ON table_name
  FOR SELECT
  USING (user_id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
```

#### Public Read, Admin Write
```sql
-- Everyone can read, only admins can modify
CREATE POLICY plans_select_policy ON plans
  FOR SELECT USING (TRUE);

CREATE POLICY plans_insert_policy ON plans
  FOR INSERT WITH CHECK ((SELECT is_admin()));
```

#### Published Content
```sql
-- Public can read published content
CREATE POLICY posts_select_policy ON posts
  FOR SELECT
  USING (_status = 'published' OR (SELECT is_admin()));
```

### Performance Best Practices

1. **Always add indexes** on columns used in RLS policies:
   ```sql
   CREATE INDEX IF NOT EXISTS table_user_id_idx ON table_name (user_id);
   ```

2. **Use cached function calls**:
   ```sql
   -- Good: auth check cached per query
   USING (id = (SELECT get_current_user_id()) OR (SELECT is_admin()));
   
   -- Bad: function called per row
   USING (id = auth.uid() OR auth.role() = 'admin');
   ```

3. **Create security definer functions** for complex logic

### Tables Requiring RLS

| Table | Policy Type | Notes |
|-------|-------------|-------|
| `users` | User-isolated | Users see only their own profile |
| `api_keys` | User-isolated | API credentials protection |
| `deposits` | User-isolated | Financial data |
| `usage_logs` | User-isolated | Audit trails |
| `pages` | Published | Public read, admin write |
| `posts` | Published | Public read, admin write |
| `plans` | Public | Everyone read, admin write |
| `categories` | Public | Everyone read, admin write |
| `media` | Public | Everyone read, admin write |

### Verification

Check RLS status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

List all policies:
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Rollback

If needed, disable RLS:
```bash
bun run payload migrate:down
```

Or manually:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_name ON table_name;
```

## Additional Security Measures

1. **Use connection pooling** in production (PgBouncer)
2. **Enable SSL** for database connections
3. **Rotate credentials** regularly
4. **Monitor query logs** for suspicious activity
5. **Implement rate limiting** at the application level
6. **Use prepared statements** to prevent SQL injection

## Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Payload CMS Security Best Practices](https://payloadcms.com/docs/authentication/overview)
