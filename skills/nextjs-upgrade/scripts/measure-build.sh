#!/usr/bin/env bash
# Baseline build metrics for a Next.js project.
# Runs the build command, captures timing, bundle sizes, warnings, and errors.
# Usage: bash measure-build.sh [path]
# Outputs JSON: {"success": bool, "duration_ms": N, "warnings": [...], "errors": [...], "bundle_sizes": {...}}
set -euo pipefail

DIR="${1:-.}"
cd "$DIR"

if [ ! -f "package.json" ]; then
  echo '{"error": "No package.json found in the specified directory"}'
  exit 1
fi

# Detect build command
build_cmd=""
build_cmd=$(node -e "
  const p = require('./package.json');
  process.stdout.write((p.scripts && p.scripts.build) || '');
" 2>/dev/null || echo "")

if [ -z "$build_cmd" ]; then
  echo '{"error": "No build script found in package.json"}'
  exit 1
fi

# Detect package manager for run command
pkg_manager="npm"
if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  pkg_manager="bun"
elif [ -f "pnpm-lock.yaml" ]; then
  pkg_manager="pnpm"
elif [ -f "yarn.lock" ]; then
  pkg_manager="yarn"
fi

case "$pkg_manager" in
  bun)  run_cmd="bun run build" ;;
  pnpm) run_cmd="pnpm run build" ;;
  yarn) run_cmd="yarn build" ;;
  *)    run_cmd="npm run build" ;;
esac

# Temp file for build output
build_log=$(mktemp /tmp/nextjs-build-XXXXXX.log)
trap 'rm -f "$build_log"' EXIT

# Record start time in milliseconds
start_ms=$(node -e "process.stdout.write(String(Date.now()))" 2>/dev/null || date +%s%3N)

# Run build, capture output and exit code
set +e
$run_cmd > "$build_log" 2>&1
build_exit=$?
set -e

end_ms=$(node -e "process.stdout.write(String(Date.now()))" 2>/dev/null || date +%s%3N)
duration_ms=$((end_ms - start_ms))

success="false"
[ "$build_exit" -eq 0 ] && success="true"

# Extract warnings (lines containing "warn" case-insensitive, filter noise)
# Also catch Next.js specific ⚠ warnings
warnings=$(grep -i "warn\|⚠" "$build_log" 2>/dev/null \
  | grep -v "^$\|node_modules\|DeprecationWarning\|ExperimentalWarning" \
  | head -20 \
  | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/  /g' \
  || true)

# Extract errors (lines containing "error" case-insensitive, filter noise)
errors=$(grep -i "error\|✗\|failed\|× " "$build_log" 2>/dev/null \
  | grep -v "^$\|node_modules\|// " \
  | head -20 \
  | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/  /g' \
  || true)

# Extract bundle size info from .next/BUILD_ID and build output
# Next.js prints route sizes in a table during build
route_sizes=$(grep -E "^\s*(○|●|ƒ|λ|\+|├|└|│)\s" "$build_log" 2>/dev/null \
  | head -40 \
  | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/  /g' \
  || true)

# Get .next directory size if build succeeded
next_dir_size=""
if [ "$success" = "true" ] && [ -d ".next" ]; then
  next_dir_size=$(du -sh .next 2>/dev/null | cut -f1 || echo "")
fi

# Get first shared JS chunk info from build output (total First Load JS)
first_load_js=$(grep -i "First Load JS\|first load js" "$build_log" 2>/dev/null \
  | tail -1 \
  | sed 's/\\/\\\\/g; s/"/\\"/g' \
  || true)

# Build the JSON output using node to handle escaping properly
node -e "
const fs = require('fs');
const buildLog = fs.readFileSync('$build_log', 'utf8');

// Parse warnings
const warnLines = buildLog.split('\n')
  .filter(l => /warn|⚠/i.test(l) && !/node_modules|DeprecationWarning|ExperimentalWarning/.test(l) && l.trim())
  .slice(0, 20)
  .map(l => l.trim());

// Parse errors
const errLines = buildLog.split('\n')
  .filter(l => /error|✗|failed|× /i.test(l) && !/node_modules|\/\/ /.test(l) && l.trim())
  .slice(0, 20)
  .map(l => l.trim());

// Parse route table lines
const routeLines = buildLog.split('\n')
  .filter(l => /^\s*(○|●|ƒ|λ|\+|├|└|│|Route|Size|First Load)/.test(l) && l.trim())
  .slice(0, 50)
  .map(l => l.trim());

// Find First Load JS summary
const firstLoadMatch = buildLog.match(/First Load JS.*?\n.*?kB.*?\n/s) ||
  buildLog.match(/shared by all.*?(\d+(?:\.\d+)?\s*[kKmM]?B)/);
const firstLoadJs = firstLoadMatch ? firstLoadMatch[0].trim().split('\n')[0].trim() : '';

// Find total output size from build log
const totalSize = '$next_dir_size';

// Find any TypeScript errors
const tsErrors = buildLog.split('\n')
  .filter(l => /Type error:|TypeScript/.test(l) && l.trim())
  .slice(0, 5)
  .map(l => l.trim());

const output = {
  success: $success === 'true' ? true : false,
  duration_ms: $duration_ms,
  package_manager: '$pkg_manager',
  build_command: $(echo "$run_cmd" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d.trim())))"),
  warnings: warnLines,
  errors: errLines,
  typescript_errors: tsErrors,
  bundle_sizes: {
    next_dir_size: totalSize || null,
    first_load_js_summary: firstLoadJs || null,
    route_table: routeLines
  }
};

process.stdout.write(JSON.stringify(output, null, 2));
" 2>/dev/null
