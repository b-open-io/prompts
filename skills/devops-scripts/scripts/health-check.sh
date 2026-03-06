#!/usr/bin/env bash
# Check connectivity to Vercel, Railway, Redis, and PostgreSQL services.
# Outputs structured JSON to stdout. Missing tools produce JSON errors, not crashes.
set -euo pipefail

vercel_status="skipped"
vercel_error=""
railway_status="skipped"
railway_error=""
redis_status="skipped"
redis_error=""
postgres_status="skipped"
postgres_error=""

# --- Vercel ---
if command -v vercel >/dev/null 2>&1; then
  raw=$(vercel ls --scope "${VERCEL_ORG_ID:-}" 2>&1) && vercel_status="ok" || {
    vercel_status="error"
    vercel_error=$(echo "$raw" | head -3 | tr '"' "'" | tr '\n' ' ')
  }
else
  vercel_status="missing_tool"
  vercel_error="vercel CLI not found — install with: bun add -g vercel"
fi

# --- Railway ---
if command -v railway >/dev/null 2>&1; then
  raw=$(railway status 2>&1) && railway_status="ok" || {
    railway_status="error"
    railway_error=$(echo "$raw" | head -3 | tr '"' "'" | tr '\n' ' ')
  }
else
  railway_status="missing_tool"
  railway_error="railway CLI not found — install with: bun add -g @railway/cli"
fi

# --- Redis ---
if command -v redis-cli >/dev/null 2>&1; then
  redis_url="${REDIS_URL:-redis://localhost:6379}"
  # Extract host and port from URL (handles redis:// and rediss://)
  redis_host=$(echo "$redis_url" | sed -E 's|rediss?://([^:@/]+).*|\1|' | sed -E 's|.*@(.*)|\1|')
  redis_port=$(echo "$redis_url" | sed -E 's|.*:([0-9]+)(/.*)?$|\1|')
  redis_port="${redis_port:-6379}"

  raw=$(redis-cli -h "$redis_host" -p "$redis_port" PING 2>&1) || true
  if [ "$raw" = "PONG" ]; then
    redis_status="ok"
  else
    redis_status="error"
    redis_error=$(echo "$raw" | head -3 | tr '"' "'" | tr '\n' ' ')
  fi
else
  redis_status="missing_tool"
  redis_error="redis-cli not found — install redis-tools or use: brew install redis"
fi

# --- PostgreSQL ---
if command -v psql >/dev/null 2>&1; then
  db_url="${DATABASE_URL:-postgresql://localhost:5432/dev}"
  raw=$(psql "$db_url" --command "SELECT 1" --no-align --tuples-only 2>&1) || true
  if echo "$raw" | grep -q "^1$"; then
    postgres_status="ok"
  else
    postgres_status="error"
    postgres_error=$(echo "$raw" | head -3 | tr '"' "'" | tr '\n' ' ')
  fi
else
  postgres_status="missing_tool"
  postgres_error="psql not found — install with: brew install postgresql"
fi

# --- Determine overall health ---
overall="ok"
for s in "$vercel_status" "$railway_status" "$redis_status" "$postgres_status"; do
  if [ "$s" = "error" ]; then
    overall="error"
    break
  fi
done

cat <<EOF
{
  "overall": "$overall",
  "services": {
    "vercel": {
      "status": "$vercel_status",
      "error": "$vercel_error"
    },
    "railway": {
      "status": "$railway_status",
      "error": "$railway_error"
    },
    "redis": {
      "status": "$redis_status",
      "error": "$redis_error"
    },
    "postgres": {
      "status": "$postgres_status",
      "error": "$postgres_error"
    }
  }
}
EOF
