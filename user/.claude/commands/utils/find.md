---
version: 1.1.0
allowed-tools: Bash(find:*), Bash(echo:*), Bash(grep:*), Bash(tree:*), Bash(du:*), Bash(ls:*), Bash(head:*), Bash(stat:*), Glob
description: Fast file/content search optimized for large code repositories
argument-hint: <pattern> [path] [--content] [--tree] [--recent <days>] [--type <ext>] [--max-size <MB>]
---

## Fast Find Command

Comprehensive search tool optimized for large code repositories (like your 98GB ~/code folder).

## Your Task

If arguments contain "--help", show:
```
find - Fast search optimized for large code repositories

Usage: /utils:find <pattern> [path] [options]

Description:
Powerful search that automatically excludes time-consuming directories
and provides multiple search modes for different needs.

Arguments:
  <pattern>      Search pattern (required)
  [path]         Starting directory (default: current dir)

Options:
  --content      Search within file contents instead of names
  --tree         Show directory tree structure
  --recent <N>   Find files modified in last N days
  --type <ext>   Filter by extension (js, md, json, etc.)
  --max-size <N> Skip files larger than N MB
  --depth <N>    Limit directory depth (tree mode)
  --ignore-case  Case-insensitive search (-i)

Examples:
  # Find files by name
  /utils:find yours ~/code
  /utils:find "*.json" . --type json
  
  # Search file contents
  /utils:find "Yours wallet" ~/code --content
  /utils:find "TODO" . --content --type js
  
  # Show directory structure
  /utils:find ~/code --tree --depth 2
  
  # Find recent changes
  /utils:find . --recent 7 --type md
  
  # Complex search
  /utils:find config ~/code --type json --max-size 1

Performance tips:
- Automatically excludes: node_modules, .git, dist, build, vendor, etc.
- Use --max-size to skip large binary files
- Use --type to narrow search scope
- Use --depth with --tree to limit output

Excluded directories:
  node_modules, .git, dist, build, .next, out, coverage,
  target, venv, env, .env, __pycache__, .pytest_cache,
  vendor, packages, deps, .turbo, .cache, tmp, temp,
  .idea, .vscode, .DS_Store, bower_components, jspm_packages
```
Then stop.

Otherwise, perform the search based on arguments:

### Parse Arguments
Extract from $ARGUMENTS:
- Pattern (required)
- Path (default to . if not provided)
- Options: --content, --tree, --recent, --type, --max-size, --depth, --ignore-case

### Define Exclusions
Common directories that slow down searches:
```
EXCLUDES=(
  -path "*/node_modules" -prune -o
  -path "*/.git" -prune -o
  -path "*/dist" -prune -o
  -path "*/build" -prune -o
  -path "*/.next" -prune -o
  -path "*/out" -prune -o
  -path "*/coverage" -prune -o
  -path "*/target" -prune -o
  -path "*/venv" -prune -o
  -path "*/env" -prune -o
  -path "*/.env" -prune -o
  -path "*/__pycache__" -prune -o
  -path "*/.pytest_cache" -prune -o
  -path "*/vendor" -prune -o
  -path "*/packages" -prune -o
  -path "*/deps" -prune -o
  -path "*/.turbo" -prune -o
  -path "*/.cache" -prune -o
  -path "*/tmp" -prune -o
  -path "*/temp" -prune -o
  -path "*/.idea" -prune -o
  -path "*/.vscode" -prune -o
  -path "*/bower_components" -prune -o
  -path "*/jspm_packages" -prune -o
)
```

### Search Modes

#### 1. File Name Search (default)
```bash
find [path] \
  ${EXCLUDES[@]} \
  -name "*[pattern]*" \
  -type f \
  ${SIZE_FILTER} \
  ${TYPE_FILTER} \
  -print | head -100
```

#### 2. Content Search (--content)
```bash
grep -r "[pattern]" [path] \
  --exclude-dir={node_modules,.git,dist,build,.next,coverage,vendor,venv,env,.env,__pycache__,.pytest_cache,.turbo,.cache,tmp,temp} \
  ${TYPE_FILTER:+--include="*.${type}"} \
  ${CASE_FLAG} \
  -l | head -100
```

#### 3. Tree View (--tree)
Show directory structure with sizes:
```bash
# For macOS
tree -L [depth] -d --du -h [path] \
  -I 'node_modules|.git|dist|build|.next|vendor|venv|env|coverage' \
  | head -50

# Fallback if tree not available
find [path] \
  ${EXCLUDES[@]} \
  -type d \
  -maxdepth [depth] \
  -exec du -sh {} \; 2>/dev/null | sort -h
```

#### 4. Recent Files (--recent)
```bash
find [path] \
  ${EXCLUDES[@]} \
  -type f \
  -mtime -[days] \
  ${TYPE_FILTER} \
  ${SIZE_FILTER} \
  -exec ls -la {} \; | head -50
```

### Size Filter (--max-size)
When specified, add: `-size -${size}M` to find commands

### Type Filter (--type)
When specified:
- For find: `-name "*.${type}"`
- For grep: `--include="*.${type}"`

### Special Patterns

For common searches, provide shortcuts:
- `package.json` - Find all package.json files
- `readme` - Find all README files (case-insensitive)
- `config` - Find common config files
- `test` - Find test files

### Output Formatting

- Show relative paths when possible
- For content search, show filename only (not line content)
- For tree view, show sizes in human-readable format
- For recent files, show modification date

### Performance Optimizations

1. **Limit results** - Use head to prevent overwhelming output
2. **Early termination** - Stop after finding enough results
3. **Smart defaults** - Reasonable depth limits for tree view
4. **Size awareness** - Skip binary files by default