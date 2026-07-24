#!/bin/bash
# Fetch recent git commits from configured repos via the GitHub API.
# Usage: git-activity.sh [--repos "owner/repo1, owner/repo2"] [--per-repo 5] [--hours 48]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
WORK_FILE="$PERSONA_DIR/work.json"

# --- Defaults ---
ARG_REPOS=""
PER_REPO=5
HOURS=48

# --- Arg parsing ---
while [ $# -gt 0 ]; do
    case "$1" in
        --repos)    ARG_REPOS="$2";  shift 2 ;;
        --per-repo) PER_REPO="$2";   shift 2 ;;
        --hours)    HOURS="$2";      shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# --- Build repo list ---
REPOS_FROM_ARGS=""
if [ -n "$ARG_REPOS" ]; then
    # Normalize comma-separated list — one entry per line
    REPOS_FROM_ARGS=$(echo "$ARG_REPOS" | tr ',' '\n' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | grep -v '^$')
fi

REPOS_FROM_WORK=""
if [ -f "$WORK_FILE" ]; then
    REPOS_FROM_WORK=$(jq -r '.projects[] | select(.repo != null and .repo != "") | .repo' "$WORK_FILE" 2>/dev/null || true)
fi

# Combine and deduplicate
ALL_REPOS=$(printf "%s\n%s\n" "$REPOS_FROM_ARGS" "$REPOS_FROM_WORK" | grep -v '^$' | sort -u)

if [ -z "$ALL_REPOS" ]; then
    echo "(no repos configured — add repos to work.json or pass --repos)"
    exit 0
fi

# --- Compute since timestamp ---
SINCE=""
if date -u -v-"${HOURS}H" +"%Y-%m-%dT%H:%M:%SZ" > /dev/null 2>&1; then
    # macOS
    SINCE=$(date -u -v-"${HOURS}H" +"%Y-%m-%dT%H:%M:%SZ")
elif date -u -d "${HOURS} hours ago" +"%Y-%m-%dT%H:%M:%SZ" > /dev/null 2>&1; then
    # Linux
    SINCE=$(date -u -d "${HOURS} hours ago" +"%Y-%m-%dT%H:%M:%SZ")
fi

# --- Auth header ---
AUTH_HEADER=""
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $GITHUB_TOKEN"
fi

# --- Fetch commits for each repo ---
echo "$ALL_REPOS" | while IFS= read -r REPO; do
    [ -z "$REPO" ] && continue

    URL="https://api.github.com/repos/${REPO}/commits?per_page=${PER_REPO}"
    if [ -n "$SINCE" ]; then
        URL="${URL}&since=${SINCE}"
    fi

    if [ -n "$AUTH_HEADER" ]; then
        RESPONSE=$(curl -sf -H "Accept: application/vnd.github+json" -H "$AUTH_HEADER" "$URL" 2>/dev/null) || continue
    else
        RESPONSE=$(curl -sf -H "Accept: application/vnd.github+json" "$URL" 2>/dev/null) || continue
    fi

    # Skip if response is not a JSON array
    IS_ARRAY=$(echo "$RESPONSE" | jq -e 'if type == "array" then true else false end' 2>/dev/null) || continue
    [ "$IS_ARRAY" = "true" ] || continue

    echo "$RESPONSE" | jq -r --arg repo "$REPO" '
        .[] |
        "[" + $repo + "] " +
        (.commit.author.date | split("T")[0]) +
        ": " +
        (.commit.message | split("\n")[0])
    ' 2>/dev/null || true
done
