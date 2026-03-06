#!/usr/bin/env bash
# Determine what needs upgrading for a Next.js project.
# Reads detect-nextjs.sh output from stdin or runs detection automatically.
# Usage:
#   bash check-upgrade-path.sh [path]
#   bash detect-nextjs.sh [path] | bash check-upgrade-path.sh
# Outputs JSON upgrade plan with ordered steps and relevant codemods.
set -euo pipefail

DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run detection if not piped
if [ -t 0 ]; then
  detect_json=$(bash "$SCRIPT_DIR/detect-nextjs.sh" "$DIR")
else
  detect_json=$(cat)
fi

# Parse fields from detect JSON using node (already required by detect script)
get_field() {
  local field="$1"
  echo "$detect_json" | node -e "
    let d='';
    process.stdin.on('data', c => d+=c);
    process.stdin.on('end', () => {
      try {
        const o = JSON.parse(d);
        const parts = '$field'.split('.');
        let v = o;
        for (const p of parts) v = v && v[p];
        process.stdout.write(String(v ?? ''));
      } catch(e) { process.stdout.write(''); }
    });
  " 2>/dev/null || echo ""
}

nextjs_version=$(get_field "nextjs_version")
react_version=$(get_field "react_version")
ts_version=$(get_field "typescript_version")
pkg_manager=$(get_field "package_manager")
linter=$(get_field "linter")
formatter=$(get_field "formatter")
has_middleware=$(get_field "middleware.has_middleware_file")
has_proxy=$(get_field "middleware.has_proxy_file")
turbopack_flag=$(get_field "turbopack.flag_in_scripts")
rc_installed=$(get_field "react_compiler.installed")
app_router=$(get_field "router.app_router")
pages_router=$(get_field "router.pages_router")
node_current=$(get_field "node_current")
lint_script=$(get_field "scripts.lint")
dev_script=$(get_field "scripts.dev")

# Target versions (Next.js 16 migration targets)
TARGET_NEXTJS="16"
TARGET_REACT="19.2"
TARGET_NODE="20.9"
TARGET_TS="5.1"

# Version comparison: returns "true" if $1 < $2 (major.minor only)
version_lt() {
  local a="$1" b="$2"
  # Strip leading v and any pre-release suffix, keep major.minor.patch
  a=$(echo "$a" | sed 's/^v//; s/-.*$//')
  b=$(echo "$b" | sed 's/^v//; s/-.*$//')
  [ -z "$a" ] && echo "true" && return
  node -e "
    const [a, b] = ['$a', '$b'].map(v => v.split('.').map(Number));
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const x = a[i] || 0, y = b[i] || 0;
      if (x < y) { process.stdout.write('true'); process.exit(); }
      if (x > y) { process.stdout.write('false'); process.exit(); }
    }
    process.stdout.write('false');
  " 2>/dev/null || echo "false"
}

# Build the steps array and codemods list
steps='[]'
codemods='[]'
breaking_changes='[]'
notes='[]'

add_step() {
  local priority="$1" action="$2" reason="$3"
  steps=$(echo "$steps" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const a=JSON.parse(d);
      a.push({priority:$priority,action:$(echo "$action" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d.trim())))"),reason:$(echo "$reason" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d.trim())))")});
      process.stdout.write(JSON.stringify(a));
    });
  " 2>/dev/null || echo "$steps")
}

add_codemod() {
  local cmd="$1" desc="$2"
  codemods=$(echo "$codemods" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const a=JSON.parse(d);
      a.push({command:$(echo "$cmd" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d.trim())))"),description:$(echo "$desc" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d.trim())))")});
      process.stdout.write(JSON.stringify(a));
    });
  " 2>/dev/null || echo "$codemods")
}

