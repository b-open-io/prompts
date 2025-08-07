---
allowed-tools: Read, Write, Bash
description: Run a fast documentation QA pass (TOC, links, formatting) using Bun tools
argument-hint: [path?] - Optional glob/path (default: **/*.md)
---

## Your Task

If the arguments contain "--help", show this help and exit.

Otherwise, run a concise docs QA on the current repo:

### Steps
1) Determine scope
```bash
TARGET=${1:-"**/*.md"}
echo "Scanning: $TARGET"
```

2) Generate/refresh TOC for README files
```bash
fd -g README.md | xargs -I{} bunx markdown-toc -i {}
```

3) Link check (Markdown)
```bash
bunx lychee --no-progress "$TARGET" || true
```

4) Format Markdown
```bash
bunx prettier --write "$TARGET"
```

5) Report summary
```bash
echo "Done. TOC updated, links checked, files formatted."
```

Then stop.

