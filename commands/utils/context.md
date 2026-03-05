---
allowed-tools: Read, Grep, Bash
description: Print a concise repository context snapshot for agents (git, pkg, dirs)
argument-hint: [--full] - Include dependency tree and env
---

## Your Task

If the arguments contain "--help", show this help and exit.

Otherwise, output a compact context snapshot to ground agents:

```bash
set -e
echo "# Repo Context"

echo "\n## Git"
git rev-parse --show-toplevel 2>/dev/null || true
git remote -v 2>/dev/null | sed 's/(fetch)//' || true
git describe --tags --abbrev=0 2>/dev/null || echo "no-tags"
git branch --show-current 2>/dev/null || true

echo "\n## Package"
if [ -f package.json ]; then
  cat package.json | jq '{name, version, packageManager, scripts: (.scripts // {} | to_entries | map({key: .key}) | .[0:8])}'
fi

echo "\n## Dirs"
ls -la | awk '{print $9}' | sed '/^$/d' | head -n 50

if [ "$1" = "--full" ]; then
  echo "\n## Deps (top)"
  bun pm ls --depth=0 || true
  echo "\n## Env (selected)"
  printf "NODE_ENV=%s\nXAI_API_KEY=%s\n" "${NODE_ENV:-unset}" "${XAI_API_KEY:+set}" | sed 's/set/[set]/; s/unset/[unset]/'
fi
```

Then stop.

