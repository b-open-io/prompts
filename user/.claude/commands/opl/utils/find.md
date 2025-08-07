---
version: 1.2.0
allowed-tools: Bash(find:*), Bash(echo:*), Bash(grep:*), Bash(tree:*), Bash(du:*), Bash(ls:*), Bash(head:*), Bash(stat:*), Bash(rg:*), Bash(fd:*), Bash(jq:*), Bash(awk:*), Bash(sed:*), Glob
description: Fast file/content search optimized for large repos with fd/rg fallbacks
argument-hint: <pattern> [path] [--content] [--tree] [--recent <days>] [--type <ext>] [--max-size <MB>] [--include <glob>] [--exclude <glob>] [--ignore-case] [--hidden] [--git] [--json] [--head <N>] [--depth <N>]
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
  --content        Search within file contents instead of names
  --tree           Show directory tree structure
  --recent <N>     Find files modified in last N days
  --type <ext>     Filter by extension (js, md, json, etc.)
  --max-size <N>   Skip files larger than N MB
  --include <glob> Include only paths matching glob (repeatable)
  --exclude <glob> Exclude paths matching glob (repeatable)
  --ignore-case    Case-insensitive search
  --hidden         Include hidden files
  --git            Only search git-tracked files (where supported)
  --json           JSON output (one path per element)
  --head <N>       Limit number of results (default: 100)
  --depth <N>      Limit directory depth (tree mode)

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
- Uses fd/rg when available (gitignore-aware, fast); falls back to find/grep
- Auto-excludes heavy dirs (node_modules, .git, dist, build, vendor, etc.)
- Use --type and --include/--exclude to narrow scope
- Use --max-size to skip large binaries; --head to cap results

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
- Options: --content, --tree, --recent, --type, --max-size, --include, --exclude, --ignore-case, --hidden, --git, --json, --head, --depth

### Define Exclusions
Common directories that slow down searches (auto-excluded if present):
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
Prefer fd (fast, gitignore-aware), fallback to find:
```bash
HEAD_LIMIT=${HEAD_LIMIT:-100}
if command -v fd >/dev/null 2>&1; then
  FD_ARGS=(--type f)
  [ -n "$type" ] && FD_ARGS+=(--extension "$type")
  [ -n "$CASE_FLAG" ] && FD_ARGS+=(-i)
  [ -n "$HIDDEN" ] && FD_ARGS+=(--hidden)
  [ -n "$MAX_SIZE" ] && FD_ARGS+=(--size -${MAX_SIZE}M)
  for g in "${INCLUDES[@]}"; do FD_ARGS+=(--glob "$g"); done
  for g in "${EXCLUDES_GLOB[@]}"; do FD_ARGS+=(--exclude "$g"); done
  fd "${FD_ARGS[@]}" --search-path "$PATH_ARG" -- "$PATTERN" | head -n "$HEAD_LIMIT"
else
  find "$PATH_ARG" \
    ${EXCLUDES[@]} \
    -type f \
    ${TYPE_FILTER:+-name "*.${type}"} \
    ${SIZE_FILTER} \
    ${CASE_FLAG:+-iname "*${PATTERN}*"} ${CASE_FLAG: -1} \
    ${CASE_FLAG:+'-name "*'${PATTERN}'*"'} \
    -print | head -n "$HEAD_LIMIT"
fi
```

#### 2. Content Search (--content)
Prefer ripgrep (rg), fallback to grep:
```bash
HEAD_LIMIT=${HEAD_LIMIT:-100}
if command -v rg >/dev/null 2>&1; then
  RG_ARGS=(--no-heading -n -S)
  [ -n "$CASE_FLAG" ] && RG_ARGS+=(-i)
  [ -n "$type" ] && RG_ARGS+=(--type "$type")
  [ -n "$HIDDEN" ] && RG_ARGS+=(--hidden)
  for g in "${EXCLUDES_GLOB[@]}"; do RG_ARGS+=(--glob "!$g"); done
  for g in "${INCLUDES[@]}"; do RG_ARGS+=(--glob "$g"); done
  rg "${RG_ARGS[@]}" --json -- "$PATTERN" "$PATH_ARG" | jq -r 'select(.type=="match") | .data.path.text' | head -n "$HEAD_LIMIT"
else
  grep -r "$PATTERN" "$PATH_ARG" \
    --exclude-dir={node_modules,.git,dist,build,.next,coverage,vendor,venv,env,.env,__pycache__,.pytest_cache,.turbo,.cache,tmp,temp} \
    ${TYPE_FILTER:+--include="*.${type}"} \
    ${CASE_FLAG} \
    -l | head -n "$HEAD_LIMIT"
fi
```

#### 3. Tree View (--tree)
Show directory structure with sizes:
```bash
# For macOS
if command -v tree >/dev/null 2>&1; then
  tree -L "$DEPTH" -d --du -h "$PATH_ARG" \
    -I 'node_modules|.git|dist|build|.next|vendor|venv|env|coverage' \
    | head -50
else
  find "$PATH_ARG" \
    ${EXCLUDES[@]} \
    -type d \
    -maxdepth "$DEPTH" \
    -exec du -sh {} \; 2>/dev/null | sort -h | head -50
fi

# Fallback if tree not available
find [path] \
  ${EXCLUDES[@]} \
  -type d \
  -maxdepth [depth] \
  -exec du -sh {} \; 2>/dev/null | sort -h
```

#### 4. Recent Files (--recent)
```bash
find "$PATH_ARG" \
  ${EXCLUDES[@]} \
  -type f \
  -mtime -"$DAYS" \
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