# Use node to build JSON directly — avoids fragile string escaping in bash
upgrade_plan=$(node -e "
const detect = $(echo "$detect_json");
const steps = [];
const codemods = [];
const breaking_changes = [];
const notes = [];

const nextjsVer = detect.nextjs_version || '';
const reactVer = detect.react_version || '';
const tsVer = detect.typescript_version || '';
const nodeVer = detect.node_current || '';
const pkgMgr = detect.package_manager || 'npm';
const linter = detect.linter || 'none';
const formatter = detect.formatter || 'none';
const hasMiddleware = detect.middleware && detect.middleware.has_middleware_file === true;
const hasProxy = detect.middleware && detect.middleware.has_proxy_file === true;
const turbopackFlag = detect.turbopack && detect.turbopack.flag_in_scripts === true;
const rcInstalled = detect.react_compiler && detect.react_compiler.installed === true;
const appRouter = detect.router && detect.router.app_router === true;
const pagesRouter = detect.router && detect.router.pages_router === true;
const lintScript = (detect.scripts && detect.scripts.lint) || '';
const devScript = (detect.scripts && detect.scripts.dev) || '';

// Helper: semver major
const major = v => parseInt((v || '0').replace(/^v/, '').split('.')[0], 10) || 0;
const minor = v => parseInt((v || '0').replace(/^v/, '').split('.')[1] || '0', 10) || 0;
const nodeMajor = major(nodeVer);
const nodeMinor = minor(nodeVer);

// Node.js check
if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 9)) {
  steps.push({ priority: 1, action: 'Upgrade Node.js to 20.9+', reason: 'Next.js 16 requires Node.js 20.9 or higher. Current: ' + (nodeVer || 'unknown') });
  breaking_changes.push('Node.js 20.9+ required (currently ' + (nodeVer || 'unknown') + ')');
}

// Determine package manager install command
const install = pkgMgr === 'bun' ? 'bun add' : pkgMgr === 'pnpm' ? 'pnpm add' : pkgMgr === 'yarn' ? 'yarn add' : 'npm install';
const installDev = pkgMgr === 'bun' ? 'bun add -D' : pkgMgr === 'pnpm' ? 'pnpm add -D' : pkgMgr === 'yarn' ? 'yarn add -D' : 'npm install --save-dev';
const runCmd = pkgMgr === 'bun' ? 'bunx' : 'npx';

// Not using bun
if (pkgMgr !== 'bun') {
  notes.push('Consider migrating to bun for faster installs and builds');
}

// Next.js version check
const nextMajor = major(nextjsVer);
if (!nextjsVer) {
  breaking_changes.push('Could not detect Next.js version — verify package.json has next dependency');
} else if (nextMajor < 16) {
  steps.push({
    priority: 2,
    action: install + ' next@latest react@latest react-dom@latest && ' + installDev + ' @types/react@latest @types/react-dom@latest',
    reason: 'Upgrade Next.js to v16, React to 19.2, and matching type definitions'
  });

  // Primary codemod — covers most migrations
  steps.push({
    priority: 3,
    action: runCmd + ' @next/codemod@canary upgrade latest',
    reason: 'Primary upgrade codemod: updates turbopack config, migrates middleware→proxy, removes unstable_ prefixes, removes experimental_ppr'
  });
  codemods.push({
    command: runCmd + ' @next/codemod@canary upgrade latest',
    description: 'Primary upgrade codemod covering turbopack config, middleware→proxy, unstable_ prefixes, and experimental_ppr removal'
  });

  // Async Dynamic APIs codemod
  if (appRouter) {
    steps.push({
      priority: 4,
      action: runCmd + ' @next/codemod@canary next-async-request-api .',
      reason: 'Migrate cookies(), headers(), draftMode(), params, and searchParams to async (App Router detected)'
    });
    codemods.push({
      command: runCmd + ' @next/codemod@canary next-async-request-api .',
      description: 'Migrate all Dynamic APIs (cookies, headers, draftMode, params, searchParams) to async — may be included in upgrade latest'
    });
    breaking_changes.push('Async Dynamic APIs: cookies(), headers(), draftMode(), params, searchParams must all be awaited');
  }

  if (nextMajor >= 13) {
    steps.push({
      priority: 5,
      action: runCmd + ' next typegen',
      reason: 'Generate PageProps, LayoutProps, RouteContext type helpers after async API migration'
    });
  }
} else {
  notes.push('Next.js is already at v' + nextjsVer + ' — no core upgrade needed');
}

