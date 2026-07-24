#!/bin/bash
# Peacock-Aware Status Line
# Displays project with VSCode/Peacock colors, git branch, and token usage
# Features: True color, Powerline separators, clickable file links

set -e

# Base colors
RESET='\033[0m'
BOLD='\033[1m'
GRAY='\033[38;5;245m'

# Convert hex to RGB
hex_to_rgb() {
    local hex="${1#\#}"
    echo "$((16#${hex:0:2})) $((16#${hex:2:2})) $((16#${hex:4:2}))"
}

# Get contrasting text color
get_contrast_text() {
    local r=$1 g=$2 b=$3
    local lum=$(awk "BEGIN {
        rf = $r / 255; gf = $g / 255; bf = $b / 255
        rf = (rf <= 0.03928) ? rf / 12.92 : ((rf + 0.055) / 1.055) ^ 2.4
        gf = (gf <= 0.03928) ? gf / 12.92 : ((gf + 0.055) / 1.055) ^ 2.4
        bf = (bf <= 0.03928) ? bf / 12.92 : ((bf + 0.055) / 1.055) ^ 2.4
        print 0.2126 * rf + 0.7152 * gf + 0.0722 * bf
    }")
    if (( $(awk "BEGIN {print ($lum > 0.4)}") )); then
        echo "40 40 40"
    else
        echo "255 255 255"
    fi
}

# Find project root
find_project_root() {
    local current="$1"
    [[ -f "$current" ]] && current=$(dirname "$current")
    while [[ "$current" != "/" && "$current" != "$HOME" ]]; do
        if [[ -d "$current/.git" ]] || [[ -f "$current/package.json" ]] || \
           [[ -f "$current/go.mod" ]] || [[ -f "$current/Cargo.toml" ]]; then
            echo "$current"
            return
        fi
        current=$(dirname "$current")
    done
    echo "$1"
}

# Load Peacock color
load_peacock_color() {
    local settings="$1/.vscode/settings.json"
    [[ -f "$settings" ]] && jq -r '.["peacock.color"] // empty' "$settings" 2>/dev/null
}

# Get git branch
get_git_branch() {
    local dir="$1"
    if [[ -d "$dir/.git" ]]; then
        local branch=$(git -C "$dir" branch --show-current 2>/dev/null)
        local dirty=""
        git -C "$dir" diff --quiet HEAD 2>/dev/null || dirty="*"
        echo "${branch}${dirty}"
    fi
}

# Read JSON input
INPUT=$(cat)

# Extract session info
CWD=$(echo "$INPUT" | jq -r '.workspace.current_dir // .cwd // "."')
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# Find project root and name
PROJECT_ROOT=$(find_project_root "$CWD")
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# Load Peacock color or use default
PEACOCK_COLOR=$(load_peacock_color "$PROJECT_ROOT")
if [[ -n "$PEACOCK_COLOR" ]]; then
    read -r R G B <<< "$(hex_to_rgb "$PEACOCK_COLOR")"
else
    R=0; G=95; B=95  # Default teal
fi

# Calculate text color
read -r TR TG TB <<< "$(get_contrast_text $R $G $B)"

# Build color codes
BG1="\033[48;2;${R};${G};${B}m"
FG1="\033[38;2;${R};${G};${B}m"
TEXT="\033[38;2;${TR};${TG};${TB}m"

# Lighter shade for second segment
R2=$((R + 40 > 255 ? 255 : R + 40))
G2=$((G + 40 > 255 ? 255 : G + 40))
B2=$((B + 40 > 255 ? 255 : B + 40))
BG2="\033[48;2;${R2};${G2};${B2}m"

# Build output
OUTPUT="${BG1}${TEXT}${BOLD} ⌂ ${PROJECT_NAME} ${RESET}"

# Git branch segment
BRANCH=$(get_git_branch "$PROJECT_ROOT")
if [[ -n "$BRANCH" ]]; then
    OUTPUT="${OUTPUT}${FG1}${BG2}▶${RESET}${BG2}\033[38;2;40;40;40m ⎇ ${BRANCH} ${RESET}"
fi

# Token usage (from transcript)
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
    TOKENS=$(tail -50 "$TRANSCRIPT" 2>/dev/null | \
        jq -r 'select(.usage) | "\(.usage.input_tokens // 0 + .usage.output_tokens // 0)"' 2>/dev/null | \
        tail -1)
    if [[ -n "$TOKENS" && "$TOKENS" =~ ^[0-9]+$ && "$TOKENS" -gt 0 ]]; then
        if [[ "$TOKENS" -ge 1000 ]]; then
            TOKEN_DISPLAY="$((TOKENS / 1000))k"
        else
            TOKEN_DISPLAY="$TOKENS"
        fi
        OUTPUT="${OUTPUT} \033[48;2;45;45;45m\033[38;2;200;200;200m ${TOKEN_DISPLAY} ${RESET}"
    fi
fi

# Set terminal title
echo -ne "\033]0;${PROJECT_NAME}\007" >&2

# Set iTerm2 tab color if available
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
    echo -ne "\033]6;1;bg;red;brightness;${R}\007" >&2
    echo -ne "\033]6;1;bg;green;brightness;${G}\007" >&2
    echo -ne "\033]6;1;bg;blue;brightness;${B}\007" >&2
fi

echo -e "$OUTPUT"
