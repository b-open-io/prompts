---
name: npm-publish
version: 3.0.0
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, git push, npm publishing, and automatic token rotation via agent-browser when auth expires. Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
---

# npm-publish

## MANDATORY — Read Before Doing Anything

**NEVER ask the user for an OTP code.** Authentication is handled automatically by the scripts. When a token expires, `setup-token.sh` uses agent-browser to create a new granular access token via Chrome — the user just clicks "Generate token" once. No manual `.npmrc` editing, no `npm login`, no OTP codes.

**NEVER run manual npm/bun commands** like `npm whoami`, `npm view`, `bun publish`, or `npm publish`. The scripts handle everything. If version info was already gathered before loading this skill, skip to the appropriate step — but always use the scripts.

**You MUST run these scripts. This is not guidance — it is the procedure.**

## How Auth Works

The publish flow uses a **granular access token** stored in `~/.npmrc`. This token is created via npm's web UI using agent-browser automation:

- **Happy path**: Token is valid → `bun publish` succeeds with one OTP checkbox click
- **Expired token**: `publish.sh` detects 404/401 → calls `setup-token.sh` → agent-browser opens Chrome, fills the npm token form, user clicks Generate → token captured via clipboard → written to `~/.npmrc` → publish retries automatically
- **Security**: Token never appears in terminal output. Captured via clipboard (`pbpaste`), clipboard cleared immediately after. 7-day expiration keeps tokens short-lived. Old tokens are flagged for cleanup.

**Prerequisite**: `agent-browser` must be installed (`bun install -g agent-browser`) and the user must be logged into npmjs.com in Chrome.

## Step 1: Preflight

Run from the package directory:

```bash
bash ${SKILL_DIR}/scripts/preflight.sh
```

This script handles ALL of the following in one call:
- Checks npm registry version vs local `package.json` version
- Bumps the version if local matches npm (patch by default)
- Updates `plugin.json` if present
- Runs `bun run build`
- Outputs the commit log for changelog writing

Pass `minor` or `major` to override the default patch bump:

```bash
bash ${SKILL_DIR}/scripts/preflight.sh minor
```

**If the version is already bumped and build is clean** (e.g. already handled), skip to Step 2 or Step 3.

## Step 2: Write Changelog (only if CHANGELOG.md exists)

Read the commit log from preflight output. Add an entry following the existing format:

```markdown
## [X.X.X] - YYYY-MM-DD

### Added / Changed / Fixed
- Summarize commits
```

If no CHANGELOG.md exists, skip this step entirely.

## Step 3: Release

```bash
bash ${SKILL_DIR}/scripts/release.sh
```

This script handles ALL of the following in one call:
- `git add` changed files (package.json, CHANGELOG.md, plugin.json, dist/)
- `git commit -m "Release vX.X.X"`
- `git push origin <branch>`
- Calls `publish.sh` which handles auth automatically

For scoped packages (@org/package), pass `--access public`:

```bash
bash ${SKILL_DIR}/scripts/release.sh --access public
```

**If git is already clean and pushed** (e.g. version was bumped in a merged PR), use the standalone publish script instead:

```bash
bash ${SKILL_DIR}/scripts/publish.sh --access public
```

### What happens during publish

1. `publish.sh` runs `echo "" | bun publish` — the piped ENTER auto-opens the OTP checkbox page if the token is valid
2. If publish succeeds → done. Tell the user: "Complete the OTP in your browser if prompted."
3. If publish fails with 404/401 (expired token) → `setup-token.sh` runs automatically:
   - Opens Chrome to npmjs.com/settings → detects username
   - Navigates to granular token creation page
   - Fills form: "cli-publish", 7-day expiry, read+write, all packages
   - **Tells user**: "Review form in Chrome, click Generate token"
   - Waits for token to appear, captures via clipboard
   - Writes to `~/.npmrc`, clears clipboard
   - Retries publish — user gets OTP checkbox, clicks it, done

**The user's only interactions**: approve Chrome debugging (once per session), click "Generate token" (when token expires), click OTP checkbox (every publish).

## Step 4: Verify (background)

After the publish script completes, run verification as a **background Bash task**:

```bash
bash ${SKILL_DIR}/scripts/verify.sh <package-name> <version>
```

Run this with `run_in_background: true`. It uses exponential backoff (5s, 10s, 20s, 40s, 60s) and exits 0 when the version appears on the npm registry.

## Troubleshooting

- **"Not logged into npmjs.com in Chrome"** — Open Chrome, go to npmjs.com, sign in. The setup script needs the browser session to detect the username and create tokens.
- **"agent-browser not installed"** — Run `bun install -g agent-browser`.
- **Clipboard doesn't contain valid token** — npm may have changed their UI. Copy the token manually from Chrome and run: `echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' > ~/.npmrc`
- **Multiple cli-publish tokens accumulating** — Visit npmjs.com/settings/YOUR_USER/tokens and delete old ones. The script flags this but doesn't auto-delete for safety.
