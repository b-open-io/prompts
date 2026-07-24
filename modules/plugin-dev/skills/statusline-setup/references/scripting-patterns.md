# Scripting Patterns

Common patterns for creating custom status line scripts in Bash, Python, and Node.js.

## ANSI Color Codes

### Basic 256-Color

```bash
# Foreground (text) colors
FG_RED='\033[38;5;196m'
FG_GREEN='\033[38;5;46m'
FG_BLUE='\033[38;5;33m'
FG_YELLOW='\033[38;5;226m'
FG_WHITE='\033[38;5;255m'
FG_GRAY='\033[38;5;245m'
FG_BLACK='\033[38;5;232m'

# Background colors
BG_RED='\033[48;5;196m'
BG_GREEN='\033[48;5;46m'
BG_BLUE='\033[48;5;33m'

# Reset
RESET='\033[0m'
BOLD='\033[1m'
```

### True Color (24-bit RGB)

```bash
# Convert hex to RGB components
hex_to_rgb() {
    local hex="${1#\#}"
    local r=$((16#${hex:0:2}))
    local g=$((16#${hex:2:2}))
    local b=$((16#${hex:4:2}))
    echo "$r $g $b"
}

# Create foreground color from RGB
fg_rgb() {
    echo "\033[38;2;$1;$2;$3m"
}

# Create background color from RGB
bg_rgb() {
    echo "\033[48;2;$1;$2;$3m"
}

# Usage
read -r R G B <<< "$(hex_to_rgb "#8d0756")"
BG="\033[48;2;${R};${G};${B}m"
FG="\033[38;2;255;255;255m"
echo -e "${BG}${FG} Colored Text ${RESET}"
```

### Contrast Text Color

Calculate whether to use light or dark text based on background:

```bash
get_contrast_text() {
    local r=$1 g=$2 b=$3

    # Calculate relative luminance (WCAG formula)
    local lum=$(awk "BEGIN {
        rf = $r / 255
        gf = $g / 255
        bf = $b / 255
        rf = (rf <= 0.03928) ? rf / 12.92 : ((rf + 0.055) / 1.055) ^ 2.4
        gf = (gf <= 0.03928) ? gf / 12.92 : ((gf + 0.055) / 1.055) ^ 2.4
        bf = (bf <= 0.03928) ? bf / 12.92 : ((bf + 0.055) / 1.055) ^ 2.4
        print 0.2126 * rf + 0.7152 * gf + 0.0722 * bf
    }")

    # Return white or black based on luminance
    if (( $(awk "BEGIN {print ($lum > 0.4)}") )); then
        echo "40 40 40"  # Dark text
    else
        echo "255 255 255"  # Light text
    fi
}
```

## Powerline Separators

```bash
# Powerline arrow characters (require Powerline fonts)
ARROW_RIGHT=""      # \ue0b0
ARROW_LEFT=""       # \ue0b2
ARROW_RIGHT_THIN="" # \ue0b1
ARROW_LEFT_THIN=""  # \ue0b3

# Create powerline segment transition
# Usage: powerline_sep $PREV_BG $NEXT_BG
powerline_sep() {
    local prev_bg=$1
    local next_bg=$2
    echo -e "${next_bg}\033[38;2;${prev_bg}m${ARROW_RIGHT}"
}
```

## Git Integration

### Branch with Dirty Indicator

```bash
get_git_branch() {
    local dir="${1:-.}"

    if [[ -d "$dir/.git" ]] || git -C "$dir" rev-parse --git-dir > /dev/null 2>&1; then
        local branch=$(git -C "$dir" branch --show-current 2>/dev/null)
        local dirty=""

        # Check for uncommitted changes
        if ! git -C "$dir" diff --quiet HEAD 2>/dev/null; then
            dirty="*"
        fi

        echo "${branch}${dirty}"
    fi
}
```

### Git Status Counts

```bash
get_git_status() {
    local dir="${1:-.}"

    if git -C "$dir" rev-parse --git-dir > /dev/null 2>&1; then
        local staged=$(git -C "$dir" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
        local unstaged=$(git -C "$dir" diff --numstat 2>/dev/null | wc -l | tr -d ' ')
        local untracked=$(git -C "$dir" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

        echo "$staged $unstaged $untracked"
    fi
}
```

## Project Detection

### Find Project Root

