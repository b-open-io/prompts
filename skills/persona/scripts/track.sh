#!/bin/bash
# Manage the persona pool — a roster of X usernames whose public activity is tracked.
# Usage: track.sh <add|remove|list|refresh> [username] [--note "reason"]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
POOL_FILE="$PERSONA_DIR/pool.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ensure_pool() {
    mkdir -p "$PERSONA_DIR"
    if [ ! -f "$POOL_FILE" ]; then
        echo '{"users":[]}' > "$POOL_FILE"
    fi
}

cmd_add() {
    local username="${1#@}"
    local note=""

    shift || true
    while [ $# -gt 0 ]; do
        case "$1" in
            --note) note="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -z "$username" ]; then
        echo "Error: username required"
        echo "Usage: track.sh add <username> [--note \"reason\"]"
        exit 1
    fi

    ensure_pool

    # Check if already tracked
    if jq -e --arg u "$username" '.users[] | select(.username == $u)' "$POOL_FILE" > /dev/null 2>&1; then
        echo "Already tracking @$username"
        jq --arg u "$username" '.users[] | select(.username == $u)' "$POOL_FILE"
        exit 0
    fi

    # Validate username exists via X API (if token available)
    if [ -n "$X_BEARER_TOKEN" ]; then
        local user_check
        user_check=$(curl -s "https://api.x.com/2/users/by/username/${username}" \
            -H "Authorization: Bearer $X_BEARER_TOKEN")
        local user_id
        user_id=$(echo "$user_check" | jq -r '.data.id // empty')
        if [ -z "$user_id" ]; then
            echo "Error: @$username not found on X"
            echo "$user_check" | jq -r '.errors[0].detail // "User lookup failed"' 2>/dev/null
            exit 1
        fi
        echo "Validated @$username (ID: $user_id)"
    else
        echo "Warning: X_BEARER_TOKEN not set, skipping username validation"
    fi

    # Add to pool
    local now
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg u "$username" --arg n "$note" --arg t "$now" \
        '.users += [{"username": $u, "added_at": $t, "note": $n}]' \
        "$POOL_FILE" > "${POOL_FILE}.tmp" && mv "${POOL_FILE}.tmp" "$POOL_FILE"

    echo "Added @$username to pool"
    [ -n "$note" ] && echo "Note: $note"

    # Optionally capture profile
    if [ -n "$X_BEARER_TOKEN" ]; then
        echo ""
        echo "Capturing writing profile..."
        bash "$SCRIPT_DIR/capture.sh" --username "$username"
    fi
}

cmd_remove() {
    local username="${1#@}"
    if [ -z "$username" ]; then
        echo "Error: username required"
        echo "Usage: track.sh remove <username>"
        exit 1
    fi

    ensure_pool

    if ! jq -e --arg u "$username" '.users[] | select(.username == $u)' "$POOL_FILE" > /dev/null 2>&1; then
        echo "Error: @$username is not in the pool"
        exit 1
    fi

    jq --arg u "$username" '.users = [.users[] | select(.username != $u)]' \
        "$POOL_FILE" > "${POOL_FILE}.tmp" && mv "${POOL_FILE}.tmp" "$POOL_FILE"

    echo "Removed @$username from pool"

    # Remove profile if it exists
    local profile="$PERSONA_DIR/${username}.json"
    if [ -f "$profile" ]; then
        rm "$profile"
        echo "Removed profile: $profile"
    fi
}

cmd_list() {
    ensure_pool

    local count
    count=$(jq '.users | length' "$POOL_FILE")
    if [ "$count" = "0" ]; then
        echo "No users in pool. Add with: track.sh add <username>"
        exit 0
    fi

    echo "Tracked users ($count):"
    echo ""

    jq -r '.users[] | .username' "$POOL_FILE" | while read -r username; do
        local note
        note=$(jq -r --arg u "$username" '.users[] | select(.username == $u) | .note // ""' "$POOL_FILE")
        local added
        added=$(jq -r --arg u "$username" '.users[] | select(.username == $u) | .added_at' "$POOL_FILE")
        local profile="$PERSONA_DIR/${username}.json"
        local status="no profile"

        if [ -f "$profile" ]; then
            local captured_at
            captured_at=$(jq -r '.captured_at // ""' "$profile" 2>/dev/null)
            if [ -n "$captured_at" ]; then
                local age_days
                local captured_epoch
                local now_epoch
                captured_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${captured_at%%.*}" "+%s" 2>/dev/null || date -d "${captured_at}" "+%s" 2>/dev/null || echo "0")
                now_epoch=$(date "+%s")
                if [ "$captured_epoch" != "0" ]; then
                    age_days=$(( (now_epoch - captured_epoch) / 86400 ))
                    if [ "$age_days" -gt 7 ]; then
                        status="profile stale (${age_days}d old)"
                    else
                        status="profile fresh (${age_days}d old)"
                    fi
                else
                    status="profile exists"
                fi
            else
                status="profile exists"
            fi
        fi

        printf "  @%-20s %s" "$username" "[$status]"
        [ -n "$note" ] && printf " — %s" "$note"
        echo ""
    done
}

cmd_refresh() {
    local username="${1#@}"
    ensure_pool

    if [ -n "$username" ]; then
        # Refresh single user
        if ! jq -e --arg u "$username" '.users[] | select(.username == $u)' "$POOL_FILE" > /dev/null 2>&1; then
            echo "Error: @$username is not in the pool"
            exit 1
        fi
        echo "Refreshing profile for @$username..."
        bash "$SCRIPT_DIR/capture.sh" --username "$username" --refresh
    else
        # Refresh all users
        local users
        users=$(jq -r '.users[].username' "$POOL_FILE")
        if [ -z "$users" ]; then
            echo "No users in pool to refresh"
            exit 0
        fi
        echo "$users" | while read -r u; do
            echo "Refreshing @$u..."
            bash "$SCRIPT_DIR/capture.sh" --username "$u" --refresh
            echo ""
        done
    fi
}

# --- Main ---
ACTION="${1:-}"
shift || true

case "$ACTION" in
    add) cmd_add "$@" ;;
    remove) cmd_remove "$@" ;;
    list) cmd_list ;;
    refresh) cmd_refresh "$@" ;;
    *)
        echo "Usage: track.sh <add|remove|list|refresh> [username] [options]"
        echo ""
        echo "Commands:"
        echo "  add <username> [--note \"reason\"]  Add a user to the tracking pool"
        echo "  remove <username>                  Remove a user from the pool"
        echo "  list                               Show all tracked users"
        echo "  refresh [username]                 Re-capture profiles (all or one)"
        exit 1
        ;;
esac
