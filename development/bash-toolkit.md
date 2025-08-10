---
name: bash-toolkit
version: 1.0.0
description: Common bash commands and patterns for agents
---

# Bash Command Toolkit

## File Discovery Patterns
```bash
# Find files by extension
find . -name "*.ts" -o -name "*.tsx" | head -20

# Find directories
find . -type d -name "src" -o -name "lib" | head -10

# Fast file listing with fd (if available)
fd -e ts -e tsx 2>/dev/null | head -20

# List files with specific patterns
ls -la src/**/*.ts 2>/dev/null | head -20
```

## Content Search Patterns
```bash
# Search with context
grep -r "pattern" --include="*.ts" -B 2 -A 2

# Exclude common directories
grep -r "pattern" --exclude-dir={node_modules,dist,build,.git}

# Using ripgrep for speed (preferred)
rg "pattern" -t ts -t tsx

# Search for function definitions
grep -r "function\|const.*=.*=>" --include="*.ts"

# Find class definitions
grep -r "^class\|^export class" --include="*.ts"
```

## Project Analysis Commands
```bash
# Count lines of code
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1

# List recent changes
git log --oneline -10
git diff --stat HEAD~5..HEAD

# Check file sizes
du -sh * | sort -h | tail -10

# Find largest files
find . -type f -exec du -h {} + | sort -rh | head -10
```

## JSON Processing with jq
```bash
# Extract specific fields
cat package.json | jq -r '.name, .version'

# Filter dependencies
cat package.json | jq -r '.dependencies | keys[]' | grep "react"

# Pretty print
cat data.json | jq '.'

# Extract nested values
cat config.json | jq -r '.database.host'

# Filter arrays
cat data.json | jq '.items[] | select(.active == true)'
```

## Common Safety Patterns
```bash
# Always check if directory exists before cd
[ -d "src" ] && cd src || echo "Directory not found"

# Safe file operations
cp important.conf important.conf.bak
mv old.txt new.txt 2>/dev/null || echo "Move failed"

# Check command availability
command -v bun >/dev/null 2>&1 || echo "bun not installed"

# Create directory if not exists
mkdir -p "$HOME/.claude/agents" 2>/dev/null || true

# Safe variable expansion
echo "${VAR:-default_value}"
```

## Performance Optimizations
```bash
# Parallel execution with xargs
find . -name "*.ts" | xargs -P 4 -I {} grep "pattern" {}

# Batch operations
find . -name "*.txt" -exec cat {} + > combined.txt

# Use head/tail to limit output
grep -r "pattern" . | head -100

# Stream processing with pipes
cat large.log | grep "ERROR" | awk '{print $1, $5}' | sort | uniq -c
```