```bash
find_project_root() {
    local path="$1"

    # Start from file's directory if it's a file
    [[ -f "$path" ]] && path=$(dirname "$path")

    local current="$path"
    while [[ "$current" != "/" && "$current" != "$HOME" ]]; do
        # Check for common project markers
        if [[ -d "$current/.git" ]] || \
           [[ -f "$current/package.json" ]] || \
           [[ -f "$current/go.mod" ]] || \
           [[ -f "$current/Cargo.toml" ]] || \
           [[ -f "$current/pyproject.toml" ]] || \
           [[ -f "$current/composer.json" ]] || \
           [[ -f "$current/build.gradle" ]] || \
           [[ -f "$current/pom.xml" ]] || \
           [[ -f "$current/Makefile" ]]; then
            echo "$current"
            return
        fi
        current=$(dirname "$current")
    done

    # No project root found, return original path
    echo "$path"
}
```

### Load Peacock Colors

```bash
load_peacock_colors() {
    local proj_dir="$1"
    local settings_file="$proj_dir/.vscode/settings.json"

    if [[ ! -f "$settings_file" ]]; then
        return
    fi

    # Extract Peacock color
    local base=$(jq -r '.["peacock.color"] // .workbench.colorCustomizations["titleBar.activeBackground"] // empty' "$settings_file" 2>/dev/null)

    # Extract foreground colors
    local light_fg=$(jq -r '.workbench.colorCustomizations["activityBar.foreground"] // empty' "$settings_file" 2>/dev/null)
    local dark_fg=$(jq -r '.workbench.colorCustomizations["activityBarBadge.foreground"] // empty' "$settings_file" 2>/dev/null)
    local badge=$(jq -r '.workbench.colorCustomizations["activityBarBadge.background"] // empty' "$settings_file" 2>/dev/null)

    echo "$base $light_fg $dark_fg $badge"
}
```

## Clickable Links (OSC 8)

```bash
# Create clickable hyperlink
# Usage: make_link "URL" "Display Text"
make_link() {
    local url="$1"
    local text="$2"
    echo -e "\033]8;;${url}\a${text}\033]8;;\a"
}

# Editor-specific URLs
get_file_url() {
    local file_path="$1"
    local editor="${2:-vscode}"

    case "$editor" in
        cursor)  echo "cursor://file${file_path}" ;;
        vscode)  echo "vscode://file${file_path}" ;;
        sublime) echo "subl://open?url=file://${file_path}" ;;
        *)       echo "file://${file_path}" ;;
    esac
}

# Usage
FILE_URL=$(get_file_url "/path/to/file.ts" "cursor")
echo -e "$(make_link "$FILE_URL" "file.ts")"
```

## Terminal Integration

### Set Terminal Title

```bash
set_terminal_title() {
    local title="$1"
    echo -ne "\033]0;${title}\007" >&2
}
```

### iTerm2 Tab Color

```bash
set_iterm_tab_color() {
    local r=$1 g=$2 b=$3

    if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
        echo -ne "\033]6;1;bg;red;brightness;${r}\007" >&2
        echo -ne "\033]6;1;bg;green;brightness;${g}\007" >&2
        echo -ne "\033]6;1;bg;blue;brightness;${b}\007" >&2
    fi
}

# Reset tab color
reset_iterm_tab_color() {
    if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
        echo -ne "\033]6;1;bg;*;default\007" >&2
    fi
}
```

## Transcript Parsing

### Extract Last Edited File

```bash
get_last_edited_file() {
    local transcript="$1"

    if [[ ! -f "$transcript" ]]; then
        return
    fi

    local recent=$(tail -200 "$transcript" 2>/dev/null)

    # Try file_path parameter
    local path=$(echo "$recent" | grep -o '"file_path":"[^"]*"' | tail -1 | sed 's/"file_path":"//; s/"$//')

    # Try notebook_path
    if [[ -z "$path" ]]; then
        path=$(echo "$recent" | grep -o '"notebook_path":"[^"]*"' | tail -1 | sed 's/"notebook_path":"//; s/"$//')
    fi

    # Try path parameter
    if [[ -z "$path" ]]; then
        path=$(echo "$recent" | grep -o '"path":"[^"]*"' | tail -1 | sed 's/"path":"//; s/"$//')
    fi

    # Expand ~ to $HOME
    echo "${path/#\~/$HOME}"
}
```

### Extract Token Usage from Transcript

