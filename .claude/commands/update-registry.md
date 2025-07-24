---
version: 1.0.0
allowed-tools: Read, Write, Glob, Grep, Bash(date:*), Bash(find:*), Bash(wc:*)
description: Auto-generate registry.json from all prompt files
argument-hint: [--dry-run] [--help]
---

## Registry Update Tool

This command scans all prompt files and generates an accurate registry.json

## Your Task

If arguments contain "--help", show:
```
update-registry - Auto-generate registry.json from prompt files

Usage: /update-registry [--dry-run]

Description:
Scans all .md files in category folders and generates registry.json
with accurate counts, versions, and metadata.

Options:
  --dry-run  Show what would be generated without writing
  --help     Show this help message

Categories scanned:
- development/
- design/
- infrastructure/
- blockchain/
- analytics/
- cross-project/
```
Then stop.

Otherwise:

1. **Scan for prompt files**:
   - Use Glob to find all .md files in category directories
   - Skip README files and non-prompt files

2. **Extract metadata from each file**:
   - Read frontmatter for version, description, tags
   - Generate ID from file path
   - Extract first heading as name if not in frontmatter

3. **Generate registry structure**:
   - Count total prompts
   - Count categories with content
   - Set current date as last_updated
   - Build complete JSON structure

4. **Write or preview**:
   - If --dry-run, show the generated JSON
   - Otherwise, write to registry.json

### Registry Format
```json
{
  "$schema": "./prompt-schema.json",
  "version": "1.0.0",
  "name": "BSV Ecosystem Prompts Registry",
  "description": "Central registry of all prompts in the BSV development ecosystem",
  "categories": {
    "development": {
      "name": "Development Workflows",
      "description": "Code management, dependency updates, and development automation",
      "icon": "🚀"
    },
    // ... other categories
  },
  "prompts": [
    {
      "id": "category/filename",
      "name": "Extracted from file",
      "version": "From frontmatter or 1.0.0",
      "description": "From frontmatter",
      "category": "From directory",
      "path": "category/filename.md",
      "tags": ["from", "frontmatter"],
      "metadata": {
        "last_modified": "file modification date"
      }
    }
  ],
  "statistics": {
    "total_prompts": "actual count",
    "categories_count": "categories with files",
    "last_updated": "today's date",
    "generated": true
  }
}
```

### Implementation Notes
- Parse YAML frontmatter correctly
- Handle missing metadata gracefully
- Sort prompts by category then name
- Include file modification dates
- Mark as generated to indicate auto-generation