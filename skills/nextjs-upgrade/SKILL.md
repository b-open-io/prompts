---
name: nextjs-upgrade
description: "Upgrade a Next.js project to the latest version (v16) with Turbopack, async Dynamic APIs, Biome, and React 19.2. This skill should be used when the user says 'upgrade Next.js', 'migrate to Next.js 16', 'update my Next.js app', 'run the Next.js codemod', 'my Next.js version is outdated', or when a migration plan is needed before making Next.js changes. Also invoke when the agent needs baseline build metrics for before/after comparison, or when checking whether a project needs async API migration, middleware-to-proxy migration, or Biome adoption."
version: 1.0.0
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Next.js Upgrade

Upgrade Next.js projects to v16 without burning context on detection logic and build mechanics. Everything deterministic is handled by scripts. Your job is to run them, interpret the JSON, and make the code changes.

## Why Scripts Handle Detection and Measurement

Scanning package.json, checking lock files, parsing build output — that's pure mechanics, not reasoning. These scripts handle it so you don't have to reconstruct the project state from scratch every time.

## Quick Start

Three scripts. Run them in order.

### Step 1: Detect project state

```bash
bash <skill-path>/scripts/detect-nextjs.sh /path/to/project
```

Returns JSON:
```json
{
  "nextjs_version": "15.1.0",
  "react_version": "18.3.1",
  "typescript_version": "5.7.2",
  "has_typescript": true,
  "package_manager": "bun",
  "node_required": "",
  "node_current": "20.11.0",
  "router": {
    "app_router": true,
    "pages_router": false,
    "app_dir": "app",
    "pages_dir": ""
  },
  "linter": "eslint",
  "formatter": "prettier",
  "css_framework": "tailwind",
  "tailwind_version": "3.4.0",
  "next_config_file": "next.config.ts",
  "uses_src_dir": false,
  "turbopack": { "flag_in_scripts": true },
  "react_compiler": { "installed": false, "version": "" },
  "middleware": {
    "has_middleware_file": true,
    "middleware_path": "middleware.ts",
    "has_proxy_file": false,
    "proxy_path": ""
  },
  "scripts": {
    "build": "next build",
    "dev": "next dev --turbopack",
    "lint": "next lint"
  }
}
```

### Step 2: Check upgrade path

Pipe detect output or run standalone:

```bash
bash <skill-path>/scripts/detect-nextjs.sh /path/to/project \
  | bash <skill-path>/scripts/check-upgrade-path.sh
```

Returns an ordered upgrade plan:
```json
{
  "from_version": "15.1.0",
  "target_version": "16",
  "package_manager": "bun",
  "complexity": "medium",
  "steps": [
    {
      "priority": 2,
      "action": "bun add next@latest react@latest react-dom@latest && bun add -D @types/react@latest @types/react-dom@latest",
      "reason": "Upgrade Next.js to v16, React to 19.2, and matching type definitions"
    },
    {
      "priority": 3,
      "action": "bunx @next/codemod@canary upgrade latest",
      "reason": "Primary upgrade codemod: updates turbopack config, migrates middleware→proxy, removes unstable_ prefixes"
    }
  ],
  "codemods": [...],
  "breaking_changes": ["--turbopack flag no longer needed", "middleware.ts must be renamed to proxy.ts"],
  "notes": ["React Compiler provides automatic memoization — recommended"]
}
```

Execute `steps` in priority order. Each step has the exact command or action to perform.

### Step 3 (optional): Measure build performance

Run before and after upgrading to quantify improvement:

```bash
bash <skill-path>/scripts/measure-build.sh /path/to/project
```

Returns:
```json
{
  "success": true,
  "duration_ms": 18432,
  "package_manager": "bun",
  "build_command": "bun run build",
  "warnings": [],
  "errors": [],
  "typescript_errors": [],
  "bundle_sizes": {
    "next_dir_size": "24M",
    "first_load_js_summary": "First Load JS shared by all: 102 kB",
    "route_table": ["○ /", "○ /about", "ƒ /api/posts"]
  }
}
```

Run this before making changes to capture a baseline, then run again after to report the improvement.

## Interpreting Results

### detect-nextjs.sh

| Field | What to do |
|---|---|
| `linter: "eslint"` | Plan Biome migration — `next lint` is removed in v16 |
| `turbopack.flag_in_scripts: true` | Remove `--turbopack` from package.json scripts |
| `middleware.has_middleware_file: true` | Rename to proxy.ts, update function export |
| `router.app_router: true` | Async Dynamic API codemod applies |
| `node_current` < 20.9 | Node.js upgrade required before anything else |

### check-upgrade-path.sh

| `complexity` | Meaning |
|---|---|
| `low` | No breaking changes, minor version bump |
| `medium` | 1-2 breaking changes, run primary codemod |
| `high` | 3+ breaking changes or jumping multiple major versions |

Execute the `steps` array in order — priority 1 steps must complete before priority 2, etc.

### measure-build.sh

| Field | Meaning |
|---|---|
| `success: false` | Build failed — check `errors` and `typescript_errors` |
| `warnings` | Non-fatal issues to address |
| `bundle_sizes.first_load_js_summary` | Key metric for before/after comparison |
| `bundle_sizes.route_table` | Per-route sizes for identifying large pages |

## Typical Upgrade Workflow

### Full upgrade from Next.js 15 to 16

1. Run `detect-nextjs.sh` — understand current state
2. Run `measure-build.sh` — capture baseline build time and bundle sizes
3. Run `check-upgrade-path.sh` — get the ordered step list
4. Execute each step from the plan (install deps, run codemods, update config)
5. Make manual changes (update next.config, update scripts in package.json)
6. Run `measure-build.sh` again — report the improvement to the user

### Check before touching anything

When asked to update a Next.js project, always run detect first. Never assume the router type, package manager, or linter — the project state determines the migration path.

### Before/after performance reporting

```bash
# Before
bash <skill-path>/scripts/measure-build.sh . > /tmp/build-before.json

# ... make changes ...

# After
bash <skill-path>/scripts/measure-build.sh . > /tmp/build-after.json

# Report delta
node -e "
  const before = require('/tmp/build-before.json');
  const after = require('/tmp/build-after.json');
  const pct = Math.round((1 - after.duration_ms / before.duration_ms) * 100);
  console.log('Build time: ' + before.duration_ms + 'ms → ' + after.duration_ms + 'ms (' + pct + '% faster)');
"
```

## Key Migration Reference

### package.json scripts (before → after)
```json
{
  "dev": "next dev --turbopack",  → "next dev"
  "build": "next build",
  "lint": "next lint"             → "biome check ."
}
```

### next.config changes
- `experimental.turbopack` → top-level `turbopack`
- Add `reactCompiler: true` (stable in v16)
- Add `cacheComponents: true` (replaces `experimental.ppr`)
- `images.domains` → `images.remotePatterns`

### Async Dynamic APIs (App Router)
```typescript
// Before
const cookieStore = cookies()
const { slug } = params

// After
const cookieStore = await cookies()
const { slug } = await props.params
```

### Middleware to proxy
```typescript
// middleware.ts → proxy.ts
export function proxy(request: Request) {  // was: middleware
  return NextResponse.next()
}
```
