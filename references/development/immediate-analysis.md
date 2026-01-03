---
name: immediate-analysis
version: 1.0.0
description: Standard patterns for initial project analysis
---

# Immediate Analysis Protocol

## Universal Project Analysis
When starting any task, perform relevant analysis based on context:

### For JavaScript/TypeScript Projects
```bash
# Check package manager and dependencies
cat package.json | jq -r '.dependencies // {} | keys[]' | head -20
cat package.json | jq -r '.devDependencies // {} | keys[]' | head -20

# Identify build tools and frameworks
ls -la *.config.* 2>/dev/null
cat package.json | jq -r '.scripts'

# Find main source structure
find . -type d -name "src" -o -name "app" -o -name "lib" | head -10
```

### For Go Projects
```bash
# Check module and dependencies
cat go.mod | head -20
go list -m all 2>/dev/null | head -20

# Find main packages
find . -name "main.go" -o -name "*_test.go" | head -10
```

### For Python Projects
```bash
# Check package management
cat requirements.txt 2>/dev/null | head -20
cat pyproject.toml 2>/dev/null | grep -A10 dependencies
cat setup.py 2>/dev/null | grep -A10 install_requires

# Find main modules
find . -name "*.py" -maxdepth 2 | head -10
```

### For Documentation Projects
```bash
# Find existing documentation
find . -name "README*" -o -name "*.md" -o -name "docs" -type d
ls -la docs/ 2>/dev/null
```

### For Configuration Analysis
```bash
# Check environment files
ls -la .env* 2>/dev/null
ls -la config/ 2>/dev/null

# Check CI/CD setup
ls -la .github/workflows/ 2>/dev/null
ls -la .gitlab-ci.yml 2>/dev/null
```

## Analysis Output Format
After analysis, summarize findings:
```
📊 **Project Analysis**:
- **Type**: [Node.js/Go/Python/etc.]
- **Framework**: [Next.js/Express/Django/etc.]
- **Key Dependencies**: [List top 3-5]
- **Build System**: [Vite/Webpack/etc.]
- **Test Framework**: [Jest/Vitest/Pytest/etc.]
```