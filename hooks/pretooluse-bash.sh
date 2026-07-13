#!/bin/bash
# pretooluse-bash.sh
# Single PreToolUse entry point for the Bash/shell matcher. Sources the lib
# and the three individual checks once, then runs them in-process — one bash
# spawn instead of three — in the fixed order bouncer -> damage-control ->
# publish-gate, short-circuiting on first deny/ask (deny_permission/
# ask_or_deny in lib/common.sh always exit the process, so a deny anywhere
# in the chain stops the rest from running).
#
# Each check keeps its own hook_enabled("<name>") gate inside its _main
# function, so config semantics (per-hook enable/disable keys) are
# unchanged. bouncer.sh, damage-control.sh, and publish-gate.sh remain
# independently runnable — tests and Codex (which keeps its own 3-entry
# PreToolUse chain) call them directly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

input=$(cat)

# shellcheck source=bouncer.sh
source "${SCRIPT_DIR}/bouncer.sh"
# shellcheck source=damage-control.sh
source "${SCRIPT_DIR}/damage-control.sh"
# shellcheck source=publish-gate.sh
source "${SCRIPT_DIR}/publish-gate.sh"

bouncer_main "$input"
damage_control_main "$input"
publish_gate_main "$input"

exit 0
