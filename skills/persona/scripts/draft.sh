#!/bin/bash
# Generate a styled draft post by combining persona + intelligence + git activity.
# Usage: draft.sh [--profile <path>] [--scan <path>] [--topic "specific angle"] [--parts 3] [--output <path>]
#
# Context assembly (mirrors satchmo.dev/api/x/regenerate-post):
#   1. Voice examples from persona profile (capture.sh output)
#   2. Body of work from work.json (work.sh output)
#   3. Recent git activity from configured repos (git-activity.sh)
#   4. Social intelligence / trending data (scan.sh output or live Grok)
#   5. Content strategy rules (references/content-strategy.md)
#
# Calls Claude API and outputs {thread: [{text, image_prompt}]} JSON.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCES_DIR="$(cd "$SCRIPT_DIR/../references" && pwd)"
PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"

PROFILE_PATH=""
SCAN_PATH=""
TOPIC=""
PARTS=3
OUTPUT=""
MODEL="claude-sonnet-4-6"

while [ $# -gt 0 ]; do
    case "$1" in
        --profile) PROFILE_PATH="$2"; shift 2 ;;
        --scan) SCAN_PATH="$2"; shift 2 ;;
        --topic) TOPIC="$2"; shift 2 ;;
        --parts) PARTS="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --model) MODEL="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Require ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY is not set"
    echo ""
    echo "1. Get an API key from https://console.anthropic.com/"
    echo "2. Export it: export ANTHROPIC_API_KEY=\"your-key\""
    exit 1
fi

# ── Resolve profile ──────────────────────────────────────────────
if [ -z "$PROFILE_PATH" ]; then
    if [ -d "$PERSONA_DIR" ]; then
        PROFILE_PATH=$(find "$PERSONA_DIR" -name "*.json" -not -name "pool.json" -not -name "topics.json" -not -name "last-scan.json" -not -name "work.json" -type f 2>/dev/null | while read -r f; do
            echo "$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0) $f"
        done | sort -rn | head -1 | awk '{print $2}')
    fi
fi

if [ -z "$PROFILE_PATH" ] || [ ! -f "$PROFILE_PATH" ]; then
    echo "Error: No persona profile found. Run: capture.sh --username <handle>"
    exit 1
fi

USERNAME=$(jq -r '.username' "$PROFILE_PATH")
EXAMPLES=$(jq -r '.examples | to_entries | .[] | "\(.key + 1). \(.value)"' "$PROFILE_PATH")
EXAMPLE_COUNT=$(jq '.examples | length' "$PROFILE_PATH")

echo "Profile: @$USERNAME ($EXAMPLE_COUNT voice examples)" >&2

# ── Body of work ─────────────────────────────────────────────────
WORK_CONTEXT="(no body of work configured — run work.sh add)"
if [ -f "$PERSONA_DIR/work.json" ]; then
    WORK_CONTEXT=$(bash "$SCRIPT_DIR/work.sh" context 2>/dev/null)
    if [ -z "$WORK_CONTEXT" ]; then
        WORK_CONTEXT="(no projects configured)"
    fi
fi
echo "Work: $(echo "$WORK_CONTEXT" | wc -l | tr -d ' ') projects" >&2

# ── Git activity ─────────────────────────────────────────────────
GIT_CONTEXT=$(bash "$SCRIPT_DIR/git-activity.sh" 2>/dev/null)
if [ -z "$GIT_CONTEXT" ]; then
    GIT_CONTEXT="(no recent git activity)"
fi
echo "Git: $(echo "$GIT_CONTEXT" | wc -l | tr -d ' ') commits" >&2

