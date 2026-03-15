# npm-publish

Publish npm packages from Claude Code with automatic token rotation. When your npm token expires, the skill uses agent-browser to create a new granular access token through Chrome — you click one button, the token is captured via clipboard, and publishing resumes automatically.

## Flow

```
preflight.sh → Agent writes CHANGELOG → release.sh → publish.sh → verify.sh
   (script)        (agent)                (script)     (script)     (background)
                                                          │
                                                     AUTH_FAILED?
                                                          │
                                                   setup-token.sh fill
                                                   (agent-browser fills form)
                                                          │
                                                   User clicks Generate
                                                          │
                                                   setup-token.sh capture
                                                   (clipboard → ~/.npmrc)
                                                          │
                                                   publish.sh retry
```

## Scripts

### preflight.sh

Checks the npm registry, handles version logic deterministically, builds, and outputs the commit log.

```bash
bash scripts/preflight.sh          # default: patch bump
bash scripts/preflight.sh minor    # minor bump
bash scripts/preflight.sh major    # major bump
```

Version logic:
- **local == npm** → bumps version (patch/minor/major)
- **local == npm+1** → no bump needed, ready to publish
- **local > npm+1** → gap detected (abandoned bumps), resets to npm+1
- Also updates `.claude-plugin/plugin.json` if present

### release.sh

Commits, pushes. Does NOT publish — returns `RELEASE_DONE` so the agent can call publish.sh separately and handle auth recovery.

```bash
bash scripts/release.sh                  # standard
bash scripts/release.sh --access public  # scoped @org/pkg
```

### publish.sh

Attempts `echo "" | bun publish`. Returns status codes:
- `PUBLISH_SUCCESS` — done
- `AUTH_FAILED` — token expired/missing, agent should run setup-token.sh

The piped ENTER auto-opens the OTP checkbox page when the token is valid but OTP is required.

### setup-token.sh

Two-phase token creation via agent-browser + Chrome:

**Phase 1 — `setup-token.sh fill`:**
1. Navigates to npmjs.com, detects username from DOM
2. Opens granular token creation page
3. Fills form: name "cli-publish", All packages, Read+write on packages and organizations, 7-day expiry
4. Returns `FORM_READY:<username>` — agent tells user to click Generate

**Phase 2 — `setup-token.sh capture`:**
1. Polls page for Copy button (token appears after user clicks Generate)
2. Clicks Copy → reads from clipboard via `pbpaste`
3. Writes `//registry.npmjs.org/:_authToken=<token>` to `~/.npmrc`
4. Clears clipboard immediately
5. Returns `TOKEN_SAVED`

**Security:** The token never appears in terminal output, shell history, or agent context. It flows: npm page → Copy button → system clipboard → `pbpaste` into file → clipboard cleared.

**Why granular tokens:** npm's CLI cannot create granular or automation tokens (`npm token create` only makes legacy publish tokens that require OTP every time). Granular tokens must be created through the website. agent-browser automates the form filling; the user's only interaction is clicking Generate.

### verify.sh

Confirms registry propagation with exponential backoff. Run as a background task.

```bash
bash scripts/verify.sh @scope/package 1.2.3
```

Backoff: 5s → 10s → 20s → 40s → 60s. Exits 0 when the version appears on npm.

## Authentication Architecture

The skill uses **granular access tokens** (7-day expiry) stored in `~/.npmrc`. This replaces the old approach of piping ENTER to `bun publish` for browser auth, which broke in bun 1.3.8 when tokens were fully expired (404 instead of auth prompt).

Token lifecycle:
1. **Token valid** → `bun publish` succeeds, may show OTP checkbox (piped ENTER opens it)
2. **Token expired** → `bun publish` returns 404 → `setup-token.sh` creates new token via Chrome → retry succeeds
3. **No token** → same as expired

The 7-day expiry keeps tokens short-lived. Rotation is automated, so short expiry adds security without friction.

## Agent Orchestration

Scripts output status codes. The agent interprets them and communicates with the user between phases. This matters because bash command output is collapsed in Claude Code — the user won't see `echo` statements from scripts. All user-facing messages must come from the agent directly.

Key status codes:
| Script | Code | Agent Action |
|--------|------|-------------|
| publish.sh | `PUBLISH_SUCCESS` | Tell user "Published", run verify.sh |
| publish.sh | `AUTH_FAILED` | Run setup-token.sh fill |
| setup-token.sh fill | `FORM_READY:<user>` | Tell user "Click Generate token in Chrome" |
| setup-token.sh fill | `NOT_LOGGED_IN` | Tell user "Sign in to npmjs.com in Chrome" |
| setup-token.sh capture | `TOKEN_SAVED` | Retry publish.sh |
| setup-token.sh capture | `CAPTURE_TIMEOUT` | Tell user to copy token manually |
| release.sh | `RELEASE_DONE:pkg:ver:flags` | Run publish.sh with flags |

## Form Interaction Details

npm's token creation page uses custom React components, not standard HTML form elements:

- **Permission dropdowns** (Packages, Organizations): Clickable divs that open `menuitemcheckbox` option lists. Pattern: click trigger → snapshot with `-C` flag → click menuitemcheckbox option.
- **Expiration dropdown**: Same pattern as permissions.
- **All packages radio**: Standard radio but `agent-browser click` doesn't reliably select it. Use `eval 'document.getElementById("packagesAll").click()'` instead.
- **Organization checkboxes**: Standard checkboxes, use `agent-browser check @ref` for each.

## Files

```
npm-publish/
├── SKILL.md              # Agent instructions (what the model reads)
├── README.md             # This file (human + developer docs)
└── scripts/
    ├── preflight.sh      # Check + bump + build + commit log
    ├── release.sh        # Commit + push (returns RELEASE_DONE)
    ├── publish.sh        # Try publish (returns PUBLISH_SUCCESS or AUTH_FAILED)
    ├── setup-token.sh    # Two-phase: fill form / capture token
    └── verify.sh         # Background: exponential backoff registry check
```

## Prerequisites

- **agent-browser** >= 0.20.0 (`bun install -g agent-browser`)
- **Chrome** with remote debugging enabled
- Logged into npmjs.com in Chrome (setup-token.sh will open the login page if not)
