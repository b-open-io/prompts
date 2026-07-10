#!/usr/bin/env bash
# Launch the Codex agent adapter generator (maintainer / CI use).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

export BOPEN_PLUGIN_ROOT="${PLUGIN_ROOT}"

GENERATOR="${PLUGIN_ROOT}/scripts/codex-agents/generate.py"
if [[ ! -f "${GENERATOR}" ]]; then
  echo "error: generator missing: ${GENERATOR}" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required" >&2
  exit 1
fi

exec python3 "${GENERATOR}" --plugin-root "${PLUGIN_ROOT}" "$@"
