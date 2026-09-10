---
name: npm-publish
version: 3.3.1
description: This skill should be used when the user wants to publish a package to npm, bump a version, release a new version, or mentions "npm publish", "bun publish", "version bump", or "release to npm". Handles version bumping, changelog updates, default-branch release delivery, scripted npm web login and bun publish confirmation (--local opens a browser, --remote prints a link). Do not trigger for unrelated uses of "release" (e.g. GitHub releases, press releases).
allowed-tools: Bash(git:*), Bash(chmod:*), Bash(bash:*), Bash(grep:*), Bash(sed:*), Bash(sleep:*)
---

# npm-publish

## MANDATORY — Read Before Doing Anything

Never ask the user for an OTP, one-time code, password, or token.

Never run `npm whoami`, `npm login`, `npm publish`, or `bun publish`. The bundled scripts run those.

`--otp` is a 6-digit authenticator code, not the npm token.

You MUST run these scripts.

When the script prints `WAITING_FOR_LOGIN`, `WAITING_FOR_PUBLISH_AUTH`, `LOGIN_URL`, `PUBLISH_AUTH_URL`, `BROWSER_OPENED`, or `BROWSER_LINK_ONLY`, you MUST send a user-visible chat message in that same turn with the link, and wait. Do not stay silent.

## Step 0–3: Branch, preflight, changelog, release

Default branch only. `preflight.sh` default bump is patch; pass `minor` or `major` only when that is the intended release.

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/preflight.sh
bash ${CLAUDE_SKILL_DIR}/scripts/release.sh --access public
```

## Step 4: Publish

`--local` if the user can see this machine's browser. `--remote` if they are on a phone or another device. If unsure, `--remote`.

Run this so you can read status codes while it waits:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/publish.sh --local --access public
bash ${CLAUDE_SKILL_DIR}/scripts/publish.sh --remote --access public
```

The script:

1. Runs `npm whoami`. If needed, starts `npm login --auth-type=web` and prints `LOGIN_URL` / `WAITING_FOR_LOGIN`.
2. After login, runs `bun publish`. bun then prints a **second** confirm URL (`PUBLISH_AUTH_URL`). `--local` opens it. `--remote` does not. Then `WAITING_FOR_PUBLISH_AUTH`.

Paste every `LOGIN_URL` and `PUBLISH_AUTH_URL` into chat as a markdown link as soon as it appears.

- `PUBLISH_SUCCESS` — verify
- `VERSION_ALREADY_PUBLISHED` — rerun preflight (not an auth failure)
- `AUTH_FAILED` / `LOGIN_FAILED` / `LOGIN_TIMEOUT` — rerun `publish.sh` with the same flag; do not ask for OTP

## Step 5: Verify (background)

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/verify.sh <package-name> <version>
```
