#!/bin/bash
# Claude Code Status Line - Powerline style with git branch
# Shows last edited project, lint status, and git branch

set -e

# ANSI Colors - Cyberpunk/Matrix hacker theme
# Base colors
WHITE='\033[38;5;255m'
BLACK='\033[38;5;232m'
GRAY='\033[38;5;245m'

# High contrast text colors for lint
ERR_TEXT='\033[38;5;220m'    # Bright yellow text for errors
WARN_TEXT='\033[38;5;220m'   # Bright yellow text for warnings
OK_TEXT='\033[38;5;220m'     # Bright yellow text for success

# Color families derived from 2 base hues with +40 RGB steps
# Purple family: base (95,0,95) - edited project
BG_P1='\033[48;5;53m'        # (95,0,95) - dark magenta
BG_P2='\033[48;5;90m'        # (135,40,135) - medium magenta
BG_P3='\033[48;5;133m'       # (175,80,175) - light magenta
FG_P1='\033[38;5;53m'
FG_P2='\033[38;5;90m'
FG_P3='\033[38;5;133m'
TEXT_P_LIGHT='\033[38;5;176m' # (215,120,215) - pink-tinted white
TEXT_P_DARK='\033[38;5;53m'   # Use base dark

# Cyan family: base (0,95,95) - CWD project
BG_C1='\033[48;5;23m'        # (0,95,95) - dark cyan
BG_C2='\033[48;5;30m'        # (40,135,135) - medium cyan
BG_C3='\033[48;5;73m'        # (80,175,175) - light cyan
FG_C1='\033[38;5;23m'
FG_C2='\033[38;5;30m'
FG_C3='\033[38;5;73m'
TEXT_C_LIGHT='\033[38;5;116m' # (120,215,215) - cyan-tinted white
TEXT_C_DARK='\033[38;5;23m'   # Use base dark

BOLD='\033[1m'
RESET='\033[0m'

# Read JSON input from stdin
INPUT=$(cat)

# Extract session-specific transcript path
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

PROJECT=""

# Configure your code directory here (default: ~/code)
CODE_DIR="${CODE_DIR:-$HOME/code}"

# Editor URL scheme (cursor, vscode, sublime, file)
# cursor  -> cursor://file/PATH
# vscode  -> vscode://file/PATH
# sublime -> subl://open?url=file://PATH
# file    -> file://PATH (opens in system default)
EDITOR_SCHEME="${EDITOR_SCHEME:-cursor}"

# Verify transcript exists
if [[ -n "$TRANSCRIPT" && ! -f "$TRANSCRIPT" ]]; then
  TRANSCRIPT=""
fi

# Get last edited project and file path from transcript
LAST_FILE=""
LAST_OPERATION_PATH=""  # For tracking operations even if file deleted
PROJECT_IS_HOME=false  # Track if project root is ~ (not CODE_DIR)
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  # Extract last file path from Edit/Write operations
  LAST_FILE=$(tail -200 "$TRANSCRIPT" 2>/dev/null | \
    grep -o '"file_path":"[^"]*"' | \
    tail -1 | \
    sed 's/"file_path":"//; s/"$//')

  # Also check for Bash operations with paths (rm, mv, cp, mkdir, etc.)
  if [[ -z "$LAST_FILE" ]]; then
    # Extract paths from Bash commands (looks for absolute paths in command field)
    LAST_OPERATION_PATH=$(tail -200 "$TRANSCRIPT" 2>/dev/null | \
      grep -o '"command":"[^"]*"' | \
      tail -1 | \
      grep -oE '('"$CODE_DIR"'|'"$HOME"')/[^ "]+' | \
      head -1)
  fi

  # Use Edit/Write path first, fallback to Bash operation path
  EFFECTIVE_PATH="${LAST_FILE:-$LAST_OPERATION_PATH}"

  # Extract project from effective path
  if [[ -n "$EFFECTIVE_PATH" && "$EFFECTIVE_PATH" =~ ^${CODE_DIR}/([^/]+)/ ]]; then
    PROJECT="${BASH_REMATCH[1]}"
  elif [[ -n "$EFFECTIVE_PATH" && "$EFFECTIVE_PATH" =~ ^$HOME/([^/]+)/ ]]; then
    # File is under home but not in CODE_DIR - use first dir as project
    # e.g., ~/.claude/hooks/file.sh -> project=~/.claude
    PROJECT="~/${BASH_REMATCH[1]}"
    PROJECT_IS_HOME=true
  elif [[ -n "$EFFECTIVE_PATH" && "$EFFECTIVE_PATH" =~ ^$HOME/[^/]+$ ]]; then
    # File directly in home (no subdirectory) - use ~ as project
    PROJECT="~"
    PROJECT_IS_HOME=true
  else
    # Fallback to old method
    PROJECT=$(tail -100 "$TRANSCRIPT" 2>/dev/null | \
      jq -r 'select(.message.content) | .message.content[] | select(.type == "tool_use") | .input | to_entries[] | .value' 2>/dev/null | \
      grep -oE "${CODE_DIR}/[a-zA-Z0-9_-]+/" | \
      tail -1 | \
      sed "s|${CODE_DIR}/||; s|/\$||")
  fi
