#!/bin/bash
# Simple wrapper for markdown to Lexical conversion
# Usage: ./md-to-lexical.sh input.md > output.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$1" ]; then
    echo "Usage: $0 <markdown-file>" >&2
    exit 1
fi

python3 "$SCRIPT_DIR/md_to_lexical.py" "$1"
