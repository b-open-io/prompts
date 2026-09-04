#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v opencode >/dev/null
command -v bun >/dev/null
validation_root="$(mktemp -d)"
trap 'rm -rf "$validation_root"' EXIT
mkdir -p "$validation_root/project" "$validation_root/home"
export HOME="$validation_root/home"
export XDG_CONFIG_HOME="$validation_root/config"
export XDG_DATA_HOME="$validation_root/data"
export XDG_CACHE_HOME="$validation_root/cache"
export XDG_STATE_HOME="$validation_root/state"
bun "$repo_root/opencode/install.ts" --all --project "$validation_root/project" > "$validation_root/inventory.json"
cd "$validation_root/project"
# Regular output files avoid the CLI exiting before large pipe writes flush.
opencode debug config > "$validation_root/config.json"
opencode debug skill > "$validation_root/skills.json"
opencode debug agent bopen-core-front-desk > "$validation_root/agent.json"
python3 - "$validation_root" <<'PY'
import json,sys
from pathlib import Path
root=Path(sys.argv[1]); inventory=json.loads((root/'inventory.json').read_text()); config=json.loads((root/'config.json').read_text()); skills=json.loads((root/'skills.json').read_text()); agent=json.loads((root/'agent.json').read_text())
assert set(inventory['agents']) <= set(config['agent'])
assert set(inventory['commands']) <= set(config['command'])
assert set(inventory['skillPaths']) <= set(config['skills']['paths'])
assert any(s['name']=='hammertime' for s in skills)
assert 'OpenCode' in agent['prompt']
print(f"Native OpenCode discovery passed: {len(inventory['agents'])} agents, {len(inventory['commands'])} commands, {len(skills)} skills")
PY
