# npm-publish

A skill for publishing npm packages from Claude Code with automatic browser-based authentication. Three steps: preflight script, write changelog, release script.

## How It Works

The skill minimizes agent thinking by delegating everything mechanical to bash scripts. The agent's only job is writing the changelog entry.

```
preflight.sh → Agent writes CHANGELOG → release.sh
   (script)        (agent)                  (script)
```

### preflight.sh

Checks the npm registry, bumps the version if needed, runs the build, and outputs the commit log.

```bash
bash scripts/preflight.sh          # default: patch bump
bash scripts/preflight.sh minor    # minor bump
bash scripts/preflight.sh major    # major bump
```

What it does:
- `npm view <pkg> version` — checks what's published
- Compares with local `package.json` version
- Auto-bumps patch (or minor/major) if already published
- Updates `.claude-plugin/plugin.json` if present
- Runs `bun run build`
- Outputs commit log since last tag

### release.sh

Commits, pushes, and publishes.

```bash
bash scripts/release.sh                  # standard publish
bash scripts/release.sh --access public  # scoped @org/pkg
bash scripts/release.sh --dry-run        # test without publishing
```

What it does:
- `git add` changed files + `git commit -m "Release vX.X.X"`
- `git push origin <branch>`
- `echo "" | bun publish` — pipes ENTER so the browser auth prompt opens automatically

### verify.sh

Confirms registry propagation with exponential backoff. Meant to be run as a background task.

```bash
bash scripts/verify.sh <package-name> <expected-version> [max-attempts]
```

Backoff schedule: 5s → 10s → 20s → 40s → 60s (~2.25 min total). Exits 0 when the version appears on npm. The agent runs this in the background and gets notified when it completes — no polling needed.

### publish.sh

Standalone publish script (used by release.sh). Just runs `echo "" | bun publish`.

## Authentication

`bun publish` defaults to `--auth-type=web`. When OTP is required, it prints an auth URL and waits for ENTER. The script pipes ENTER automatically, bun opens the browser, and the user completes auth there.

- **Valid token + no OTP needed:** publishes immediately
- **Valid token + OTP needed:** browser opens, user authenticates, publish completes
- **No token at all:** fails with "missing authentication" — run `bunx npm login --auth-type=web` once

The npm auth page has a "don't challenge for 5 minutes" checkbox. Subsequent publishes from the same IP skip the browser prompt.

## Benchmarks

Measured on bsv-mcp (6.4MB bundle, 1124 modules):

| Step | Time | Notes |
|------|------|-------|
| **Full preflight** | **911ms** | Everything below combined |
| `npm view` | 422ms | Network call — main bottleneck |
| `bun run build` | 243ms | Bundle 1124 modules |
| Version bump (sed) | ~4ms | package.json + plugin.json |
| `git log` | ~18ms | Last 10-20 commits |
| **Release (no auth)** | **~1.5s** | commit + push + publish + verify |
| **Release (with auth)** | **~15-30s** | Depends on user's browser speed |

### Optimization Notes

- `npm view` and `bun run build` now run in parallel during preflight, cutting ~250ms off the critical path.
- If a version bump is needed, a second build runs after the bump (sequential, can't be avoided).
- Build time scales with module count. For smaller packages, expect <100ms.
- The 5-minute OTP window means batch monorepo publishes only hit auth once.

## Visual Diagram

The flow diagram is in `docs/architecture/npm-publish-flow.tldr` (tldraw format). It shows:

- **Green frames**: Script-handled steps (preflight + release)
- **Blue box**: The one agent step (changelog)
- **Benchmark annotations**: Timing data on each step

Open it with the visual-planner playground:

```bash
SKILL_DIR="path/to/visual-planner"
bun run "$SKILL_DIR/scripts/playground_server.ts" --file docs/architecture/npm-publish-flow.tldr
```

## Files

```
npm-publish/
├── SKILL.md              # Agent instructions (what the model reads)
├── README.md             # This file (human docs, benchmarks)
└── scripts/
    ├── preflight.sh      # Check + bump + build + commit log
    ├── release.sh        # Commit + push + publish
    ├── publish.sh        # Standalone: echo | bun publish
    └── verify.sh         # Background: exponential backoff registry check
```
