#!/bin/bash
# Create a Typefully draft. Each text argument becomes one post in the thread.
#
# Usage:
#   ./draft.sh --platform x [--platform linkedin] [options] "post 1" ["post 2" ...]
#
# Options:
#   --platform <name>     Target platform; repeatable. Required.
#                         x | linkedin | threads | bluesky | mastodon | substack | x_article
#   --title <text>        Draft title shown in the Typefully sidebar
#   --social-set <id>     Override $TYPEFULLY_SOCIAL_SET
#   --at <when>           SCHEDULE: ISO 8601 with offset, or "next-free-slot"
#   --plan <when>         PLAN: reserve the slot without auto-publishing
#   --publish-now         PUBLISH IMMEDIATELY
#
# Without --at, --plan, or --publish-now this only ever creates a plain draft.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

require_deps
require_key

VALID_PLATFORMS="x linkedin threads bluesky mastodon substack x_article"
PLATFORMS=()
POSTS=()
TITLE=""
SOCIAL_SET=""
PUBLISH_AT=""
PLAN_AT=""

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
    case "$1" in
        --platform)
            [ -n "${2:-}" ] || { echo "--platform needs a value" >&2; exit 1; }
            case " $VALID_PLATFORMS " in
                *" $2 "*) PLATFORMS+=("$2") ;;
                *) echo "Unknown platform: $2 (valid: $VALID_PLATFORMS)" >&2; exit 1 ;;
            esac
            shift 2 ;;
        --title)       TITLE="${2:-}"; shift 2 ;;
        --social-set)  SOCIAL_SET="${2:-}"; shift 2 ;;
        --at)          PUBLISH_AT="${2:-}"; shift 2 ;;
        --plan)        PLAN_AT="${2:-}"; shift 2 ;;
        --publish-now) PUBLISH_AT="now"; shift ;;
        -h|--help)     usage; exit 0 ;;
        --*)           echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
        *)             POSTS+=("$1"); shift ;;
    esac
done

if [ ${#PLATFORMS[@]} -eq 0 ]; then
    echo "At least one --platform is required." >&2
    usage >&2
    exit 1
fi
if [ ${#POSTS[@]} -eq 0 ]; then
    echo "At least one post body is required." >&2
    usage >&2
    exit 1
fi
if [ -n "$PUBLISH_AT" ] && [ -n "$PLAN_AT" ]; then
    echo "--at/--publish-now and --plan are mutually exclusive." >&2
    exit 1
fi
# A bare timestamp lands in a timezone nobody chose. Demand an explicit offset.
for when in "$PUBLISH_AT" "$PLAN_AT"; do
    case "$when" in
        ""|now|next-free-slot) ;;
        *Z|*+[0-9][0-9]:[0-9][0-9]|*-[0-9][0-9]:[0-9][0-9]) ;;
        *)
            echo "Timestamp '$when' has no timezone offset." >&2
            echo "Use an ISO 8601 value such as 2026-09-02T09:00:00-04:00 (or a trailing Z)." >&2
            exit 1 ;;
    esac
done

SET_ID=$(resolve_social_set "$SOCIAL_SET") || exit 1
[ -n "$SET_ID" ] || { echo "Empty social set id." >&2; exit 1; }

# Build the body with jq --args so quotes, emoji, and embedded newlines in post
# text survive. Piping through `jq -R` would split a multi-line post into two.
POSTS_JSON=$(jq -n --args '$ARGS.positional | map({text: .})' -- "${POSTS[@]}")
PLATFORMS_JSON=$(jq -n --argjson posts "$POSTS_JSON" --args \
    'reduce $ARGS.positional[] as $p ({}; .[$p] = {enabled: true, posts: $posts})' \
    -- "${PLATFORMS[@]}")

BODY=$(jq -n \
    --argjson platforms "$PLATFORMS_JSON" \
    --arg title "$TITLE" \
    --arg publish_at "$PUBLISH_AT" \
    --arg plan_at "$PLAN_AT" \
    '{platforms: $platforms}
     + (if $title      == "" then {} else {draft_title: $title} end)
     + (if $publish_at == "" then {} else {publish_at: $publish_at} end)
     + (if $plan_at    == "" then {} else {plan_at: $plan_at} end)')

if [ -n "$PUBLISH_AT" ] || [ -n "$PLAN_AT" ]; then
    echo "→ ${PUBLISH_AT:+scheduling for $PUBLISH_AT}${PLAN_AT:+planning for $PLAN_AT} on social set $SET_ID" >&2
else
    echo "→ creating a plain draft on social set $SET_ID (nothing scheduled)" >&2
fi

api_request POST "/social-sets/${SET_ID}/drafts" "$BODY" | jq '.'
