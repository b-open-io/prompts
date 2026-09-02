---
name: npm-publish
version: 3.1.3
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, default-branch release delivery, browser-confirmed Bun publishing, and credential recovery only when publishing explicitly reports an authentication failure. Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
allowed-tools: Bash(agent-browser:*), Bash(npm:*), Bash(bun:*), Bash(git:*), Bash(pbpaste:*), Bash(pbcopy:*), Bash(chmod:*), Bash(bash:*), Bash(grep:*), Bash(sed:*), Bash(sleep:*)
---

# npm-publish

## MANDATORY — Read Before Doing Anything

**NEVER ask the user for an OTP, one-time code, password, or token.** The normal publish flow opens npm's browser confirmation; the user checks the confirmation box and clicks **Publish**.

**NEVER run `npm publish` or a manually typed `bun publish` command.** Use the bundled scripts. `preflight.sh` may run `npm view` internally for its registry check.

**You MUST run these scripts. Do NOT skip steps.**

## Step 0: Confirm the release branch

Determine the repository's default branch from `refs/remotes/origin/HEAD` (normally `master` or `main`). The release MUST happen from that branch. If currently on another branch, do not run preflight, release, or publish; switch to the default branch first.

Fetch and fast-forward the default branch before changing files:

```bash
git fetch origin
git switch <default-branch>
git pull --ff-only origin <default-branch>
```

`release.sh` repeats the branch check and refuses to commit or push from a non-default branch.

## Step 1: Preflight

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/preflight.sh
```

Handles deterministically: version check against npm registry, bump if needed (resets gaps), build, commit log output. Pass `minor` or `major` to override default patch bump.

## Step 2: Write Changelog

Read the commit log from preflight output. If CHANGELOG.md exists, add entry at top matching existing format. If not, create one. Use the version from preflight output. Categorize: Breaking Changes, Added, Changed, Fixed, Security, Deprecated.

## Step 3: Release (commit + push), then publish

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/release.sh --access public
bash ${CLAUDE_SKILL_DIR}/scripts/publish.sh --access public
```

`release.sh` commits and pushes from the verified default branch. `publish.sh` then runs the equivalent of `printf '\n' | bun publish --access public`, using Bun's web-auth flow. That newline accepts the CLI prompt and causes npm's normal confirmation page to open in the system default browser, including DIA. Tell the user to check the confirmation box and click **Publish** there. Do not request or enter any code. Do not open or navigate another browser unless `publish.sh` specifically outputs `AUTH_FAILED`.

The correct underlying publish command is `bun publish --access public`; the wrapper is mandatory because it supplies the browser-opening newline and emits classified status codes. Never substitute `npm publish`.

If publish.sh outputs `PUBLISH_SUCCESS` — done, go to Step 4.

### If publish.sh outputs `VERSION_ALREADY_PUBLISHED`

The local version already exists on npm. This is not an authentication failure. Do not run token setup. Run preflight again so it reconciles and bumps from the registry version, update the changelog for the new version, then repeat Step 3.

### If publish.sh outputs `AUTH_FAILED`

The agent must orchestrate token setup. **Do NOT call setup-token.sh as one long command.** Run it in two phases with user communication between them.

**Phase 1 — Fill the form:**

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/setup-token.sh fill
```

Status codes:
- `FORM_READY:<username>` — form is filled in Chrome, proceed to tell user
- `NOT_LOGGED_IN` — tell user: "Sign in to npmjs.com in Chrome, then I'll retry"
- `FORM_NOT_FOUND` — tell user: "Could not find the token form. The page may have changed."

After getting `FORM_READY`, **tell the user directly** (not inside a bash command):

> I've opened the npm token creation form in Chrome and filled it out (cli-publish, 7-day, read+write, all packages). Scroll down and click **Generate token** when ready.

**Phase 2 — Capture the token:**

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/setup-token.sh capture
```

This polls until the token appears on the page, clicks the Copy button, reads from clipboard, writes to `~/.npmrc`, and clears clipboard. The token never appears in terminal output.

Status codes:
- `TOKEN_SAVED` — success, retry publish
- `CAPTURE_TIMEOUT` — tell user: "Could not capture token. Copy it from Chrome and I'll write it to ~/.npmrc"

**After TOKEN_SAVED, retry publish:**

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/publish.sh --access public
```

Tell the user: "Approve the publish confirmation in the browser by checking the box and clicking Publish. No code is needed."

### If publish.sh outputs `PUBLISH_ERROR`

Read the preserved npm output and fix the reported package, permissions, validation, or registry error. Do not rotate credentials unless the output contains actual authentication evidence and the script reports `AUTH_FAILED`.

## Step 4: Verify (background)

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/verify.sh <package-name> <version>
```

Run with `run_in_background: true`. Exponential backoff (5s, 10s, 20s, 40s, 60s).

## Key Architecture Principle

**Scripts output status codes. The agent interprets them and talks to the user.** Script output is hidden inside collapsed bash commands — the user won't see it. All user-facing communication must be direct agent messages OUTSIDE of bash calls.
