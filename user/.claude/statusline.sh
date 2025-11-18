#!/bin/bash
# Claude Code Status Line - Powerline style with git branch
# Shows last edited project, lint status, and git branch
# Supports VSCode Peacock color themes for project-specific colors

set -e

# Base colors
WHITE='\033[38;5;255m'
BLACK='\033[38;5;232m'
GRAY='\033[38;5;245m'

BOLD='\033[1m'
RESET='\033[0m'

# Convert hex color to RGB
hex_to_rgb() {
  local hex="$1"
  # Remove # prefix if present
  hex="${hex#\#}"
  # Extract RGB components
  local r=$((16#${hex:0:2}))
  local g=$((16#${hex:2:2}))
  local b=$((16#${hex:4:2}))
  echo "$r $g $b"
}

# Convert RGB to 24-bit true color escape sequence (for background)
rgb_to_bg_true() {
  echo "48;2;$1;$2;$3"
}

# Convert RGB to 24-bit true color escape sequence (for foreground)
rgb_to_fg_true() {
  echo "38;2;$1;$2;$3"
}

# Calculate relative luminance (WCAG formula)
calculate_luminance() {
  local r=$1 g=$2 b=$3
  # Normalize to 0-1
  local rf=$(awk "BEGIN {printf \"%.4f\", $r / 255}")
  local gf=$(awk "BEGIN {printf \"%.4f\", $g / 255}")
  local bf=$(awk "BEGIN {printf \"%.4f\", $b / 255}")

  # Apply gamma correction
  rf=$(awk "BEGIN {if ($rf <= 0.03928) print $rf / 12.92; else print ((($rf + 0.055) / 1.055) ^ 2.4)}")
  gf=$(awk "BEGIN {if ($gf <= 0.03928) print $gf / 12.92; else print ((($gf + 0.055) / 1.055) ^ 2.4)}")
  bf=$(awk "BEGIN {if ($bf <= 0.03928) print $bf / 12.92; else print ((($bf + 0.055) / 1.055) ^ 2.4)}")

  # Calculate luminance (0.2126 R + 0.7152 G + 0.0722 B)
  awk "BEGIN {printf \"%.4f\", 0.2126 * $rf + 0.7152 * $gf + 0.0722 * $bf}"
}

# Get contrasting text color (returns ANSI color code)
get_contrast_text() {
  local r=$1 g=$2 b=$3
  local lum=$(calculate_luminance $r $g $b)

  # If luminance > 0.5, use dark text; otherwise use light text
  if (( $(awk "BEGIN {print ($lum > 0.4)}") )); then
    echo "232"  # Very dark gray
  else
    echo "255"  # White
  fi
}

# Generate color family with +40 RGB steps, return as space-separated RGB values
# Returns: "r1 g1 b1 r2 g2 b2 r3 g3 b3 text_r text_g text_b"
generate_color_family() {
  local r=$1 g=$2 b=$3

  # +40 step
  local r2=$(( r + 40 > 255 ? 255 : r + 40 ))
  local g2=$(( g + 40 > 255 ? 255 : g + 40 ))
  local b2=$(( b + 40 > 255 ? 255 : b + 40 ))

  # +80 step
  local r3=$(( r + 80 > 255 ? 255 : r + 80 ))
  local g3=$(( g + 80 > 255 ? 255 : g + 80 ))
  local b3=$(( b + 80 > 255 ? 255 : b + 80 ))

  # Contrasting text color for base (returns 232 or 255)
  local text_code=$(get_contrast_text $r $g $b)
  local text_r text_g text_b
  if [[ "$text_code" == "232" ]]; then
    text_r=40; text_g=40; text_b=40  # Dark gray
  else
    text_r=255; text_g=255; text_b=255  # White
  fi

  echo "$r $g $b $r2 $g2 $b2 $r3 $g3 $b3 $text_r $text_g $text_b"
}

# Load project colors from .vscode/settings.json
# Returns: "base_color light_fg dark_fg badge_color" or empty
load_project_colors() {
  local proj_dir="$1"
  local settings_file="$proj_dir/.vscode/settings.json"

  if [[ ! -f "$settings_file" ]]; then
    return
  fi

  # Load all relevant colors from settings
  local base=$(jq -r '.["peacock.color"] // .workbench.colorCustomizations["titleBar.activeBackground"] // empty' "$settings_file" 2>/dev/null)
  local light_fg=$(jq -r '.workbench.colorCustomizations["activityBar.foreground"] // empty' "$settings_file" 2>/dev/null)
  local dark_fg=$(jq -r '.workbench.colorCustomizations["activityBarBadge.foreground"] // empty' "$settings_file" 2>/dev/null)
  local badge=$(jq -r '.workbench.colorCustomizations["activityBarBadge.background"] // empty' "$settings_file" 2>/dev/null)

  # Return all colors (empty values will be handled by caller)
  echo "$base $light_fg $dark_fg $badge"
}

# Default color families (fallback if no project color found)
# Purple family: base (95,0,95) - edited project
DEFAULT_P_RGB="95 0 95 135 40 135 175 80 175 255 255 255"

# Cyan family: base (0,95,95) - CWD project
DEFAULT_C_RGB="0 95 95 40 135 135 80 175 175 255 255 255"

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

# Get last edited project from ANY tool operation
PROJECT_IS_HOME=false  # Track if project root is ~ (not CODE_DIR)
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  # Extract ALL path-related parameters from the last tool_use
  # Check multiple parameter types that can contain paths
  DETECTED_PATH=""

  # Get last 50 lines to find the most recent tool_use with a path
  RECENT_TOOLS=$(tail -200 "$TRANSCRIPT" 2>/dev/null)

  # Try different path parameters in order of specificity:
  # 1. file_path (Read, Write, Edit, NotebookEdit)
  DETECTED_PATH=$(echo "$RECENT_TOOLS" | \
    grep -o '"file_path":"[^"]*"' | \
    tail -1 | \
    sed 's/"file_path":"//; s/"$//')

  # 2. notebook_path (NotebookEdit)
  if [[ -z "$DETECTED_PATH" ]]; then
    DETECTED_PATH=$(echo "$RECENT_TOOLS" | \
      grep -o '"notebook_path":"[^"]*"' | \
      tail -1 | \
      sed 's/"notebook_path":"//; s/"$//')
  fi

  # 3. path parameter (Grep, and other tools)
  if [[ -z "$DETECTED_PATH" ]]; then
    DETECTED_PATH=$(echo "$RECENT_TOOLS" | \
      grep -o '"path":"[^"]*"' | \
      tail -1 | \
      sed 's/"path":"//; s/"$//')
  fi

  # 4. pattern parameter (Glob) - extract if it contains a path
  if [[ -z "$DETECTED_PATH" ]]; then
    GLOB_PATTERN=$(echo "$RECENT_TOOLS" | \
      grep -o '"pattern":"[^"]*"' | \
      tail -1 | \
      sed 's/"pattern":"//; s/"$//')
    # Check if pattern contains a directory path
    if [[ "$GLOB_PATTERN" =~ ^(${CODE_DIR}|${HOME}|~)/ ]]; then
      DETECTED_PATH="$GLOB_PATTERN"
    fi
  fi

  # 5. cd commands in Bash
  if [[ -z "$DETECTED_PATH" ]]; then
    DETECTED_PATH=$(echo "$RECENT_TOOLS" | \
      grep -o '"command":"[^"]*"' | \
      tail -10 | \
      grep 'cd ' | \
      tail -1 | \
      sed 's/.*cd //; s/[;&].*//; s/"//g' | \
      xargs)
  fi

  # 6. Any Bash command with a path
  if [[ -z "$DETECTED_PATH" ]]; then
    DETECTED_PATH=$(echo "$RECENT_TOOLS" | \
      grep -o '"command":"[^"]*"' | \
      tail -1 | \
      grep -oE '('"$CODE_DIR"'|'"$HOME"')/[^ ";&]+' | \
      head -1)
  fi

  # Now extract project from the detected path
  if [[ -n "$DETECTED_PATH" ]]; then
    # Expand ~ to $HOME
    DETECTED_PATH="${DETECTED_PATH/#\~/$HOME}"
    # Remove glob patterns (* and **)
    DETECTED_PATH="${DETECTED_PATH%%\**}"

    # Extract project name from path
    if [[ "$DETECTED_PATH" =~ ^${CODE_DIR}/([^/]+) ]]; then
      PROJECT="${BASH_REMATCH[1]}"
    elif [[ "$DETECTED_PATH" =~ ^$HOME/([^/]+)/ ]]; then
      # File is under home but not in CODE_DIR
      PROJECT="~/${BASH_REMATCH[1]}"
      PROJECT_IS_HOME=true
    elif [[ "$DETECTED_PATH" =~ ^$HOME/[^/]+$ ]]; then
      # File directly in home
      PROJECT="~"
      PROJECT_IS_HOME=true
    fi
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

# Get CWD project (Claude's starting directory - static)
CWD_PROJECT=""
CWD_DISPLAY=""
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

if [[ "$CWD" =~ ^${CODE_DIR}/([^/]+) ]]; then
  CWD_PROJECT="${BASH_REMATCH[1]}"
  CWD_DISPLAY="$CWD_PROJECT"
elif [[ "$CWD" == "$CODE_DIR" ]]; then
  CWD_DISPLAY="${CODE_DIR/#$HOME/~}"
fi

# Load project colors and generate color families
# CWD Project colors (cyan family by default)
if [[ -n "$CWD_PROJECT" && "$CWD_PROJECT" != "~"* ]]; then
  read -r CWD_BASE CWD_LIGHT_FG CWD_DARK_FG CWD_BADGE <<< $(load_project_colors "${CODE_DIR}/${CWD_PROJECT}")
  if [[ -n "$CWD_BASE" ]]; then
    read -r CWD_R CWD_G CWD_B <<< $(hex_to_rgb "$CWD_BASE")
    read -r C_R1 C_G1 C_B1 C_R2 C_G2 C_B2 C_R3 C_G3 C_B3 C_TR C_TG C_TB <<< $(generate_color_family $CWD_R $CWD_G $CWD_B)

    # Use theme's text colors if available
    if [[ -n "$CWD_LIGHT_FG" ]]; then
      read -r C_TR C_TG C_TB <<< $(hex_to_rgb "$CWD_LIGHT_FG")
    fi

    # Dark text color for light backgrounds (git branch)
    if [[ -n "$CWD_DARK_FG" ]]; then
      read -r C_DARK_R C_DARK_G C_DARK_B <<< $(hex_to_rgb "$CWD_DARK_FG")
    else
      C_DARK_R=40; C_DARK_G=40; C_DARK_B=40  # Fallback dark gray
    fi

    # Store badge color for later use (lint indicators)
    if [[ -n "$CWD_BADGE" ]]; then
      read -r C_BADGE_R C_BADGE_G C_BADGE_B <<< $(hex_to_rgb "$CWD_BADGE")
    else
      C_BADGE_R=$C_R3; C_BADGE_G=$C_G3; C_BADGE_B=$C_B3
    fi
  else
    read -r C_R1 C_G1 C_B1 C_R2 C_G2 C_B2 C_R3 C_G3 C_B3 C_TR C_TG C_TB <<< "$DEFAULT_C_RGB"
    C_BADGE_R=$C_R3; C_BADGE_G=$C_G3; C_BADGE_B=$C_B3
    C_DARK_R=40; C_DARK_G=40; C_DARK_B=40
  fi
else
  read -r C_R1 C_G1 C_B1 C_R2 C_G2 C_B2 C_R3 C_G3 C_B3 C_TR C_TG C_TB <<< "$DEFAULT_C_RGB"
  C_BADGE_R=$C_R3; C_BADGE_G=$C_G3; C_BADGE_B=$C_B3
  C_DARK_R=40; C_DARK_G=40; C_DARK_B=40
fi

# Set CWD color variables (24-bit true color)
BG_C1="\033[48;2;${C_R1};${C_G1};${C_B1}m"
BG_C2="\033[48;2;${C_R2};${C_G2};${C_B2}m"
BG_C3="\033[48;2;${C_R3};${C_G3};${C_B3}m"
FG_C1="\033[38;2;${C_R1};${C_G1};${C_B1}m"
FG_C2="\033[38;2;${C_R2};${C_G2};${C_B2}m"
FG_C3="\033[38;2;${C_R3};${C_G3};${C_B3}m"
TEXT_C="\033[38;2;${C_TR};${C_TG};${C_TB}m"
DARK_TEXT_C="\033[38;2;${C_DARK_R};${C_DARK_G};${C_DARK_B}m"
BADGE_C="\033[38;2;${C_BADGE_R};${C_BADGE_G};${C_BADGE_B}m"

# Edited Project colors (purple family by default)
if [[ -n "$PROJECT" && "$PROJECT" != "~"* && "$PROJECT_IS_HOME" == false ]]; then
  read -r PROJ_BASE PROJ_LIGHT_FG PROJ_DARK_FG PROJ_BADGE <<< $(load_project_colors "${CODE_DIR}/${PROJECT}")
  if [[ -n "$PROJ_BASE" ]]; then
    read -r PROJ_R PROJ_G PROJ_B <<< $(hex_to_rgb "$PROJ_BASE")
    read -r P_R1 P_G1 P_B1 P_R2 P_G2 P_B2 P_R3 P_G3 P_B3 P_TR P_TG P_TB <<< $(generate_color_family $PROJ_R $PROJ_G $PROJ_B)

    # Use theme's text colors if available
    if [[ -n "$PROJ_LIGHT_FG" ]]; then
      read -r P_TR P_TG P_TB <<< $(hex_to_rgb "$PROJ_LIGHT_FG")
    fi

    # Dark text color for light backgrounds (git branch)
    if [[ -n "$PROJ_DARK_FG" ]]; then
      read -r P_DARK_R P_DARK_G P_DARK_B <<< $(hex_to_rgb "$PROJ_DARK_FG")
    else
      P_DARK_R=40; P_DARK_G=40; P_DARK_B=40  # Fallback dark gray
    fi

    # Store badge color for later use (lint indicators)
    if [[ -n "$PROJ_BADGE" ]]; then
      read -r P_BADGE_R P_BADGE_G P_BADGE_B <<< $(hex_to_rgb "$PROJ_BADGE")
    else
      P_BADGE_R=$P_R3; P_BADGE_G=$P_G3; P_BADGE_B=$P_B3
    fi
  else
    read -r P_R1 P_G1 P_B1 P_R2 P_G2 P_B2 P_R3 P_G3 P_B3 P_TR P_TG P_TB <<< "$DEFAULT_P_RGB"
    P_BADGE_R=$P_R3; P_BADGE_G=$P_G3; P_BADGE_B=$P_B3
    P_DARK_R=40; P_DARK_G=40; P_DARK_B=40
  fi
else
  read -r P_R1 P_G1 P_B1 P_R2 P_G2 P_B2 P_R3 P_G3 P_B3 P_TR P_TG P_TB <<< "$DEFAULT_P_RGB"
  P_BADGE_R=$P_R3; P_BADGE_G=$P_G3; P_BADGE_B=$P_B3
  P_DARK_R=40; P_DARK_G=40; P_DARK_B=40
fi

# Set Edited Project color variables (24-bit true color)
BG_P1="\033[48;2;${P_R1};${P_G1};${P_B1}m"
BG_P2="\033[48;2;${P_R2};${P_G2};${P_B2}m"
BG_P3="\033[48;2;${P_R3};${P_G3};${P_B3}m"
FG_P1="\033[38;2;${P_R1};${P_G1};${P_B1}m"
FG_P2="\033[38;2;${P_R2};${P_G2};${P_B2}m"
FG_P3="\033[38;2;${P_R3};${P_G3};${P_B3}m"
TEXT_P="\033[38;2;${P_TR};${P_TG};${P_TB}m"
DARK_TEXT_P="\033[38;2;${P_DARK_R};${P_DARK_G};${P_DARK_B}m"
BADGE_P="\033[38;2;${P_BADGE_R};${P_BADGE_G};${P_BADGE_B}m"

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
  # CWD project segment - ⌂ symbol (uses project color or cyan default)
  OUTPUT="${BG_C1}${TEXT_C}${BOLD} ⌂ $CWD_DISPLAY ${RESET}"

  if [[ -n "$CWD_PROJECT" ]]; then
    # Add lint for CWD
    read -r CWD_ERRORS CWD_WARNINGS <<< $(get_lint_counts "$CWD_PROJECT")

    OUTPUT="${OUTPUT}${FG_C1}${BG_C2}▶"

    if [[ "$CWD_ERRORS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${BADGE_C}${BOLD} ✗$CWD_ERRORS"
    fi

    if [[ "$CWD_WARNINGS" -gt 0 ]]; then
      OUTPUT="${OUTPUT}${BADGE_C}${BOLD} △$CWD_WARNINGS"
    fi

    if [[ "$CWD_ERRORS" -eq 0 && "$CWD_WARNINGS" -eq 0 ]]; then
      OUTPUT="${OUTPUT}${BADGE_C}${BOLD} ✓"
    fi

    OUTPUT="${OUTPUT} ${RESET}"

    # Git branch
    CWD_BRANCH=$(get_git_branch "$CWD_PROJECT")
    if [[ -n "$CWD_BRANCH" ]]; then
      OUTPUT="${OUTPUT}${FG_C2}${BG_C3}▶${DARK_TEXT_C} ⎇ ${CWD_BRANCH} ${RESET}"
    fi
  fi

  # Last edited project segment if different (purple family) - ✎ symbol
  # No arrow here - hard edge separates the two project contexts
  if [[ -n "$PROJECT" && "$PROJECT" != "$CWD_PROJECT" ]]; then
    OUTPUT="${OUTPUT}${BG_P1}${TEXT_P} ✎ $PROJECT ${RESET}"

    # Only show lint/git for CODE_DIR projects, not home-based (~)
    if [[ "$PROJECT_IS_HOME" == false ]]; then
      # Get lint for last edited project
      read -r ERRORS WARNINGS <<< $(get_lint_counts "$PROJECT")

      OUTPUT="${OUTPUT}${FG_P1}${BG_P2}▶"

      if [[ "$ERRORS" -gt 0 ]]; then
        OUTPUT="${OUTPUT}${BADGE_P}${BOLD} ✗$ERRORS"
      fi

      if [[ "$WARNINGS" -gt 0 ]]; then
        OUTPUT="${OUTPUT}${BADGE_P}${BOLD} △$WARNINGS"
      fi

      if [[ "$ERRORS" -eq 0 && "$WARNINGS" -eq 0 ]]; then
        OUTPUT="${OUTPUT}${BADGE_P}${BOLD} ✓"
      fi

      OUTPUT="${OUTPUT} ${RESET}"

      # Git branch segment (light purple)
      PROJECT_BRANCH=$(get_git_branch "$PROJECT")
      if [[ -n "$PROJECT_BRANCH" ]]; then
        OUTPUT="${OUTPUT}${FG_P2}${BG_P3}▶${DARK_TEXT_P} ⎇ ${PROJECT_BRANCH} ${RESET}"
      fi
    fi
  fi

elif [[ -n "$PROJECT" ]]; then
  # No CWD but have edited project (purple family) - ✎ symbol
  OUTPUT="${BG_P1}${TEXT_P}${BOLD} ✎ $PROJECT ${RESET}"

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
      OUTPUT="${OUTPUT}${FG_P2}${BG_P3}▶${DARK_TEXT_P} ⎇ ${PROJECT_BRANCH} ${RESET}"
    fi
  fi
else
  OUTPUT="${BG_C1}${TEXT_C} ⌂ ${CODE_DIR/#$HOME/~} ${RESET}"
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
