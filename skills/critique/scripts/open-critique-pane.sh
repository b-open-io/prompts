#!/bin/bash
# Opens critique in a split pane that closes when done
# Usage: open-critique-pane.sh [directory] [-v|-h]
#   -v: vertical split (side by side)
#   -h: horizontal split (top/bottom, default)

DIR="${1:-$(pwd)}"
DIRECTION="${2:--h}"

if [ "$DIRECTION" = "-v" ]; then
    SPLIT_CMD="split vertically with default profile"
else
    SPLIT_CMD="split horizontally with default profile"
fi

osascript <<EOF
tell application "iTerm2"
    tell current window
        tell current session
            set newSession to ($SPLIT_CMD)
        end tell
        tell newSession
            write text "cd $DIR && bunx critique; exit"
        end tell
    end tell
end tell
EOF
