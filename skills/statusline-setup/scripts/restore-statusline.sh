#!/bin/bash
# Restore status line from backup
# Usage: ./restore-statusline.sh [timestamp]
# Without timestamp, restores the most recent backup

set -e

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
SCRIPT_FILE="$CLAUDE_DIR/statusline.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if jq is available
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Install with: brew install jq"
    exit 1
fi

# List available backups
list_backups() {
    echo -e "${CYAN}Available backups:${NC}"
    echo ""

    local found=0

    # Find unique timestamps
    for backup in "$CLAUDE_DIR"/settings.json.backup.* 2>/dev/null; do
        if [[ -f "$backup" ]]; then
            local ts=$(basename "$backup" | sed 's/settings.json.backup.//')
            local date_fmt=$(echo "$ts" | sed 's/\(....\)\(..\)\(..\)\(..\)\(..\)\(..\)/\1-\2-\3 \4:\5:\6/')

            # Check if script backup also exists
            local has_script="no"
            if [[ -f "$CLAUDE_DIR/statusline.sh.backup.$ts" ]]; then
                has_script="yes"
            fi

            echo -e "  ${GREEN}$ts${NC} ($date_fmt) - script backup: $has_script"
            found=1
        fi
    done

    if [[ $found -eq 0 ]]; then
        echo "  No backups found in $CLAUDE_DIR"
        return 1
    fi

    echo ""
}

# Restore from specific timestamp or most recent
restore() {
    local timestamp="$1"

    if [[ -z "$timestamp" ]]; then
        # Find most recent
        local latest=$(ls -t "$CLAUDE_DIR"/settings.json.backup.* 2>/dev/null | head -1)
        if [[ -z "$latest" ]]; then
            log_error "No backups found"
            exit 1
        fi
        timestamp=$(basename "$latest" | sed 's/settings.json.backup.//')
        log_info "Using most recent backup: $timestamp"
    fi

    local settings_backup="$CLAUDE_DIR/settings.json.backup.$timestamp"
    local script_backup="$CLAUDE_DIR/statusline.sh.backup.$timestamp"

    if [[ ! -f "$settings_backup" ]]; then
        log_error "Settings backup not found: $settings_backup"
        exit 1
    fi

    # Restore settings
    cp "$settings_backup" "$SETTINGS_FILE"
    log_info "Restored settings from: $settings_backup"

    # Restore script if backup exists
    if [[ -f "$script_backup" ]]; then
        cp "$script_backup" "$SCRIPT_FILE"
        chmod +x "$SCRIPT_FILE"
        log_info "Restored script from: $script_backup"
    else
        log_warn "No script backup found for this timestamp"
    fi

    # Show restored statusLine config
    echo ""
    echo -e "${CYAN}Restored statusLine configuration:${NC}"
    jq '.statusLine' "$SETTINGS_FILE" 2>/dev/null || echo "  (none)"
    echo ""

    log_info "Restore complete! Restart Claude Code to apply changes."
}

# Remove status line entirely
remove_statusline() {
    log_warn "This will remove the statusLine configuration entirely"

    if [[ -f "$SETTINGS_FILE" ]]; then
        # Backup first
        local backup="$SETTINGS_FILE.backup.$(date +%Y%m%d%H%M%S)"
        cp "$SETTINGS_FILE" "$backup"
        log_info "Backed up to: $backup"

        # Remove statusLine key
        local temp=$(mktemp)
        jq 'del(.statusLine)' "$SETTINGS_FILE" > "$temp"
        mv "$temp" "$SETTINGS_FILE"
        log_info "Removed statusLine from settings.json"
    fi

    log_info "Status line removed. Restart Claude Code to apply changes."
}

# Main
case "${1:-}" in
    --list|-l)
        list_backups
        ;;
    --remove|-r)
        remove_statusline
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS] [TIMESTAMP]"
        echo ""
        echo "Options:"
        echo "  --list, -l     List available backups"
        echo "  --remove, -r   Remove status line configuration"
        echo "  --help, -h     Show this help"
        echo ""
        echo "Without options, restores from most recent backup."
        echo "Provide TIMESTAMP to restore specific backup."
        echo ""
        echo "Examples:"
        echo "  $0                     # Restore most recent"
        echo "  $0 20240115143022      # Restore specific backup"
        echo "  $0 --list              # List available backups"
        echo "  $0 --remove            # Remove status line entirely"
        ;;
    "")
        list_backups
        echo ""
        restore
        ;;
    *)
        restore "$1"
        ;;
esac
