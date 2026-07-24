#!/usr/bin/env bash
# Scan for hardcoded credentials and secrets in source code.
# Outputs JSON to stdout with findings. Always exits 0 (findings are informational).
set -euo pipefail

DIR="${1:-.}"
cd "$DIR"

# Patterns that suggest hardcoded secrets
PATTERNS='API_KEY|SECRET_KEY|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|aws_access|aws_secret|STRIPE_SK|DATABASE_URL|REDIS_URL|JWT_SECRET|ENCRYPTION_KEY|CLIENT_SECRET'

# Directories to skip
EXCLUDE_DIRS=".git|node_modules|vendor|dist|build|.next|coverage|__pycache__|.venv|bun.lock"

# Find matches
findings=""
count=0

while IFS= read -r match; do
  [ -z "$match" ] && continue

  file=$(echo "$match" | cut -d: -f1)
  line=$(echo "$match" | cut -d: -f2)
  snippet=$(echo "$match" | cut -d: -f3- | head -c 120 | sed 's/"/\\"/g' | tr '\n' ' ')

  # Detect which pattern matched
  pattern=$(echo "$snippet" | grep -oiE "$PATTERNS" | head -1 || echo "unknown")

  [ $count -gt 0 ] && findings="$findings,"
  findings="$findings
    {\"file\": \"$file\", \"line\": $line, \"pattern\": \"$pattern\", \"snippet\": \"$snippet\"}"
  count=$((count + 1))
done < <(grep -rnE "$PATTERNS" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rb' --include='*.env' --include='*.yaml' --include='*.yml' --include='*.toml' --include='*.json' --include='*.sh' . 2>/dev/null | grep -vE "($EXCLUDE_DIRS)" | grep -viE '(process\.env|os\.environ|os\.Getenv|ENV\[|import|require|from |type |interface |//)' | head -50 || true)

cat <<EOF
{
  "scan": "secrets",
  "directory": "$DIR",
  "findings": [$findings
  ],
  "count": $count
}
EOF
