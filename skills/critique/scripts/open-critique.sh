#!/bin/bash
# Opens critique in a new iTerm2 tab in the current directory

DIR="${1:-$(pwd)}"

osascript -e "tell application \"iTerm2\"
    tell current window
        create tab with default profile
        tell current session
            write text \"cd $DIR && bunx critique\"
        end tell
    end tell
end tell"
