#!/bin/bash
# Assemble a style-matching prompt from a persona profile and draft content.
# Outputs a structured prompt payload — does NOT call an LLM.
# Usage: apply.sh --draft <path-or--> [--profile <path>] [--format thread|single] [--max-chars <n>]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCES_DIR="$(cd "$SCRIPT_DIR/../references" && pwd)"

PROFILE_PATH=""
DRAFT_PATH=""
FORMAT="thread"
MAX_CHARS=280

while [ $# -gt 0 ]; do
    case "$1" in
        --profile) PROFILE_PATH="$2"; shift 2 ;;
        --draft) DRAFT_PATH="$2"; shift 2 ;;
        --format) FORMAT="$2"; shift 2 ;;
        --max-chars) MAX_CHARS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Resolve profile path
if [ -z "$PROFILE_PATH" ]; then
    # Use most recently modified profile in persona dir
    if [ -d "$PERSONA_DIR" ]; then
        PROFILE_PATH=$(find "$PERSONA_DIR" -name "*.json" -not -name "pool.json" -not -name "topics.json" -not -name "last-scan.json" -type f 2>/dev/null | while read -r f; do
            echo "$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0) $f"
        done | sort -rn | head -1 | awk '{print $2}')
    fi
    if [ -z "$PROFILE_PATH" ] || [ ! -f "$PROFILE_PATH" ]; then
        echo "Error: No profile found. Run capture.sh first."
        echo "Usage: apply.sh --draft <path-or--> [--profile <path>]"
        exit 1
    fi
fi

if [ ! -f "$PROFILE_PATH" ]; then
    echo "Error: Profile not found: $PROFILE_PATH"
    exit 1
fi

# Read draft content
if [ -z "$DRAFT_PATH" ]; then
    echo "Error: --draft is required (use - for stdin)"
    echo "Usage: apply.sh --draft <path-or--> [--profile <path>] [--format thread|single]"
    exit 1
fi

if [ "$DRAFT_PATH" = "-" ]; then
    DRAFT=$(cat)
else
    if [ ! -f "$DRAFT_PATH" ]; then
        echo "Error: Draft file not found: $DRAFT_PATH" >&2
        exit 1
    fi
    DRAFT=$(cat "$DRAFT_PATH")
fi

if [ -z "$DRAFT" ]; then
    echo "Error: Draft content is empty" >&2
    exit 1
fi

# Load profile
USERNAME=$(jq -r '.username' "$PROFILE_PATH")
EXAMPLES=$(jq -c '.examples' "$PROFILE_PATH")
EXAMPLE_COUNT=$(echo "$EXAMPLES" | jq 'length')

# Build voice block
VOICE_BLOCK="These are real posts from @${USERNAME} sorted by a blend of recency and engagement. Match this tone exactly — same vocabulary, sentence structure, energy, and personality:"
NUMBERED_EXAMPLES=$(echo "$EXAMPLES" | jq -r 'to_entries | .[] | "\(.key + 1). \(.value)"')

# Load content strategy rules
STRATEGY=""
if [ -f "$REFERENCES_DIR/content-strategy.md" ]; then
    STRATEGY=$(cat "$REFERENCES_DIR/content-strategy.md")
fi

# Build format instruction
if [ "$FORMAT" = "thread" ]; then
    FORMAT_INSTRUCTION="Style-match this draft into a multi-part thread, max ${MAX_CHARS} chars each. First post must hook standalone. One idea per post. Return JSON: {\"thread\":[{\"text\":\"...\",\"image_prompt\":\"...\"},...]}. Include image_prompt where visuals would help (null otherwise)."
else
    FORMAT_INSTRUCTION="Style-match this draft into a single post, max ${MAX_CHARS} chars. Return JSON: {\"text\":\"...\",\"image_prompt\":\"...\"} where image_prompt is included if a visual would help (null otherwise)."
fi

# Build system prompt
SYSTEM="You are @${USERNAME}. You write your own posts. You are NOT an assistant drafting on behalf of someone — you ARE the person.

=== YOUR VOICE (${EXAMPLE_COUNT} examples, match this tone exactly) ===
${VOICE_BLOCK}

${NUMBERED_EXAMPLES}

=== CONTENT STRATEGY RULES ===
${STRATEGY}

Output valid JSON only. No markdown fences, no explanation."

# Build prompt payload
jq -n \
    --arg system "$SYSTEM" \
    --arg prompt "${FORMAT_INSTRUCTION}

Draft content:

${DRAFT}" \
    --arg output_schema '{ "thread": [{ "text": "string", "image_prompt": "string|null" }] }' \
    '{
        system: $system,
        prompt: $prompt,
        output_schema: $output_schema
    }'
