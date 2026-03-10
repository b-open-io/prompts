---
name: npm-publish
version: 2.0.0
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, git push, and npm publishing with automatic browser-based authentication. Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
disable-model-invocation: true
---

# npm-publish

Four steps: preflight script, write changelog, release script, background verify.

## Step 1: Preflight

```bash
bash ${SKILL_DIR}/scripts/preflight.sh
```

This script handles: check npm version vs local, bump version if already published, update `package.json` + `plugin.json`, run `bun run build`, and output the commit log.

Pass `minor` or `major` as an argument to override the default patch bump:

```bash
bash ${SKILL_DIR}/scripts/preflight.sh minor
```

## Step 2: Write Changelog

Read the commit log from preflight output. If `CHANGELOG.md` exists, add an entry following the existing format:

```markdown
## [X.X.X] - YYYY-MM-DD

### Added / Changed / Fixed
- Summarize commits
```

This is the only step that requires the agent. Everything else is scripted.

## Step 3: Release

```bash
bash ${SKILL_DIR}/scripts/release.sh
```

This script handles: `git add` + `git commit` + `git push` + `bun publish`, all in one call. It also kicks off background verification with exponential backoff.

If a browser window opens for npm authentication, tell the user to complete it there — the publish finishes automatically.

For scoped packages (@org/package):

```bash
bash ${SKILL_DIR}/scripts/release.sh --access public
```

## Step 4: Verify (background)

After release.sh completes, run the verify script as a **background Bash task** so you get notified when the registry propagates:

```bash
bash ${SKILL_DIR}/scripts/verify.sh <package-name> <version>
```

Run this with `run_in_background: true`. The script uses exponential backoff (5s, 10s, 20s, 40s, 60s) and exits 0 when the version appears on npm. You'll be notified automatically when it completes — do not poll or sleep. Continue with other work in the meantime.

## Notes

- **Always push before publish.** The release script enforces this order.
- **Version bump is automatic.** If local version matches npm, preflight bumps the patch.
- **Auth is handled inline.** `bun publish` opens a browser for OTP when needed. No separate `npm login` required.
- **5-minute OTP window.** After authenticating once, npm skips the OTP prompt for subsequent publishes from the same IP.
- **"missing authentication" error** means no token in `~/.npmrc`. Run `bunx npm login --auth-type=web` once to establish a token.
