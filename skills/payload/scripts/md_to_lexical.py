#!/usr/bin/env python3
"""
Convert Markdown to Payload CMS Lexical JSON format.

Usage:
    python3 md_to_lexical.py input.md
    python3 md_to_lexical.py input.md > output.json
    cat input.md | python3 md_to_lexical.py
"""

import sys
import json
import re


def text_node(text: str, format: int = 0) -> dict:
    """Create a text node. Format: 0=normal, 1=bold, 2=italic, 3=bold+italic"""
    return {
        "type": "text",
        "text": text,
        "format": format,
        "style": "",
        "detail": 0,
        "mode": "normal",
        "version": 1
    }


def paragraph_node(children: list) -> dict:
    """Create a paragraph node."""
    return {
        "type": "paragraph",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": children,
        "direction": "ltr",
        "textFormat": 0
    }


def heading_node(text: str, level: int) -> dict:
    """Create a heading node (h1-h6)."""
    return {
        "type": "heading",
        "tag": f"h{level}",
        "format": "",
        "indent": 0,
        "version": 1,
        "children": [text_node(text)],
        "direction": "ltr"
    }


def code_block_node(code: str, language: str = "") -> dict:
    """Create a code block node."""
    return {
        "type": "block",
        "format": "",
        "indent": 0,
        "version": 2,
        "fields": {
            "id": "",
            "blockName": "",
            "blockType": "code",
            "code": code,
            "language": language or "plaintext"
        }
    }


def list_item_node(children: list) -> dict:
    """Create a list item node."""
    return {
        "type": "listitem",
        "format": "",
        "indent": 0,
        "version": 1,
        "value": 1,
        "children": children,
        "direction": "ltr"
    }


def list_node(items: list, ordered: bool = False) -> dict:
    """Create a list node (ul or ol)."""
    return {
        "type": "list",
        "listType": "number" if ordered else "bullet",
        "format": "",
        "indent": 0,
        "version": 1,
        "start": 1,
        "tag": "ol" if ordered else "ul",
        "children": items,
        "direction": "ltr"
    }


def horizontal_rule_node() -> dict:
    """Create a horizontal rule node."""
    return {
        "type": "horizontalrule",
        "version": 1
    }


def parse_inline(text: str) -> list:
    """Parse inline formatting (bold, italic, code, links)."""
    children = []

    # Pattern for inline code, bold, italic
    # Process in order: code first (to avoid conflicts), then bold, then italic
    patterns = [
        (r'`([^`]+)`', lambda m: text_node(m.group(1), 16)),  # code format
        (r'\*\*([^*]+)\*\*', lambda m: text_node(m.group(1), 1)),  # bold
        (r'__([^_]+)__', lambda m: text_node(m.group(1), 1)),  # bold alt
        (r'\*([^*]+)\*', lambda m: text_node(m.group(1), 2)),  # italic
        (r'_([^_]+)_', lambda m: text_node(m.group(1), 2)),  # italic alt
    ]

    # Simple approach: just return plain text for now
    # Complex inline parsing would require more sophisticated tokenization
    if text.strip():
        # Handle basic bold/italic
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # strip bold markers
        text = re.sub(r'__([^_]+)__', r'\1', text)
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)
        text = re.sub(r'`([^`]+)`', r'\1', text)
        children.append(text_node(text))

    return children


def parse_markdown(md: str) -> dict:
    """Parse markdown and return Lexical JSON structure."""
    lines = md.split('\n')
    children = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Empty line - skip
        if not line.strip():
            i += 1
            continue

        # Heading
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            children.append(heading_node(text, level))
            i += 1
            continue

        # Code block
        if line.startswith('```'):
            language = line[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            code = '\n'.join(code_lines)
            children.append(code_block_node(code, language))
            i += 1  # skip closing ```
            continue

        # Horizontal rule
        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', line.strip()):
            children.append(horizontal_rule_node())
            i += 1
            continue

        # Unordered list
        if re.match(r'^[-*+]\s+', line):
            items = []
            while i < len(lines) and re.match(r'^[-*+]\s+', lines[i]):
                item_text = re.sub(r'^[-*+]\s+', '', lines[i])
                items.append(list_item_node(parse_inline(item_text)))
                i += 1
            children.append(list_node(items, ordered=False))
            continue

        # Ordered list
        if re.match(r'^\d+\.\s+', line):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i]):
                item_text = re.sub(r'^\d+\.\s+', '', lines[i])
                items.append(list_item_node(parse_inline(item_text)))
                i += 1
            children.append(list_node(items, ordered=True))
            continue

        # Regular paragraph - collect until empty line or special block
        para_lines = []
        while i < len(lines):
            current = lines[i]
            # Stop at empty line, heading, code block, list, hr
            if not current.strip():
                break
            if re.match(r'^#{1,6}\s+', current):
                break
            if current.startswith('```'):
                break
            if re.match(r'^[-*+]\s+', current):
                break
            if re.match(r'^\d+\.\s+', current):
                break
            if re.match(r'^(-{3,}|\*{3,}|_{3,})$', current.strip()):
                break
            para_lines.append(current)
            i += 1

        if para_lines:
            para_text = ' '.join(para_lines)
            inline_children = parse_inline(para_text)
            if inline_children:
                children.append(paragraph_node(inline_children))

    return {
        "root": {
            "type": "root",
            "format": "",
            "indent": 0,
            "version": 1,
            "children": children,
            "direction": "ltr"
        }
    }


def main():
    # Read from file argument or stdin
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            md = f.read()
    else:
        md = sys.stdin.read()

    lexical = parse_markdown(md)
    print(json.dumps(lexical, indent=2))


if __name__ == '__main__':
    main()
