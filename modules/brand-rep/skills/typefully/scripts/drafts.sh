#!/bin/bash
# Review Typefully drafts.
#
# Usage:
#   ./drafts.sh                       # all drafts
#   ./drafts.sh --status scheduled    # draft|scheduled|planned|published|publishing|error
#   ./drafts.sh --id <draft_id>       # one draft in full
#   ./drafts.sh --queue               # the queue view
#   ./drafts.sh --social-set <id>     # override $TYPEFULLY_SOCIAL_SET

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_deps
require_key

VALID_STATUS="draft scheduled planned published publishing error"
STATUS=""
DRAFT_ID=""
SOCIAL_SET=""
QUEUE=0

while [ $# -gt 0 ]; do
    case "$1" in
        --status)
            [ -n "${2:-}" ] || { echo "--status needs a value" >&2; exit 1; }
            case " $VALID_STATUS " in
                *" $2 "*) STATUS="$2" ;;
                *) echo "Unknown status: $2 (valid: $VALID_STATUS)" >&2; exit 1 ;;
            esac
            shift 2 ;;
        --id)         DRAFT_ID="${2:-}"; shift 2 ;;
        --social-set) SOCIAL_SET="${2:-}"; shift 2 ;;
        --queue)      QUEUE=1; shift ;;
        -h|--help)    sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

SET_ID=$(resolve_social_set "$SOCIAL_SET") || exit 1
[ -n "$SET_ID" ] || { echo "Empty social set id." >&2; exit 1; }

if [ -n "$DRAFT_ID" ]; then
    api_get "/social-sets/${SET_ID}/drafts/${DRAFT_ID}" | jq '.'
elif [ "$QUEUE" = "1" ]; then
    api_get "/social-sets/${SET_ID}/queue" | jq '.'
elif [ -n "$STATUS" ]; then
    api_get "/social-sets/${SET_ID}/drafts?status=${STATUS}" | jq '.'
else
    api_get "/social-sets/${SET_ID}/drafts" | jq '.'
fi
