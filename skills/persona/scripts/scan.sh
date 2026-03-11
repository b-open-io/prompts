#!/bin/bash
# Social intelligence scan — what's trending, what shipped, where are the content gaps.
# Usage: scan.sh [--topics "topic1, topic2"] [--pool] [--output <path>] [--save-topics] [--refresh]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
TOPICS=""
OUTPUT=""
SAVE_TOPICS=false
REFRESH=false
USE_POOL=false
TOPICS_FILE="$PERSONA_DIR/topics.json"
CACHE_FILE="$PERSONA_DIR/last-scan.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [ $# -gt 0 ]; do
    case "$1" in
        --topics) TOPICS="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --save-topics) SAVE_TOPICS=true; shift ;;
        --refresh) REFRESH=true; shift ;;
        --pool) USE_POOL=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$XAI_API_KEY" ]; then
    echo "Error: XAI_API_KEY is not set"
    echo ""
    echo "1. Get an API key from https://x.ai/api"
    echo "2. Export it: export XAI_API_KEY=\"your-key\""
    echo "3. Run this script again"
    exit 1
fi

mkdir -p "$PERSONA_DIR"

# Check cache (< 4 hours old)
if [ "$REFRESH" = false ] && [ -f "$CACHE_FILE" ]; then
    file_epoch=$(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo "0")
    now_epoch=$(date "+%s")
    age_hours=$(( (now_epoch - file_epoch) / 3600 ))
    if [ "$age_hours" -lt 4 ]; then
        echo "Using cached scan (${age_hours}h old, < 4h threshold). Pass --refresh to force." >&2
        cat "$CACHE_FILE"
        exit 0
    fi
fi

# Resolve topics
if [ -z "$TOPICS" ]; then
    if [ -f "$TOPICS_FILE" ]; then
        TOPICS=$(jq -r 'join(", ")' "$TOPICS_FILE")
    else
        TOPICS="Bitcoin SV, AI agents, developer tools"
    fi
fi

# Save topics if requested
if [ "$SAVE_TOPICS" = true ]; then
    echo "$TOPICS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s . > "$TOPICS_FILE"
    echo "Topics saved to $TOPICS_FILE" >&2
fi

echo "Scanning: $TOPICS" >&2

# Build the pool activity section if --pool is set
POOL_SECTION=""
if [ "$USE_POOL" = true ]; then
    POOL_FILE="$PERSONA_DIR/pool.json"
    if [ -f "$POOL_FILE" ]; then
        pool_users=$(jq -r '.users[].username' "$POOL_FILE" 2>/dev/null)
        if [ -n "$pool_users" ]; then
            handles=$(echo "$pool_users" | sed 's/^/@/' | tr '\n' ', ' | sed 's/,$//')
            POOL_SECTION="

Also include a section about recent activity from these specific accounts: ${handles}. What have they posted, engaged with, or discussed in the last 24 hours?"
        fi
    fi
fi

# Build prompt
PROMPT="Create a comprehensive social intelligence briefing about ${TOPICS} from X/Twitter activity and web sources in the last 24 hours.

Structure your response with these EXACT section headers (use --- as separator):

TECHNICAL DEVELOPMENTS
List 5-8 concrete technical things that shipped, were announced with working code, or sparked substantive debates among builders in the last 24 hours. Skip pure hype and product announcements without shipped substance.

---

CONTENT OPPORTUNITIES
Find 3-5 high-engagement questions, debates, or misconceptions that lack authoritative answers. These are opportunities to add value.

---

NOTABLE ACTIVITY
Top 5 announcements, launches, product updates, or hot takes from influential accounts (500+ likes).

---

EARLY SIGNALS
3-5 new tools, projects, or narratives just starting to gain traction — emerging discussions before they go mainstream.${POOL_SECTION}

Be concise and actionable. Include post links and engagement numbers where available."

# Call xAI Grok
RESPONSE=$(curl -s "https://api.x.ai/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -d "$(jq -n --arg prompt "$PROMPT" '{
        model: "grok-4-1-fast",
        input: [{"role": "user", "content": $prompt}],
        tools: [{"type": "x_search"}, {"type": "web_search"}]
    }')")

# Extract text from response
TEXT=$(echo "$RESPONSE" | jq -r '
    .output
    | if type == "array" then
        [.[] | select(.type == "message")] | last | .content[0].text // empty
      else empty end
')

if [ -z "$TEXT" ]; then
    echo "Error: No response from Grok API" >&2
    echo "$RESPONSE" | jq '.' >&2
    exit 1
fi

# Parse sections
parse_section() {
    local header="$1"
    local text="$2"
    echo "$text" | awk -v header="$header" '
        BEGIN { found=0; content="" }
        toupper($0) ~ toupper(header) { found=1; next }
        /^---/ { if (found) exit }
        found { content = content $0 "\n" }
        END { gsub(/^\n+|\n+$/, "", content); print content }
    '
}

TRENDING=$(parse_section "TECHNICAL DEVELOPMENTS" "$TEXT")
OPPORTUNITIES=$(parse_section "CONTENT OPPORTUNITIES" "$TEXT")
NOTABLE=$(parse_section "NOTABLE ACTIVITY" "$TEXT")
EARLY_SIGNALS=$(parse_section "EARLY SIGNALS" "$TEXT")

# Build pool activity if present
POOL_JSON="{}"
if [ "$USE_POOL" = true ] && [ -f "$PERSONA_DIR/pool.json" ]; then
    # Extract pool activity section from the full response
    POOL_ACTIVITY=$(echo "$TEXT" | awk '
        /POOL ACTIVITY|RECENT ACTIVITY FROM/ { found=1; next }
        /^---/ { if (found) exit }
        found { print }
    ')
    if [ -n "$POOL_ACTIVITY" ]; then
        POOL_JSON=$(echo "$POOL_ACTIVITY" | jq -Rs '{pool_summary: .}')
    fi
fi

# Build topics array
TOPICS_JSON=$(echo "$TOPICS" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build output JSON
RESULT=$(jq -n \
    --arg scanned_at "$NOW" \
    --argjson topics "$TOPICS_JSON" \
    --arg trending "$TRENDING" \
    --arg opportunities "$OPPORTUNITIES" \
    --arg notable "$NOTABLE" \
    --arg early_signals "$EARLY_SIGNALS" \
    --argjson pool_activity "$POOL_JSON" \
    '{
        scanned_at: $scanned_at,
        topics: $topics,
        trending: $trending,
        opportunities: $opportunities,
        notable: $notable,
        early_signals: $early_signals,
        pool_activity: $pool_activity
    }')

# Cache result
echo "$RESULT" > "$CACHE_FILE"
echo "Scan cached to $CACHE_FILE" >&2

# Output
if [ -n "$OUTPUT" ]; then
    echo "$RESULT" > "$OUTPUT"
    echo "Saved to $OUTPUT" >&2
fi

echo "$RESULT"
