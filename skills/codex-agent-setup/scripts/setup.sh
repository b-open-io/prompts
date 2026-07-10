#!/usr/bin/env bash
# Launch the bopen-tools Codex agent installer from a checkout or plugin cache.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# skill/scripts -> skill -> skills -> plugin root
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

if [[ ! -d "${PLUGIN_ROOT}/agents" || ! -d "${PLUGIN_ROOT}/scripts/codex-agents" ]]; then
  echo "error: could not resolve plugin root from ${SCRIPT_DIR}" >&2
  echo "expected agents/ and scripts/codex-agents/ under plugin root" >&2
  exit 1
fi

export BOPEN_PLUGIN_ROOT="${PLUGIN_ROOT}"

INSTALLER="${PLUGIN_ROOT}/scripts/codex-agents/install.py"
if [[ ! -f "${INSTALLER}" ]]; then
  echo "error: installer missing: ${INSTALLER}" >&2
  exit 1
fi

# Prefer python3; fail informatively if unavailable.
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required to install Codex agents" >&2
  exit 1
fi

exec python3 "${INSTALLER}" --plugin-root "${PLUGIN_ROOT}" "$@"
