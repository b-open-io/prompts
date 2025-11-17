#!/bin/bash
# Claude Code Status Line - Powerline style with git branch
# Shows last edited project, lint status, and git branch

set -e

# ANSI Colors - Pastel/Muted (using 256-color palette)
# Foregrounds
WHITE='\033[38;5;255m'
BLACK='\033[38;5;232m'
GRAY='\033[38;5;245m'

# Backgrounds - Muted/Pastel tones
BG_BLUE='\033[48;5;67m'      # Muted blue (last edited)
BG_RED='\033[48;5;167m'      # Soft rose (errors)
BG_YELLOW='\033[48;5;179m'   # Muted amber (warnings)
BG_CYAN='\033[48;5;73m'      # Soft teal (branch)
BG_GREEN='\033[48;5;65m'     # Darker sage (clean/cwd) - better contrast
BG_GRAY='\033[48;5;240m'     # Dark gray (separator)

# Matching foregrounds for powerline arrows
FG_BLUE='\033[38;5;67m'
FG_RED='\033[38;5;167m'
FG_YELLOW='\033[38;5;179m'
FG_CYAN='\033[38;5;73m'
FG_GREEN='\033[38;5;65m'
FG_GRAY='\033[38;5;240m'

BOLD='\033[1m'
RESET='\033[0m'

# Read JSON input from stdin
INPUT=$(cat)

# Extract session-specific transcript path
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

PROJECT=""

# Configure your code directory here (default: ~/code)
CODE_DIR="${CODE_DIR:-$HOME/code}"

# Verify transcript exists
if [[ -n "$TRANSCRIPT" && ! -f "$TRANSCRIPT" ]]; then
  TRANSCRIPT=""
fi

# Get last edited project from transcript
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  PROJECT=$(tail -100 "$TRANSCRIPT" 2>/dev/null | \
    jq -r 'select(.message.content) | .message.content[] | select(.type == "tool_use") | .input | to_entries[] | .value' 2>/dev/null | \
    grep -oE "${CODE_DIR}/[a-zA-Z0-9_-]+/" | \
    tail -1 | \
    sed "s|${CODE_DIR}/||; s|/\$||")
fi

# Get CWD project
CWD_PROJECT=""
CWD_DISPLAY=""
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
if [[ "$CWD" =~ ^${CODE_DIR}/([^/]+) ]]; then
  CWD_PROJECT="${BASH_REMATCH[1]}"
  CWD_DISPLAY="$CWD_PROJECT"
elif [[ "$CWD" == "$CODE_DIR" ]]; then
  CWD_DISPLAY="${CODE_DIR/#$HOME/~}"
fi

