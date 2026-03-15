---
name: npm-publish
version: 3.1.0
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, git push, npm publishing, and automatic token rotation via agent-browser when auth expires. Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
allowed-tools: Bash(agent-browser:*), Bash(npm:*), Bash(bun:*), Bash(git:*), Bash(pbpaste:*), Bash(pbcopy:*), Bash(chmod:*), Bash(bash:*), Bash(grep:*), Bash(sed:*), Bash(sleep:*)
---

# npm-publish

## MANDATORY — Read Before Doing Anything

**NEVER ask the user for an OTP code.** Auth is handled by scripts + agent-browser.

**NEVER run manual npm/bun commands** like `npm whoami`, `npm view`, `bun publish`, or `npm publish`.

**You MUST run these scripts. Do NOT skip steps.**

## Step 1: Preflight

```bash
bash ${SKILL_DIR}/scripts/preflight.sh
```

Handles deterministically: version check against npm registry, bump if needed (resets gaps), build, commit log output. Pass `minor` or `major` to override default patch bump.

## Step 2: Write Changelog

Read the commit log from preflight output. If CHANGELOG.md exists, add entry at top matching existing format. If not, create one. Use the version from preflight output. Categorize: Breaking Changes, Added, Changed, Fixed, Security, Deprecated.

## Step 3: Release (commit + push + publish)

```bash
bash ${SKILL_DIR}/scripts/release.sh [--access public]
```

Commits, pushes, then calls publish.sh. If publish.sh outputs `PUBLISH_SUCCESS` — done, go to Step 4.

### If publish.sh outputs `AUTH_FAILED`

The agent must orchestrate token setup. **Do NOT call setup-token.sh as one long command.** Run it in two phases with user communication between them.

**Phase 1 — Fill the form:**

```bash
bash ${SKILL_DIR}/scripts/setup-token.sh fill
```

Status codes:
- `FORM_READY:<username>` — form is filled in Chrome, proceed to tell user
- `NOT_LOGGED_IN` — tell user: "Sign in to npmjs.com in Chrome, then I'll retry"
- `FORM_NOT_FOUND` — tell user: "Could not find the token form. The page may have changed."

After getting `FORM_READY`, **tell the user directly** (not inside a bash command):

> I've opened the npm token creation form in Chrome and filled it out (cli-publish, 7-day, read+write, all packages). Scroll down and click **Generate token** when ready.

**Phase 2 — Capture the token:**

```bash
bash ${SKILL_DIR}/scripts/setup-token.sh capture
```

This polls until the token appears on the page, clicks the Copy button, reads from clipboard, writes to `~/.npmrc`, and clears clipboard. The token never appears in terminal output.

Status codes:
- `TOKEN_SAVED` — success, retry publish
- `CAPTURE_TIMEOUT` — tell user: "Could not capture token. Copy it from Chrome and I'll write it to ~/.npmrc"

**After TOKEN_SAVED, retry publish:**

```bash
bash ${SKILL_DIR}/scripts/publish.sh [--access public]
```

Tell user: "Complete the OTP checkbox in your browser if prompted."

## Step 4: Verify (background)

```bash
bash ${SKILL_DIR}/scripts/verify.sh <package-name> <version>
```

Run with `run_in_background: true`. Exponential backoff (5s, 10s, 20s, 40s, 60s).

## Key Architecture Principle

**Scripts output status codes. The agent interprets them and talks to the user.** Script output is hidden inside collapsed bash commands — the user won't see it. All user-facing communication must be direct agent messages OUTSIDE of bash calls.
