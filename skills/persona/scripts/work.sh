#!/bin/bash
# Manage a "body of work" config — projects/products the persona has built.
# Usage: work.sh <add|remove|list|context> [options]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
WORK_FILE="$PERSONA_DIR/work.json"

ensure_work_file() {
    mkdir -p "$PERSONA_DIR"
    if [ ! -f "$WORK_FILE" ]; then
        echo '{"projects":[]}' > "$WORK_FILE"
    fi
}

cmd_add() {
    local title=""
    local desc=""
    local tags=""
    local url=""
    local repo=""

    while [ $# -gt 0 ]; do
        case "$1" in
            --title) title="$2"; shift 2 ;;
            --desc)  desc="$2";  shift 2 ;;
            --tags)  tags="$2";  shift 2 ;;
            --url)   url="$2";   shift 2 ;;
            --repo)  repo="$2";  shift 2 ;;
            *) echo "Unknown option: $1"; exit 1 ;;
        esac
    done

    if [ -z "$title" ] || [ -z "$desc" ] || [ -z "$tags" ]; then
        echo "Error: --title, --desc, and --tags are required"
        echo "Usage: work.sh add --title \"X\" --desc \"Y\" --tags \"a, b\" [--url URL] [--repo owner/repo]"
        exit 1
    fi

    ensure_work_file

    # Check for duplicate title
    if jq -e --arg t "$title" '.projects[] | select(.title == $t)' "$WORK_FILE" > /dev/null 2>&1; then
        echo "Error: Project \"$title\" already exists"
        exit 1
    fi

    # Parse comma-separated tags into JSON array
    local tags_json
    tags_json=$(echo "$tags" | jq -Rc '[split(", ") | .[] | ltrimstr(" ") | rtrimstr(" ") | select(. != "")]')

    # Build project object, omitting empty optional fields
    local project
    project=$(jq -n \
        --arg title "$title" \
        --arg desc "$desc" \
        --arg url "$url" \
        --arg repo "$repo" \
        --argjson tags "$tags_json" \
        '{title: $title, desc: $desc, tags: $tags, url: $url, repo: $repo}
        | del(.[] | select(. == ""))')

    jq --argjson p "$project" '.projects += [$p]' \
        "$WORK_FILE" > "${WORK_FILE}.tmp" && mv "${WORK_FILE}.tmp" "$WORK_FILE"

    echo "Added: $title"
}

cmd_remove() {
    local title="$1"
    if [ -z "$title" ]; then
        echo "Error: title required"
        echo "Usage: work.sh remove \"title\""
        exit 1
    fi

    ensure_work_file

    if ! jq -e --arg t "$title" '.projects[] | select(.title == $t)' "$WORK_FILE" > /dev/null 2>&1; then
        echo "Error: Project \"$title\" not found"
        exit 1
    fi

    jq --arg t "$title" '.projects = [.projects[] | select(.title != $t)]' \
        "$WORK_FILE" > "${WORK_FILE}.tmp" && mv "${WORK_FILE}.tmp" "$WORK_FILE"

    echo "Removed: $title"
}

cmd_list() {
    ensure_work_file

    local count
    count=$(jq '.projects | length' "$WORK_FILE")
    if [ "$count" = "0" ]; then
        echo "No projects. Add with: work.sh add --title \"X\" --desc \"Y\" --tags \"a, b\""
        exit 0
    fi

    echo "Projects ($count):"
    echo ""

    jq -r '.projects[] | [.title, .desc, (.tags | join(", ")), (.url // ""), (.repo // "")] | @tsv' "$WORK_FILE" \
    | while IFS=$'\t' read -r t d tgs u r; do
        printf "  %s\n" "$t"
        printf "    %s\n" "$d"
        printf "    Tags: %s\n" "$tgs"
        [ -n "$u" ] && printf "    URL:  %s\n" "$u"
        [ -n "$r" ] && printf "    Repo: %s\n" "$r"
        echo ""
    done
}

cmd_context() {
    ensure_work_file

    local count
    count=$(jq '.projects | length' "$WORK_FILE")
    if [ "$count" = "0" ]; then
        echo "No projects configured."
        exit 0
    fi

    jq -r '.projects[] | "- \(.title): \(.desc) (\(.tags | join(", ")))"' "$WORK_FILE"
}

# --- Main ---
ACTION="${1:-}"
shift || true

case "$ACTION" in
    add)     cmd_add "$@" ;;
    remove)  cmd_remove "$@" ;;
    list)    cmd_list ;;
    context) cmd_context ;;
    *)
        echo "Usage: work.sh <add|remove|list|context> [options]"
        echo ""
        echo "Commands:"
        echo "  add --title \"X\" --desc \"Y\" --tags \"a, b\" [--url URL] [--repo owner/repo]"
        echo "                         Add a project to the body of work"
        echo "  remove \"title\"         Remove a project by title"
        echo "  list                   Show all projects formatted"
        echo "  context                Output LLM-ready context (one line per project)"
        exit 1
        ;;
esac
