# hook-manager

Discover and install automation hooks from the bopen-tools collection for Claude Code and Opencode.

## Available Hooks

| Hook | Event | Description | Recommendation |
|------|-------|-------------|----------------|
| `protect-env-files` | PreToolUse | Blocks edits to .env files (security) | Recommended |
| `uncommitted-reminder` | Stop | Shows uncommitted changes when agent stops | Optional |
| `auto-git-add` | PostToolUse | Auto-stages files after edits | Optional |
| `time-dir-context` | UserPromptSubmit | Adds timestamp/dir/branch to prompts | Optional |
| `lint-on-save` | PostToolUse | Runs lint:fix after file edits | Optional |
| `lint-on-start` | SessionStart | Runs linting on session start | Optional |
| `auto-test-on-save` | PostToolUse | Runs tests after file edits | Optional |
| `protect-shadcn-components` | PreToolUse | Protects shadcn UI components | Optional |

## Installing a Hook

Hooks are JSON config files copied to your agent's hooks directory.

### Claude Code

```bash
mkdir -p ~/.claude/hooks

cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/<hook-name>.json ~/.claude/hooks/
```

Then restart Claude Code.

### Opencode

```bash
mkdir -p ~/.opencode/hooks

cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/<hook-name>.json ~/.opencode/hooks/
```

Then restart Opencode.

## Quick Install — Claude Code

```bash
# Security (recommended for all projects)
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/protect-env-files.json ~/.claude/hooks/

# Workflow helpers
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/uncommitted-reminder.json ~/.claude/hooks/
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/auto-git-add.json ~/.claude/hooks/

# Context enrichment
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/time-dir-context.json ~/.claude/hooks/

# Development automation
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/lint-on-save.json ~/.claude/hooks/
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/lint-on-start.json ~/.claude/hooks/
```

## Quick Install — Opencode

```bash
# Security (recommended for all projects)
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/protect-env-files.json ~/.opencode/hooks/

# Workflow helpers
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/uncommitted-reminder.json ~/.opencode/hooks/
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/auto-git-add.json ~/.opencode/hooks/

# Context enrichment
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/time-dir-context.json ~/.opencode/hooks/

# Development automation
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/lint-on-save.json ~/.opencode/hooks/
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/lint-on-start.json ~/.opencode/hooks/
```

## Uninstalling a Hook

**Claude Code:**
```bash
rm ~/.claude/hooks/<hook-name>.json
```

**Opencode:**
```bash
rm ~/.opencode/hooks/<hook-name>.json
```

Restart your agent after removing hooks.

## Listing Installed Hooks

**Claude Code:**
```bash
ls ~/.claude/hooks/
```

**Opencode:**
```bash
ls ~/.opencode/hooks/
```

## Verifying Installation

After installing and restarting:

```bash
claude --debug
```

Look for hook registration messages in the debug output.

## Hook Details

### protect-env-files (Recommended)

Security hook — prevents accidental edits to environment files containing secrets.

- Blocks: `.env`, `.env.local`, `.env.production`, `.env.staging`
- Prompts for confirmation if an edit is attempted
- No performance impact

### uncommitted-reminder

Shows git status when the agent finishes responding if there are uncommitted changes.

- Helps prevent forgotten commits
- Exit code 2 feeds back to the agent

### auto-git-add

Automatically runs `git add -A` after Write/Edit/MultiEdit operations.

- Only stages changes, never commits
- 5 second timeout

### time-dir-context

Adds a context line to every prompt: timestamp, working directory, git branch.

- Example: `Context: 2025-01-24 14:32:15 | /Users/you/project | Branch: main`

### lint-on-save

Runs `bun lint:fix` after file edits.

- Requires a `lint:fix` script in package.json
- Requires `bun` and `jq`

### lint-on-start

Runs linting when a session starts.

- Same requirements as lint-on-save

### auto-test-on-save

Runs tests after file edits.

- Can be slow on large test suites
- Consider project-specific setup before enabling

### protect-shadcn-components

Prevents edits to shadcn/ui component files.

- Only relevant for projects using shadcn/ui