fi

# Get token usage from transcript (look for assistant turns with usage info)
TOKEN_USAGE=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  # Extract from usage stats if available
  TOKEN_USAGE=$(tail -50 "$TRANSCRIPT" 2>/dev/null | \
    jq -r 'select(.usage) | "\(.usage.input_tokens // 0 + .usage.output_tokens // 0)"' 2>/dev/null | \
    tail -1)
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

# CWD comes first (⌂), then last edited (✎)
if [[ -n "$CWD_DISPLAY" ]]; then
  # CWD project segment (cyan family) - ⌂ symbol
  OUTPUT="${BG_C1}${WHITE}${BOLD} ⌂ $CWD_DISPLAY ${RESET}"

  if [[ -n "$CWD_PROJECT" ]]; then
    # Add lint for CWD
    read -r CWD_ERRORS CWD_WARNINGS <<< $(get_lint_counts "$CWD_PROJECT")

    OUTPUT="${OUTPUT}${FG_C1}${BG_C2}▶"

    if [[ "$CWD_ERRORS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${ERR_TEXT}${BOLD} ✗$CWD_ERRORS"
    fi

    if [[ "$CWD_WARNINGS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${WARN_TEXT}${BOLD} △$CWD_WARNINGS"
    fi

    if [[ "$CWD_ERRORS" -eq 0 && "$CWD_WARNINGS" -eq 0 ]]; then
      OUTPUT="${OUTPUT}${OK_TEXT}${BOLD} ✓"
    fi

    OUTPUT="${OUTPUT} ${RESET}"

    # Git branch
    CWD_BRANCH=$(get_git_branch "$CWD_PROJECT")
    if [[ -n "$CWD_BRANCH" ]]; then
      OUTPUT="${OUTPUT}${FG_C2}${BG_C3}▶${BLACK} ⎇ ${CWD_BRANCH} ${RESET}"
    fi
  fi

  # Last edited project segment if different (purple family) - ✎ symbol
  # No arrow here - hard edge separates the two project contexts
  if [[ -n "$PROJECT" && "$PROJECT" != "$CWD_PROJECT" ]]; then
    OUTPUT="${OUTPUT}${BG_P1}${WHITE} ✎ $PROJECT ${RESET}"

    # Only show lint/git for CODE_DIR projects, not home-based (~)
    if [[ "$PROJECT_IS_HOME" == false ]]; then
      # Get lint for last edited project
      read -r ERRORS WARNINGS <<< $(get_lint_counts "$PROJECT")

      OUTPUT="${OUTPUT}${FG_P1}${BG_P2}▶"

      if [[ "$ERRORS" -gt 0 ]]; then
        OUTPUT="${OUTPUT}${ERR_TEXT}${BOLD} ✗$ERRORS"
      fi

      if [[ "$WARNINGS" -gt 0 ]]; then
        OUTPUT="${OUTPUT}${WARN_TEXT}${BOLD} △$WARNINGS"
      fi

      if [[ "$ERRORS" -eq 0 && "$WARNINGS" -eq 0 ]]; then
        OUTPUT="${OUTPUT}${OK_TEXT}${BOLD} ✓"
      fi

      OUTPUT="${OUTPUT} ${RESET}"

      # Git branch segment (light purple)
      PROJECT_BRANCH=$(get_git_branch "$PROJECT")
      if [[ -n "$PROJECT_BRANCH" ]]; then
        OUTPUT="${OUTPUT}${FG_P2}${BG_P3}▶${BLACK} ⎇ ${PROJECT_BRANCH} ${RESET}"
      fi
    fi
  fi

elif [[ -n "$PROJECT" ]]; then
  # No CWD but have edited project (purple family) - ✎ symbol
  OUTPUT="${BG_P1}${WHITE}${BOLD} ✎ $PROJECT ${RESET}"

  # Only show lint/git for CODE_DIR projects, not home-based (~)
  if [[ "$PROJECT_IS_HOME" == false ]]; then
    # Get lint for last edited project
    read -r ERRORS WARNINGS <<< $(get_lint_counts "$PROJECT")

    OUTPUT="${OUTPUT}${FG_P1}${BG_P2}▶"

    if [[ "$ERRORS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${ERR_TEXT}${BOLD} ✗$ERRORS"
    fi

    if [[ "$WARNINGS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${WARN_TEXT}${BOLD} △$WARNINGS"
    fi

    if [[ "$ERRORS" -eq 0 && "$WARNINGS" -eq 0 ]]; then
      OUTPUT="${OUTPUT}${OK_TEXT}${BOLD} ✓"
    fi

    OUTPUT="${OUTPUT} ${RESET}"

    # Git branch
    PROJECT_BRANCH=$(get_git_branch "$PROJECT")
    if [[ -n "$PROJECT_BRANCH" ]]; then
      OUTPUT="${OUTPUT}${FG_P2}${BG_P3}▶${BLACK} ⎇ ${PROJECT_BRANCH} ${RESET}"
    fi
  fi
else
  OUTPUT="${BG_C1}${WHITE} ⌂ ${CODE_DIR/#$HOME/~} ${RESET}"
fi

# Add trailing info: token usage and last edited file (clickable)
TRAIL=""

# Token usage
if [[ -n "$TOKEN_USAGE" && "$TOKEN_USAGE" =~ ^[0-9]+$ && "$TOKEN_USAGE" -gt 0 ]]; then
  # Format as K (thousands)
  if [[ "$TOKEN_USAGE" -ge 1000 ]]; then
    TOKEN_K=$((TOKEN_USAGE / 1000))
    TRAIL="${TRAIL} ${GRAY}${TOKEN_K}k${RESET}"
  else
    TRAIL="${TRAIL} ${GRAY}${TOKEN_USAGE}${RESET}"
  fi
fi

# Last edited file (clickable OSC 8 hyperlink)
if [[ -n "$LAST_FILE" && -f "$LAST_FILE" ]]; then
  # Make path relative to project root
  RELATIVE_FILE="$LAST_FILE"
  if [[ "$PROJECT_IS_HOME" == true && "$PROJECT" != "~" ]]; then
    # Project is ~/dirname, strip $HOME/dirname/ to show relative path
    # e.g., ~/.claude/hooks/file.sh with project=~/.claude -> hooks/file.sh
    HOME_SUBDIR="${PROJECT#\~/}"
    RELATIVE_FILE="${LAST_FILE#$HOME/$HOME_SUBDIR/}"
  elif [[ "$PROJECT_IS_HOME" == true ]]; then
    # Project is ~, file directly in home
    RELATIVE_FILE="${LAST_FILE#$HOME/}"
  elif [[ -n "$PROJECT" ]]; then
    RELATIVE_FILE="${LAST_FILE#${CODE_DIR}/${PROJECT}/}"
  elif [[ -n "$CWD_PROJECT" ]]; then
    RELATIVE_FILE="${LAST_FILE#${CODE_DIR}/${CWD_PROJECT}/}"
  fi

  # Build URL based on editor scheme
  case "$EDITOR_SCHEME" in
    cursor)  FILE_URL="cursor://file${LAST_FILE}" ;;
    vscode)  FILE_URL="vscode://file${LAST_FILE}" ;;
    sublime) FILE_URL="subl://open?url=file://${LAST_FILE}" ;;
    *)       FILE_URL="file://${LAST_FILE}" ;;
  esac

  # OSC 8 hyperlink: \e]8;;URL\a TEXT \e]8;;\a
  # Use \a (BEL) instead of \\ as terminator - more compatible
  TRAIL="${TRAIL} ${GRAY}\033]8;;${FILE_URL}\a${RELATIVE_FILE}\033]8;;\a${RESET}"
fi

echo -e "${OUTPUT}${TRAIL}"
