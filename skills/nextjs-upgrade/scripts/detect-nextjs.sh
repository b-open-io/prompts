#!/usr/bin/env bash
# Detect Next.js project state from package.json and directory structure.
# Outputs JSON to stdout. All detection is file-based — no network calls.
set -euo pipefail

DIR="${1:-.}"
cd "$DIR"

# Require package.json
if [ ! -f "package.json" ]; then
  echo '{"error": "No package.json found in the specified directory"}'
  exit 1
fi

# Helper: extract a version from package.json dependencies (deps + devDeps)
pkg_version() {
  local pkg="$1"
  # Check dependencies first, then devDependencies
  local ver
  ver=$(node -e "
    const p = require('./package.json');
    const deps = { ...p.dependencies, ...p.devDependencies };
    const v = deps['$pkg'] || '';
    process.stdout.write(v.replace(/^[\\^~>=<]+/, ''));
  " 2>/dev/null || echo "")
  echo "$ver"
}

# Next.js version
nextjs_version=$(pkg_version "next")

# React version
react_version=$(pkg_version "react")

# TypeScript version
ts_version=$(pkg_version "typescript")

# Detect package manager (lock file precedence: bun > pnpm > yarn > npm)
pkg_manager="npm"
if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  pkg_manager="bun"
elif [ -f "pnpm-lock.yaml" ]; then
  pkg_manager="pnpm"
elif [ -f "yarn.lock" ]; then
  pkg_manager="yarn"
fi

# Detect router type
has_app_router="false"
has_pages_router="false"
app_dir=""
pages_dir=""

# App Router: look for app/ directory with page.tsx/page.js
if [ -d "app" ] && find app -maxdepth 3 \( -name "page.tsx" -o -name "page.js" -o -name "layout.tsx" -o -name "layout.js" \) 2>/dev/null | grep -q .; then
  has_app_router="true"
  app_dir="app"
elif [ -d "src/app" ] && find src/app -maxdepth 3 \( -name "page.tsx" -o -name "page.js" -o -name "layout.tsx" -o -name "layout.js" \) 2>/dev/null | grep -q .; then
  has_app_router="true"
  app_dir="src/app"
fi

# Pages Router: look for pages/ directory with _app.tsx/_app.js or index files
if [ -d "pages" ] && find pages -maxdepth 2 \( -name "_app.tsx" -o -name "_app.js" -o -name "index.tsx" -o -name "index.js" \) 2>/dev/null | grep -q .; then
  has_pages_router="true"
  pages_dir="pages"
elif [ -d "src/pages" ] && find src/pages -maxdepth 2 \( -name "_app.tsx" -o -name "_app.js" -o -name "index.tsx" -o -name "index.js" \) 2>/dev/null | grep -q .; then
  has_pages_router="true"
  pages_dir="src/pages"
fi

# Detect linter
linter="none"
if [ -f "biome.json" ] || [ -f "biome.jsonc" ]; then
  linter="biome"
elif [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.cjs" ] || [ -f ".eslintrc.yml" ] || [ -f ".eslintrc.yaml" ] || [ -f ".eslintrc" ]; then
  linter="eslint"
else
  # Check package.json for eslint/biome in deps
  has_biome=$(pkg_version "@biomejs/biome")
  has_eslint=$(pkg_version "eslint")
  if [ -n "$has_biome" ]; then
    linter="biome"
  elif [ -n "$has_eslint" ]; then
    linter="eslint"
  fi
fi

# Detect formatter
formatter="none"
if [ "$linter" = "biome" ]; then
  formatter="biome"
elif [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ] || [ -f ".prettierrc.js" ] || [ -f ".prettierrc.cjs" ] || [ -f "prettier.config.js" ] || [ -f "prettier.config.cjs" ]; then
  formatter="prettier"
fi

# Detect CSS framework
css_framework="none"
tailwind_version=""
if [ -f "tailwind.config.js" ] || [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.cjs" ]; then
  css_framework="tailwind"
  tailwind_version=$(pkg_version "tailwindcss")
elif grep -q '"tailwindcss"' package.json 2>/dev/null; then
  css_framework="tailwind"
  tailwind_version=$(pkg_version "tailwindcss")
fi

# Detect next.config file
next_config_file=""
for f in next.config.ts next.config.mjs next.config.js next.config.cjs; do
  if [ -f "$f" ]; then
    next_config_file="$f"
    break
  fi
done

# Detect if using Turbopack in scripts (--turbopack flag still in package.json)
has_turbopack_flag="false"
if [ -f "package.json" ] && grep -q "\-\-turbopack" package.json 2>/dev/null; then
  has_turbopack_flag="true"
fi

# Detect React Compiler
has_react_compiler="false"
rc_version=$(pkg_version "babel-plugin-react-compiler")
if [ -n "$rc_version" ]; then
  has_react_compiler="true"
fi

# Detect middleware vs proxy
has_middleware="false"
has_proxy="false"
middleware_path=""
proxy_path=""
for f in middleware.ts middleware.js src/middleware.ts src/middleware.js; do
  if [ -f "$f" ]; then
    has_middleware="true"
    middleware_path="$f"
    break
  fi
done
for f in proxy.ts proxy.js src/proxy.ts src/proxy.js; do
  if [ -f "$f" ]; then
    has_proxy="true"
    proxy_path="$f"
    break
  fi
done

# Detect src/ layout
uses_src_dir="false"
if [ -d "src" ]; then
  uses_src_dir="true"
fi

# Detect TypeScript
has_typescript="false"
if [ -f "tsconfig.json" ] || [ -n "$ts_version" ]; then
  has_typescript="true"
fi

# Node.js version from .nvmrc or .node-version or engines field
node_required=""
if [ -f ".nvmrc" ]; then
  node_required=$(cat .nvmrc | tr -d '[:space:]')
elif [ -f ".node-version" ]; then
  node_required=$(cat .node-version | tr -d '[:space:]')
else
  node_required=$(node -e "
    try {
      const p = require('./package.json');
      const eng = (p.engines && p.engines.node) || '';
      process.stdout.write(eng);
    } catch(e) { process.stdout.write(''); }
  " 2>/dev/null || echo "")
fi

# Current Node.js version
current_node=$(node --version 2>/dev/null | tr -d 'v' || echo "")

# Build script detection
build_script=""
dev_script=""
lint_script=""
node -e "
  const p = require('./package.json');
  const s = p.scripts || {};
  process.stdout.write(JSON.stringify({
    build: s.build || '',
    dev: s.dev || '',
    lint: s.lint || ''
  }));
" 2>/dev/null > /tmp/nextjs_scripts.json || echo '{}' > /tmp/nextjs_scripts.json
build_script=$(node -e "process.stdout.write(require('/tmp/nextjs_scripts.json').build || '')" 2>/dev/null || echo "")
dev_script=$(node -e "process.stdout.write(require('/tmp/nextjs_scripts.json').dev || '')" 2>/dev/null || echo "")
lint_script=$(node -e "process.stdout.write(require('/tmp/nextjs_scripts.json').lint || '')" 2>/dev/null || echo "")
rm -f /tmp/nextjs_scripts.json

# Escape strings for JSON safety
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

cat <<EOF
{
  "nextjs_version": "$(esc "$nextjs_version")",
  "react_version": "$(esc "$react_version")",
  "typescript_version": "$(esc "$ts_version")",
  "has_typescript": $has_typescript,
  "package_manager": "$(esc "$pkg_manager")",
  "node_required": "$(esc "$node_required")",
  "node_current": "$(esc "$current_node")",
  "router": {
    "app_router": $has_app_router,
    "pages_router": $has_pages_router,
    "app_dir": "$(esc "$app_dir")",
    "pages_dir": "$(esc "$pages_dir")"
  },
  "linter": "$(esc "$linter")",
  "formatter": "$(esc "$formatter")",
  "css_framework": "$(esc "$css_framework")",
  "tailwind_version": "$(esc "$tailwind_version")",
  "next_config_file": "$(esc "$next_config_file")",
  "uses_src_dir": $uses_src_dir,
  "turbopack": {
    "flag_in_scripts": $has_turbopack_flag
  },
  "react_compiler": {
    "installed": $has_react_compiler,
    "version": "$(esc "$rc_version")"
  },
  "middleware": {
    "has_middleware_file": $has_middleware,
    "middleware_path": "$(esc "$middleware_path")",
    "has_proxy_file": $has_proxy,
    "proxy_path": "$(esc "$proxy_path")"
  },
  "scripts": {
    "build": "$(esc "$build_script")",
    "dev": "$(esc "$dev_script")",
    "lint": "$(esc "$lint_script")"
  }
}
EOF
