#!/bin/bash
# Simple Git-Aware Status Line
# Displays: [Model] directory branch*

set -e

# Colors
RESET='\033[0m'
BOLD='\033[1m'
GRAY='\033[38;5;245m'
GREEN='\033[38;5;46m'
YELLOW='\033[38;5;226m'

# Read JSON input
input=$(cat)

# Extract values
MODEL=$(echo "$input" | jq -r '.model.display_name // "Claude"')
CURRENT_DIR=$(echo "$input" | jq -r '.workspace.current_dir // "."')
DIR_NAME=$(basename "$CURRENT_DIR")

# Get git branch if in a repo
GIT_INFO=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        # Check for dirty state
        DIRTY=""
        if ! git diff --quiet HEAD 2>/dev/null; then
            DIRTY="${YELLOW}*${RESET}"
        fi
        GIT_INFO=" ${GREEN}${BRANCH}${DIRTY}${RESET}"
    fi
fi

echo -e "${BOLD}[${MODEL}]${RESET} ${GRAY}${DIR_NAME}${RESET}${GIT_INFO}"
