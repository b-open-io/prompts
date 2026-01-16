#!/bin/bash
# Install status line script to Claude Code
# Usage: ./install-statusline.sh [script-path]

set -e

SCRIPT_PATH="${1:-}"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if jq is available
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Install with: brew install jq"
    exit 1
fi

# Create .claude directory if needed
mkdir -p "$CLAUDE_DIR"

# If no script provided, list available options
if [[ -z "$SCRIPT_PATH" ]]; then
    echo "Usage: $0 <script-path>"
    echo ""
    echo "Available example scripts:"
    SCRIPT_DIR="$(dirname "$0")/../examples"
    if [[ -d "$SCRIPT_DIR" ]]; then
        for script in "$SCRIPT_DIR"/*.sh; do
            if [[ -f "$script" ]]; then
                echo "  - $(basename "$script")"
            fi
        done
    fi
    echo ""
    echo "Or use 'ccstatusline' for widget-based configuration:"
    echo "  $0 ccstatusline"
    exit 0
fi

# Handle ccstatusline installation
if [[ "$SCRIPT_PATH" == "ccstatusline" ]]; then
    log_info "Installing ccstatusline..."

    # Backup existing settings
    if [[ -f "$SETTINGS_FILE" ]]; then
        BACKUP="$SETTINGS_FILE.backup.$(date +%Y%m%d%H%M%S)"
        cp "$SETTINGS_FILE" "$BACKUP"
        log_info "Backed up settings to: $BACKUP"
    fi

    # Update settings.json
    if [[ -f "$SETTINGS_FILE" ]]; then
        TEMP=$(mktemp)
        jq '.statusLine = "bunx ccstatusline@latest"' "$SETTINGS_FILE" > "$TEMP"
        mv "$TEMP" "$SETTINGS_FILE"
    else
        echo '{"statusLine": "bunx ccstatusline@latest"}' | jq '.' > "$SETTINGS_FILE"
    fi

    log_info "Configured ccstatusline in settings.json"
    log_info "Run 'bunx ccstatusline@latest' to configure widgets"
    exit 0
fi

# Validate script exists
if [[ ! -f "$SCRIPT_PATH" ]]; then
    log_error "Script not found: $SCRIPT_PATH"
    exit 1
fi

# Copy script to .claude directory
DEST_SCRIPT="$CLAUDE_DIR/statusline.sh"

# Backup existing script
if [[ -f "$DEST_SCRIPT" ]]; then
    BACKUP="$DEST_SCRIPT.backup.$(date +%Y%m%d%H%M%S)"
    cp "$DEST_SCRIPT" "$BACKUP"
    log_info "Backed up existing script to: $BACKUP"
fi

# Copy and make executable
cp "$SCRIPT_PATH" "$DEST_SCRIPT"
chmod +x "$DEST_SCRIPT"
log_info "Installed script to: $DEST_SCRIPT"

# Backup existing settings
if [[ -f "$SETTINGS_FILE" ]]; then
    BACKUP="$SETTINGS_FILE.backup.$(date +%Y%m%d%H%M%S)"
    cp "$SETTINGS_FILE" "$BACKUP"
    log_info "Backed up settings to: $BACKUP"
fi

# Update settings.json
STATUS_LINE_CONFIG='{
  "type": "command",
  "command": "~/.claude/statusline.sh",
  "padding": 0
}'

if [[ -f "$SETTINGS_FILE" ]]; then
    TEMP=$(mktemp)
    jq --argjson config "$STATUS_LINE_CONFIG" '.statusLine = $config' "$SETTINGS_FILE" > "$TEMP"
    mv "$TEMP" "$SETTINGS_FILE"
else
    echo "{\"statusLine\": $STATUS_LINE_CONFIG}" | jq '.' > "$SETTINGS_FILE"
fi

log_info "Updated settings.json"

# Test the script
log_info "Testing script..."
TEST_JSON='{"model":{"display_name":"Test"},"workspace":{"current_dir":"'"$(pwd)"'"}}'
if echo "$TEST_JSON" | "$DEST_SCRIPT" > /dev/null 2>&1; then
    log_info "Script test passed!"
    echo ""
    echo "Preview:"
    echo "$TEST_JSON" | "$DEST_SCRIPT"
    echo ""
else
    log_warn "Script test failed. Check the script for errors."
fi

log_info "Installation complete! Restart Claude Code to apply changes."
