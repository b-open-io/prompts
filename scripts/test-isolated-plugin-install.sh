#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# The marketplace ships each module on its own (git-subdir), so a module must
# not depend on files outside its directory. rsync -aL below would hide that.
python3 scripts/check-plugin-extraction.py

command -v claude >/dev/null || { echo "claude CLI is required" >&2; exit 1; }
command -v codex >/dev/null || { echo "codex CLI is required" >&2; exit 1; }

validation_root="$(mktemp -d)"
trap 'rm -rf "$validation_root"' EXIT
# Mirror a clean checkout: gitignored paths (node_modules, local skill
# mirrors) never reach the validation copy, so local runs match CI.
rsync -aL --filter=':- .gitignore' --exclude '.git' --exclude 'CLAUDE.md' \
  --exclude 'agents.md' "$repo_root/" "$validation_root/"

while IFS= read -r plugin_dir; do
  claude plugin validate --strict "$plugin_dir"
done < <(
  find "$validation_root" -name plugin.json -path '*/.claude-plugin/*' -print \
    | sed 's#/.claude-plugin/plugin.json$##' \
    | sort
)

if [[ "${CI:-}" != "true" ]]; then
  echo "Claude plugins validated. Codex installation is intentionally limited to a disposable CI runner."
  exit 0
fi

codex plugin marketplace add "$repo_root" --json

python3 - <<'PY' | while IFS= read -r plugin_name; do
import json
from pathlib import Path

marketplace = json.loads(Path('.agents/plugins/marketplace.json').read_text())
for plugin in marketplace['plugins']:
    source = plugin.get('source', {})
    if source.get('source') == 'local':
        print(plugin['name'])
PY
  codex plugin add "${plugin_name}@b-open-io" --json
done

codex plugin list
python3 scripts/run-plugin-harness.py
