---
name: npm-publish
version: 2.0.1
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, git push, and npm publishing with automatic browser-based authentication. Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
disable-model-invocation: true
---

# npm-publish

## MANDATORY — Read Before Doing Anything

**NEVER ask the user for an OTP code.** Authentication is handled automatically by the scripts below — `bun publish` opens a browser window where the user completes auth. After one browser auth, npm grants a 5-minute window where subsequent publishes skip auth entirely.

**NEVER run manual npm/bun commands** like `npm whoami`, `npm view`, `bun publish`, or `npm publish`. The scripts handle everything. If you already gathered version info before loading this skill, skip to whichever step is appropriate — but always use the scripts.

**You MUST run these scripts. This is not guidance — it is the procedure.**

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

**If the version is already bumped and build is clean** (e.g. you or the user already handled this), skip to Step 2 or Step 3.

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
- `bun publish` with automatic browser auth (pipes ENTER so the browser opens without blocking)

**If a browser window opens**, tell the user: "Complete the authentication in your browser — the publish will finish automatically." Do NOT interrupt, retry, or ask for codes.

For scoped packages (@org/package), pass `--access public`:

```bash
bash ${SKILL_DIR}/scripts/release.sh --access public
```

**If git is already clean and pushed** (e.g. version was bumped in a merged PR), use the standalone publish script instead:

```bash
bash ${SKILL_DIR}/scripts/publish.sh
```

Or for scoped packages:

```bash
bash ${SKILL_DIR}/scripts/publish.sh --access public
```

## Step 4: Verify (background)

After the publish script completes, run verification as a **background Bash task**:

```bash
bash ${SKILL_DIR}/scripts/verify.sh <package-name> <version>
```

Run this with `run_in_background: true`. It uses exponential backoff (5s, 10s, 20s, 40s, 60s) and exits 0 when the version appears on the npm registry. You'll be notified when it completes — do not poll or sleep.

## Troubleshooting

- **"missing authentication" error** — No token in `~/.npmrc`. Run `bunx npm login --auth-type=web` once to establish a token, then retry the release script.
- **Browser doesn't open** — The script pipes ENTER to `bun publish` to auto-open the browser. If it still blocks, the user can manually open the URL shown in the terminal output.
- **"You must sign in" after recent auth** — The 5-minute OTP window expired. The browser will open again automatically.
