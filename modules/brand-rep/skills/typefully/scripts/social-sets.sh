#!/bin/bash
# List Typefully social sets (connected account groups), or the current user.
# Usage: ./social-sets.sh [--me] [--id <social_set_id>]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_deps
require_key

case "${1:-}" in
    --me)
        api_get "/me" | jq '.'
        ;;
    --id)
        [ -n "${2:-}" ] || { echo "Usage: social-sets.sh --id <social_set_id>" >&2; exit 1; }
        api_get "/social-sets/$2" | jq '.'
        ;;
    "")
        api_get "/social-sets" | jq '.'
        ;;
    *)
        echo "Usage: social-sets.sh [--me] [--id <social_set_id>]" >&2
        exit 1
        ;;
esac