// React version check
if (reactVer && major(reactVer) < 19) {
  breaking_changes.push('React 19.2+ required for Next.js 16 (currently ' + reactVer + ')');
}

// TypeScript check
if (tsVer && major(tsVer) < 5) {
  steps.push({
    priority: 2,
    action: installDev + ' typescript@latest',
    reason: 'Next.js 16 requires TypeScript 5.1+ (currently ' + tsVer + ')'
  });
  breaking_changes.push('TypeScript 5.1+ required (currently ' + tsVer + ')');
}

// Linter migration
if (linter === 'eslint') {
  steps.push({
    priority: 6,
    action: installDev + ' @biomejs/biome && ' + runCmd + ' biome init',
    reason: 'Migrate from ESLint to Biome for 25-100x faster linting and formatting'
  });
  steps.push({
    priority: 7,
    action: 'Remove eslint prettier @next/eslint-plugin-next eslint-config-next and delete .eslintrc.* .prettierrc* files',
    reason: 'Clean up old linting tools after Biome setup'
  });
  notes.push('next lint is removed in Next.js 16 — lint script must be updated to biome check .');
  if (lintScript.includes('next lint')) {
    breaking_changes.push('next lint command removed — update lint script to: biome check .');
  }
} else if (linter === 'none') {
  steps.push({
    priority: 6,
    action: installDev + ' @biomejs/biome && ' + runCmd + ' biome init',
    reason: 'Add Biome for linting and formatting (no linter detected)'
  });
}

// Turbopack flag in scripts
if (turbopackFlag) {
  steps.push({
    priority: 8,
    action: 'Remove --turbopack flag from dev/build scripts in package.json (Turbopack is now default)',
    reason: 'The --turbopack flag is obsolete in Next.js 16 — Turbopack runs by default'
  });
  breaking_changes.push('--turbopack flag no longer needed and should be removed from scripts');
}

// Middleware to proxy
if (hasMiddleware && !hasProxy) {
  steps.push({
    priority: 9,
    action: 'Rename middleware.ts → proxy.ts and update function export from middleware() to proxy()',
    reason: 'Next.js 16 renamed middleware to proxy'
  });
  codemods.push({
    command: runCmd + ' @next/codemod@canary middleware-to-proxy',
    description: 'Rename middleware files and update function names (included in upgrade latest codemod)'
  });
  breaking_changes.push('middleware.ts must be renamed to proxy.ts with function renamed from middleware to proxy');
}

// React Compiler
if (!rcInstalled && nextMajor <= 16) {
  steps.push({
    priority: 10,
    action: installDev + ' babel-plugin-react-compiler',
    reason: 'Optionally enable React Compiler for automatic memoization (stable in Next.js 16)'
  });
  notes.push('React Compiler (reactCompiler: true in next.config) provides automatic memoization — recommended for new projects');
}

// Sort steps by priority
steps.sort((a, b) => a.priority - b.priority);

// Estimate complexity
let complexity = 'low';
if (breaking_changes.length >= 3 || (nextMajor < 15 && nextjsVer)) complexity = 'high';
else if (breaking_changes.length >= 1) complexity = 'medium';

const output = {
  from_version: nextjsVer || 'unknown',
  target_version: '16',
  package_manager: pkgMgr,
  complexity: complexity,
  steps: steps,
  codemods: codemods,
  breaking_changes: breaking_changes,
  notes: notes
};

process.stdout.write(JSON.stringify(output, null, 2));
" 2>/dev/null)

echo "$upgrade_plan"
