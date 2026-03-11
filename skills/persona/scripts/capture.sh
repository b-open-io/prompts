#!/bin/bash
# Build a writing style profile from a user's X posts.
# Usage: capture.sh --username <handle> [--count <n>] [--output <path>] [--refresh]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
USERNAME=""
COUNT=50
OUTPUT=""
REFRESH=false

while [ $# -gt 0 ]; do
    case "$1" in
        --username) USERNAME="${2#@}"; shift 2 ;;
        --count) COUNT="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --refresh) REFRESH=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$USERNAME" ]; then
    echo "Error: --username is required"
    echo "Usage: capture.sh --username <handle> [--count <n>] [--output <path>] [--refresh]"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    echo "Error: X_BEARER_TOKEN is not set"
    echo ""
    echo "1. Get a bearer token from https://developer.x.com/en/portal/dashboard"
    echo "2. Export it: export X_BEARER_TOKEN=\"your-token\""
    echo "3. Run this script again"
    exit 1
fi

# Determine output path
if [ -z "$OUTPUT" ]; then
    OUTPUT="$PERSONA_DIR/${USERNAME}.json"
fi

mkdir -p "$(dirname "$OUTPUT")"

# Check cache (< 7 days old)
if [ "$REFRESH" = false ] && [ -f "$OUTPUT" ]; then
    file_epoch=$(stat -f %m "$OUTPUT" 2>/dev/null || stat -c %Y "$OUTPUT" 2>/dev/null || echo "0")
    now_epoch=$(date "+%s")
    age_days=$(( (now_epoch - file_epoch) / 86400 ))
    if [ "$age_days" -lt 7 ]; then
        echo "Using cached profile (${age_days}d old, < 7d threshold). Pass --refresh to force."
        cat "$OUTPUT"
        exit 0
    fi
fi

echo "Fetching posts for @$USERNAME..."

# Step 1: Get user ID
user_response=$(curl -s "https://api.x.com/2/users/by/username/${USERNAME}" \
    -H "Authorization: Bearer $X_BEARER_TOKEN")

USER_ID=$(echo "$user_response" | jq -r '.data.id // empty')
if [ -z "$USER_ID" ]; then
    echo "Error: Could not resolve @$USERNAME"
    echo "$user_response" | jq -r '.errors[0].detail // "User lookup failed"' 2>/dev/null
    exit 1
fi

echo "Resolved @$USERNAME -> $USER_ID"

# Step 2: Paginate tweets
ALL_TWEETS="[]"
PAGINATION_TOKEN=""
PAGES=0
MAX_PAGES=10

while [ "$PAGES" -lt "$MAX_PAGES" ]; do
    params="max_results=100&exclude=retweets&tweet.fields=created_at,public_metrics,lang,referenced_tweets"
    if [ -n "$PAGINATION_TOKEN" ]; then
        params="${params}&pagination_token=${PAGINATION_TOKEN}"
    fi

    response=$(curl -s "https://api.x.com/2/users/${USER_ID}/tweets?${params}" \
        -H "Authorization: Bearer $X_BEARER_TOKEN")

    # Check for rate limiting
    http_data=$(echo "$response" | jq -r '.data // empty')
    if [ -z "$http_data" ] || [ "$http_data" = "null" ]; then
        error_title=$(echo "$response" | jq -r '.title // .errors[0].title // empty' 2>/dev/null)
        if [ "$error_title" = "Too Many Requests" ]; then
            echo "Rate limited after $PAGES pages"
            break
        fi
        # No more data
        break
    fi

    # Append tweets
    page_tweets=$(echo "$response" | jq '.data')
    ALL_TWEETS=$(echo "$ALL_TWEETS" "$page_tweets" | jq -s '.[0] + .[1]')
    PAGES=$((PAGES + 1))

    # Check for next page
    PAGINATION_TOKEN=$(echo "$response" | jq -r '.meta.next_token // empty')
    if [ -z "$PAGINATION_TOKEN" ]; then
        break
    fi
done

TOTAL=$(echo "$ALL_TWEETS" | jq 'length')
echo "Fetched $TOTAL tweets across $PAGES pages"

# Step 3: Filter — original English posts only (no replies, no retweets)
FILTERED=$(echo "$ALL_TWEETS" | jq '[
    .[] | select(
        (.lang == "en" or .lang == null) and
        (
            .referenced_tweets == null or
            ([.referenced_tweets[] | select(.type == "replied_to")] | length == 0)
        )
    )
]')

FILTERED_COUNT=$(echo "$FILTERED" | jq 'length')
echo "Filtered to $FILTERED_COUNT original English posts"

# Step 4: Sort — 60% by recency + 40% by engagement score
# Engagement score: likes + 2*retweets + 3*quotes
RECENT_COUNT=$(echo "$COUNT" | awk '{printf "%d", $1 * 0.6 + 0.5}')
TOP_COUNT=$((COUNT - RECENT_COUNT))

# Get recent posts (already sorted by date from API)
BY_DATE=$(echo "$FILTERED" | jq ".[0:$RECENT_COUNT]")

# Get top engagement posts
BY_ENGAGEMENT=$(echo "$FILTERED" | jq "[
    .[] | . + {
        engagement_score: (
            .public_metrics.like_count +
            (.public_metrics.retweet_count * 2) +
            ((.public_metrics.quote_count // 0) * 3)
        )
    }
] | sort_by(-.engagement_score) | .[0:$TOP_COUNT]")

# Step 5: Combine and deduplicate
COMBINED=$(echo "$BY_DATE" "$BY_ENGAGEMENT" | jq -s '
    (.[0] + .[1]) | unique_by(.id)
' | jq ".[0:$COUNT]")

SAMPLE_COUNT=$(echo "$COMBINED" | jq 'length')

# Step 6: Compute metrics
METRICS=$(echo "$COMBINED" | jq '{
    avg_length: ([.[].text | length] | add / length | floor),
    median_engagement: (
        [.[] | .public_metrics.like_count + (.public_metrics.retweet_count * 2) + ((.public_metrics.quote_count // 0) * 3)]
        | sort
        | if length == 0 then 0
          elif length % 2 == 1 then .[length / 2 | floor]
          else (.[length / 2 - 1] + .[length / 2]) / 2 | floor
          end
    ),
    top_engagement: (
        [.[] | .public_metrics.like_count + (.public_metrics.retweet_count * 2) + ((.public_metrics.quote_count // 0) * 3)]
        | max // 0
    )
}')

# Step 7: Build profile JSON
EXAMPLES=$(echo "$COMBINED" | jq '[.[].text]')
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PROFILE=$(jq -n \
    --arg username "$USERNAME" \
    --arg captured_at "$NOW" \
    --argjson post_count "$TOTAL" \
    --argjson sample_count "$SAMPLE_COUNT" \
    --argjson examples "$EXAMPLES" \
    --argjson metrics "$METRICS" \
    '{
        username: $username,
        captured_at: $captured_at,
        post_count: $post_count,
        sample_count: $sample_count,
        examples: $examples,
        metrics: $metrics
    }')

echo "$PROFILE" > "$OUTPUT"
echo ""
echo "Profile saved to $OUTPUT ($SAMPLE_COUNT samples from $TOTAL posts)"
echo "$PROFILE"
