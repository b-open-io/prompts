---
allowed-tools: Bash
description: Run basic auth security smoke checks (headers, cookies, rate limits)
argument-hint: <base_url> - e.g., https://api.example.com
---

## Your Task

If args are missing or contain "--help", show usage and exit.

Otherwise, run quick auth-focused checks against the provided BASE:

```bash
BASE="$1"; [ -z "$BASE" ] && echo "Usage: /auth-smoke <base_url>" && exit 0
set -e
echo "Testing: $BASE"

echo "\n# Security Headers"
curl -sI "$BASE/login" | rg -i 'strict-transport|content-security|frame-options|nosniff|referrer' || true

echo "\n# Cookie Flags"
curl -sI "$BASE/login" | rg -i 'set-cookie' || true

echo "\n# Rate Limit Response Mix (10x)"
seq 1 10 | xargs -I{} -n1 -P5 curl -s -o /dev/null -w '%{http_code}\n' "$BASE/login" | sort | uniq -c

echo "\nDone. Review headers and rate-limiting behavior."
```

Then stop.