# Function to get git branch for a project
get_git_branch() {
  local proj="$1"
  local proj_dir="${CODE_DIR}/$proj"

  if [[ -d "$proj_dir/.git" ]]; then
    local branch=$(git -C "$proj_dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
    local dirty=""

    # Check for uncommitted changes
    if ! git -C "$proj_dir" diff --quiet HEAD 2>/dev/null; then
      dirty="*"
    fi

    echo "${branch}${dirty}"
  fi
}

# Function to get lint counts
get_lint_counts() {
  local proj="$1"
  local state_file="$HOME/.claude/lint-state/$proj.json"

  if [[ ! -f "$state_file" ]]; then
    echo "0 0"
    return
  fi

  local errors=$(jq -r '.errors // 0' "$state_file" 2>/dev/null || echo "0")
  local warnings=$(jq -r '.warnings // 0' "$state_file" 2>/dev/null || echo "0")

  [[ -z "$errors" || ! "$errors" =~ ^[0-9]+$ ]] && errors=0
  [[ -z "$warnings" || ! "$warnings" =~ ^[0-9]+$ ]] && warnings=0

  echo "$errors $warnings"
}

# Build Powerline statusline
OUTPUT=""

if [[ -n "$PROJECT" ]]; then
  # Last edited project segment (blue)
  OUTPUT="${BG_BLUE}${WHITE}${BOLD} $PROJECT ${RESET}"

  # Get lint for last edited project
  read -r ERRORS WARNINGS <<< $(get_lint_counts "$PROJECT")

  # Errors segment (red) - only if errors exist
  if [[ "$ERRORS" -gt 0 ]]; then
    OUTPUT="${OUTPUT}${FG_BLUE}${BG_RED}▶${WHITE}${BOLD} ✗$ERRORS ${RESET}"
    LAST_BG="RED"
  else
    LAST_BG="BLUE"
  fi

  # Warnings segment (yellow) - only if warnings exist
  if [[ "$WARNINGS" -gt 0 ]]; then
    if [[ "$LAST_BG" == "RED" ]]; then
      OUTPUT="${OUTPUT}${FG_RED}${BG_YELLOW}▶${BLACK}${BOLD} △$WARNINGS ${RESET}"
    else
      OUTPUT="${OUTPUT}${FG_BLUE}${BG_YELLOW}▶${BLACK}${BOLD} △$WARNINGS ${RESET}"
    fi
    LAST_BG="YELLOW"
  fi

  # Clean indicator if no errors or warnings
  if [[ "$ERRORS" -eq 0 && "$WARNINGS" -eq 0 ]]; then
    OUTPUT="${OUTPUT}${FG_BLUE}${BG_GREEN}▶${WHITE}${BOLD} ✓ ${RESET}"
    LAST_BG="GREEN"
  fi

  # Git branch segment (cyan)
  PROJECT_BRANCH=$(get_git_branch "$PROJECT")
  if [[ -n "$PROJECT_BRANCH" ]]; then
    case "$LAST_BG" in
      RED) OUTPUT="${OUTPUT}${FG_RED}${BG_CYAN}▶${WHITE} ⎇ ${PROJECT_BRANCH} ${RESET}" ;;
      YELLOW) OUTPUT="${OUTPUT}${FG_YELLOW}${BG_CYAN}▶${WHITE} ⎇ ${PROJECT_BRANCH} ${RESET}" ;;
      GREEN) OUTPUT="${OUTPUT}${FG_GREEN}${BG_CYAN}▶${WHITE} ⎇ ${PROJECT_BRANCH} ${RESET}" ;;
      *) OUTPUT="${OUTPUT}${FG_BLUE}${BG_CYAN}▶${WHITE} ⎇ ${PROJECT_BRANCH} ${RESET}" ;;
    esac
    LAST_BG="CYAN"
  fi

  # CWD segment if different from project (green-gray background)
  if [[ -n "$CWD_DISPLAY" && "$PROJECT" != "$CWD_PROJECT" ]]; then
    case "$LAST_BG" in
      CYAN) OUTPUT="${OUTPUT}${FG_CYAN}${BG_GRAY}▶${WHITE} $CWD_DISPLAY ${RESET}" ;;
      GREEN) OUTPUT="${OUTPUT}${FG_GREEN}${BG_GRAY}▶${WHITE} $CWD_DISPLAY ${RESET}" ;;
      YELLOW) OUTPUT="${OUTPUT}${FG_YELLOW}${BG_GRAY}▶${WHITE} $CWD_DISPLAY ${RESET}" ;;
      RED) OUTPUT="${OUTPUT}${FG_RED}${BG_GRAY}▶${WHITE} $CWD_DISPLAY ${RESET}" ;;
      *) OUTPUT="${OUTPUT}${FG_BLUE}${BG_GRAY}▶${WHITE} $CWD_DISPLAY ${RESET}" ;;
    esac

    # Add CWD git branch if it's a project
    if [[ -n "$CWD_PROJECT" ]]; then
      CWD_BRANCH=$(get_git_branch "$CWD_PROJECT")
      if [[ -n "$CWD_BRANCH" ]]; then
        OUTPUT="${OUTPUT}${FG_GRAY}${BG_GREEN}▶${WHITE} ⎇ ${CWD_BRANCH} ${RESET}"
      fi
    fi
  fi

elif [[ -n "$CWD_DISPLAY" ]]; then
  # No recent edits, just show CWD
  OUTPUT="${BG_GREEN}${WHITE}${BOLD} $CWD_DISPLAY ${RESET}"

  if [[ -n "$CWD_PROJECT" ]]; then
    # Add lint for CWD
    read -r ERRORS WARNINGS <<< $(get_lint_counts "$CWD_PROJECT")

    if [[ "$ERRORS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${FG_GREEN}${BG_RED}▶${WHITE}${BOLD} ✗$ERRORS ${RESET}"
      LAST_BG="RED"
    else
      LAST_BG="GREEN"
    fi

    if [[ "$WARNINGS" -gt 0 ]]; then
      if [[ "$LAST_BG" == "RED" ]]; then
        OUTPUT="${OUTPUT}${FG_RED}${BG_YELLOW}▶${BLACK}${BOLD} △$WARNINGS ${RESET}"
      else
        OUTPUT="${OUTPUT}${FG_GREEN}${BG_YELLOW}▶${BLACK}${BOLD} △$WARNINGS ${RESET}"
      fi
      LAST_BG="YELLOW"
    fi

    if [[ "$ERRORS" -eq 0 && "$WARNINGS" -eq 0 ]]; then
      OUTPUT="${OUTPUT}${FG_GREEN}▶${RESET} ${GRAY}✓${RESET}"
      LAST_BG="NONE"
    fi

    # Git branch
    CWD_BRANCH=$(get_git_branch "$CWD_PROJECT")
    if [[ -n "$CWD_BRANCH" ]]; then
      case "$LAST_BG" in
        RED) OUTPUT="${OUTPUT}${FG_RED}${BG_CYAN}▶${WHITE} ⎇ ${CWD_BRANCH} ${RESET}" ;;
        YELLOW) OUTPUT="${OUTPUT}${FG_YELLOW}${BG_CYAN}▶${WHITE} ⎇ ${CWD_BRANCH} ${RESET}" ;;
        *) OUTPUT="${OUTPUT}${FG_GREEN}${BG_CYAN}▶${WHITE} ⎇ ${CWD_BRANCH} ${RESET}" ;;
      esac
    fi
  fi
else
  OUTPUT="${BG_GRAY}${WHITE} ${CODE_DIR/#$HOME/~} ${RESET}"
fi

echo -e "$OUTPUT"
