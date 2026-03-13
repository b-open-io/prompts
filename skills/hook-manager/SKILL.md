---
name: hook-manager
version: 1.0.1
description: Discover and install automation hooks for Claude Code and Opencode. This skill should be used when users ask to "list hooks", "install a hook", "show available hooks", "enable hook", "what hooks are available", or need help managing agent automation hooks.
disable-model-invocation: true
---

# Hook Manager

Help users discover, install, and diagnose automation hooks from the bopen-tools collection.

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

## Hook Source Paths

Hooks live in the plugin cache. The exact version path segment varies; use a glob to locate them:

```bash
# Claude Code
ls ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/

# Opencode
ls ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/
```

## Installing a Hook for the User

To install a hook, copy its JSON file to the correct hooks directory and inform the user to restart their agent.

**Claude Code:**
```bash
mkdir -p ~/.claude/hooks
cp ~/.claude/plugins/cache/bopen-tools/user/.claude/hooks/<hook-name>.json ~/.claude/hooks/
```

**Opencode:**
```bash
mkdir -p ~/.opencode/hooks
cp ~/.opencode/plugins/cache/bopen-tools/user/.claude/hooks/<hook-name>.json ~/.opencode/hooks/
```

After copying, tell the user: restart Claude Code (or Opencode) for the hook to take effect.

## Checking Which Hooks Are Installed

```bash
# Claude Code
ls ~/.claude/hooks/

# Opencode
ls ~/.opencode/hooks/
```

## Recommending Hooks

When a user asks what hooks to install without specifying a use case:

1. Always recommend `protect-env-files` first — it is a security safeguard with no downsides.
2. Ask about their workflow to recommend optional hooks:
   - Git-heavy work: `auto-git-add`, `uncommitted-reminder`
   - Linting setup with `bun lint:fix`: `lint-on-save`, `lint-on-start`
   - shadcn/ui projects: `protect-shadcn-components`
   - Wants richer context in every prompt: `time-dir-context`

## Hook Details for Diagnosis

### protect-env-files
Blocks Write/Edit on `.env*` files. No performance cost. Recommended universally.

### uncommitted-reminder
Runs on Stop event; exits with code 2 if uncommitted changes exist, feeding the message back to the agent.

### auto-git-add
Runs `git add -A` after Write/Edit/MultiEdit. Stages only; never commits. 5s timeout.

### time-dir-context
Injects `Context: <timestamp> | <cwd> | Branch: <branch>` into every UserPromptSubmit.

### lint-on-save / lint-on-start
Runs `bun lint:fix`. Requires `lint:fix` in package.json and `bun` + `jq` on PATH.

### auto-test-on-save
Runs tests after file edits. Can be slow on large suites — confirm user wants this before installing.

### protect-shadcn-components
Blocks edits to shadcn/ui component files. Only relevant when project uses shadcn/ui.

## Additional Resources

See the hook catalog above for all available hooks and their configurations.