# ── Social intelligence ──────────────────────────────────────────
SCAN_CONTEXT=""
if [ -n "$SCAN_PATH" ] && [ -f "$SCAN_PATH" ]; then
    SCAN_CONTEXT=$(jq -r '
        "TECHNICAL DEVELOPMENTS:\n" + .trending + "\n\n" +
        "CONTENT OPPORTUNITIES:\n" + .opportunities + "\n\n" +
        "NOTABLE ACTIVITY:\n" + .notable + "\n\n" +
        "EARLY SIGNALS:\n" + .early_signals
    ' "$SCAN_PATH")
elif [ -f "$PERSONA_DIR/last-scan.json" ]; then
    SCAN_CONTEXT=$(jq -r '
        "TECHNICAL DEVELOPMENTS:\n" + .trending + "\n\n" +
        "CONTENT OPPORTUNITIES:\n" + .opportunities + "\n\n" +
        "NOTABLE ACTIVITY:\n" + .notable + "\n\n" +
        "EARLY SIGNALS:\n" + .early_signals
    ' "$PERSONA_DIR/last-scan.json")
fi
if [ -z "$SCAN_CONTEXT" ]; then
    SCAN_CONTEXT="(no scan data — run scan.sh first)"
fi
echo "Scan: loaded" >&2

# ── Content strategy ─────────────────────────────────────────────
STRATEGY=""
if [ -f "$REFERENCES_DIR/content-strategy.md" ]; then
    STRATEGY=$(cat "$REFERENCES_DIR/content-strategy.md")
fi

# ── Build system prompt (mirrors regenerate-post/route.ts) ───────
SYSTEM="You are @${USERNAME}. You write your own X/Twitter posts.
You are NOT an assistant drafting on behalf of someone — you ARE the person. Write in first person as yourself.

=== YOUR BODY OF WORK ===
${WORK_CONTEXT}

=== YOUR VOICE (${EXAMPLE_COUNT} examples, match this tone exactly) ===
These are your real tweets sorted by a blend of recency and engagement. Your new post MUST sound like these — same vocabulary, sentence structure, energy, and personality:

${EXAMPLES}

=== SOCIAL CONTENT STRATEGY ===
${STRATEGY}

RULES:
- Write EXACTLY like the voice examples above. Same energy, same style.
- Draw from trending topics AND recent work. Connect what's happening in the industry to what you're building.
- Every post should feel like it came from a real person sharing genuine thoughts, not a content calendar.
- Output valid JSON only. No markdown fences, no explanation."

# ── Build user prompt ────────────────────────────────────────────
TOPIC_LINE=""
if [ -n "$TOPIC" ]; then
    TOPIC_LINE="
=== SPECIFIC ANGLE ===
Focus on this topic/opportunity: ${TOPIC}
Connect it to your actual work and experience. Don't force it if there's no real connection.
"
fi

PROMPT="=== RECENT GIT ACTIVITY ===
${GIT_CONTEXT}

=== TRENDING RIGHT NOW ===
${SCAN_CONTEXT}
${TOPIC_LINE}
Generate a ${PARTS}-part thread. Return JSON: {\"thread\":[{\"text\":\"...\",\"image_prompt\":\"...\"},...]}. Each text max 280 chars. Include image_prompt on parts where a visual would boost engagement (null otherwise)."

echo "Generating ${PARTS}-part draft..." >&2

# ── Call Claude API ──────────────────────────────────────────────
RESPONSE=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "$(jq -n \
        --arg model "$MODEL" \
        --arg system "$SYSTEM" \
        --arg prompt "$PROMPT" \
        '{
            model: $model,
            max_tokens: 2048,
            temperature: 0.7,
            system: $system,
            messages: [{"role": "user", "content": $prompt}]
        }')")

# ── Parse response ───────────────────────────────────────────────
TEXT=$(echo "$RESPONSE" | jq -r '.content[0].text // empty')

if [ -z "$TEXT" ]; then
    echo "Error: No response from Claude API" >&2
    echo "$RESPONSE" | jq -r '.error.message // .' >&2
    exit 1
fi

# Clean markdown fences if present
CLEANED=$(echo "$TEXT" | sed 's/^```\(json\)\{0,1\}//;s/```$//' | sed '/^$/d')

# Validate JSON
if ! echo "$CLEANED" | jq -e '.thread' > /dev/null 2>&1; then
    # Try to extract JSON from response
    CLEANED=$(echo "$TEXT" | grep -o '{.*}' | head -1)
    if ! echo "$CLEANED" | jq -e '.thread' > /dev/null 2>&1; then
        echo "Error: Failed to parse response as JSON" >&2
        echo "Raw response:" >&2
        echo "$TEXT" >&2
        exit 1
    fi
fi

# Add username to output for playground compatibility
RESULT=$(echo "$CLEANED" | jq --arg u "$USERNAME" '. + {username: $u, parts: .thread}')

# Save output
if [ -n "$OUTPUT" ]; then
    echo "$RESULT" > "$OUTPUT"
    echo "Draft saved to $OUTPUT" >&2
fi

echo "$RESULT"
echo "" >&2
echo "Preview with: bun run \$(dirname \$0)/playground.ts --data $OUTPUT" >&2