```bash
get_transcript_tokens() {
    local transcript="$1"

    if [[ -f "$transcript" ]]; then
        tail -50 "$transcript" 2>/dev/null | \
            jq -r 'select(.usage) | "\(.usage.input_tokens // 0 + .usage.output_tokens // 0)"' 2>/dev/null | \
            tail -1
    fi
}
```

## Formatting Helpers

### Format Numbers

```bash
# Format large numbers with K/M suffix
format_number() {
    local num=$1

    if [[ $num -ge 1000000 ]]; then
        echo "$((num / 1000000))M"
    elif [[ $num -ge 1000 ]]; then
        echo "$((num / 1000))k"
    else
        echo "$num"
    fi
}

# Format currency
format_cost() {
    local cost=$1
    printf "\$%.2f" "$cost"
}

# Format duration
format_duration() {
    local ms=$1
    local seconds=$((ms / 1000))
    local minutes=$((seconds / 60))
    local hours=$((minutes / 60))

    if [[ $hours -gt 0 ]]; then
        echo "${hours}h $((minutes % 60))m"
    elif [[ $minutes -gt 0 ]]; then
        echo "${minutes}m $((seconds % 60))s"
    else
        echo "${seconds}s"
    fi
}
```

### Progress Bar

```bash
# Create ASCII progress bar
progress_bar() {
    local percent=$1
    local width=${2:-20}

    local filled=$((percent * width / 100))
    local empty=$((width - filled))

    printf "["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %d%%" "$percent"
}
```

## Python Patterns

```python
#!/usr/bin/env python3
import json
import sys
import os
import subprocess

# Colors
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'

    @staticmethod
    def fg_rgb(r, g, b):
        return f'\033[38;2;{r};{g};{b}m'

    @staticmethod
    def bg_rgb(r, g, b):
        return f'\033[48;2;{r};{g};{b}m'

    @staticmethod
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

# Git
def get_git_branch(path='.'):
    try:
        result = subprocess.run(
            ['git', '-C', path, 'branch', '--show-current'],
            capture_output=True, text=True
        )
        branch = result.stdout.strip()

        # Check for dirty
        dirty_result = subprocess.run(
            ['git', '-C', path, 'diff', '--quiet', 'HEAD'],
            capture_output=True
        )
        dirty = '*' if dirty_result.returncode != 0 else ''

        return f"{branch}{dirty}" if branch else None
    except:
        return None

# Project detection
def find_project_root(path):
    markers = ['.git', 'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml']
    current = path if os.path.isdir(path) else os.path.dirname(path)

    while current != '/' and current != os.path.expanduser('~'):
        for marker in markers:
            if os.path.exists(os.path.join(current, marker)):
                return current
        current = os.path.dirname(current)

    return path

# Main
data = json.load(sys.stdin)
model = data['model']['display_name']
current_dir = os.path.basename(data['workspace']['current_dir'])
branch = get_git_branch() or ''

print(f"[{model}] {current_dir} {branch}")
```

## Node.js Patterns

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors
const Colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    fgRgb: (r, g, b) => `\x1b[38;2;${r};${g};${b}m`,
    bgRgb: (r, g, b) => `\x1b[48;2;${r};${g};${b}m`,
    hexToRgb: (hex) => {
        hex = hex.replace('#', '');
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
        ];
    }
};

// Git
function getGitBranch(dir = '.') {
    try {
        const branch = execSync(`git -C "${dir}" branch --show-current`, { encoding: 'utf8' }).trim();
        let dirty = '';
        try {
            execSync(`git -C "${dir}" diff --quiet HEAD`);
        } catch {
            dirty = '*';
        }
        return branch ? `${branch}${dirty}` : null;
    } catch {
        return null;
    }
}

// Project detection
function findProjectRoot(startPath) {
    const markers = ['.git', 'package.json', 'go.mod', 'Cargo.toml'];
    let current = fs.statSync(startPath).isDirectory() ? startPath : path.dirname(startPath);

    while (current !== '/' && current !== require('os').homedir()) {
        for (const marker of markers) {
            if (fs.existsSync(path.join(current, marker))) {
                return current;
            }
        }
        current = path.dirname(current);
    }
    return startPath;
}

// Main
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input);
    const model = data.model.display_name;
    const currentDir = path.basename(data.workspace.current_dir);
    const branch = getGitBranch() || '';

    console.log(`[${model}] ${currentDir} ${branch}`);
});
```
