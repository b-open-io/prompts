---
name: persona
version: 1.0.1
description: >-
  Capture writing style profiles, track a pool of users, scan social
  intelligence, and apply style-matching to draft content. Use when asked
  to "capture my writing style", "draft a post in my voice", "scan what's
  trending", "add someone to the pool", or "track @username".
allowed-tools: Bash(${SKILL_DIR}/scripts:*), Bash(bun:*), Read, Write
---

# Persona — Writing Style & Social Intelligence

## Operations

### 0. Set Up X Token (when needed)

**IMPORTANT:** If any script fails with `TOKEN_SETUP_NEEDED`, you MUST help the user set up a token before retrying. Do not just report the error — fix it.

```bash
# Open X developer portal and guide the user
${SKILL_DIR}/scripts/setup-token.sh --username <handle> --cdp-script <path-to-cdp.ts>
```

The Chrome CDP script path is: find it with `ls ~/.claude/plugins/cache/b-open-io/bopen-tools/*/skills/chrome-cdp/scripts/cdp.ts`

After the user provides the bearer token, save it:
```bash
${SKILL_DIR}/scripts/save-token.sh --username <handle> --token <bearer_token>
```

This validates the token against the X API and stores it in `.claude/persona/tokens.json` keyed by username. Multiple accounts are supported — each username gets its own token.

**Recovery flow when token fails:**
1. Run `setup-token.sh` to open the developer portal in Chrome
2. Ask the user to copy their Bearer Token from the Keys and Tokens page
3. Run `save-token.sh` with the token they provide
4. Retry the original operation

### 1. Capture Writing Style

Build a writing profile from a user's X posts. Requires a valid X API token (stored in `tokens.json` or env var).

```bash
${SKILL_DIR}/scripts/capture.sh --username <handle> [--count 50] [--output <path>] [--refresh]
```

- Fetches original English posts, scores by 60% recency + 40% engagement
- Writes profile to `.claude/persona/<username>.json`
- Cached for 7 days — pass `--refresh` to force re-fetch

### 2. Track Users

Manage a pool of X users to monitor. Pool stored in `.claude/persona/pool.json`.

```bash
# Add a user (validates via X API, auto-captures profile)
${SKILL_DIR}/scripts/track.sh add <username> [--note "reason"]

# Remove a user
${SKILL_DIR}/scripts/track.sh remove <username>

# List all tracked users with profile status
${SKILL_DIR}/scripts/track.sh list

# Refresh profiles for one or all users
${SKILL_DIR}/scripts/track.sh refresh [username]
```

### 3. Scan Social Intelligence

Run a social intelligence scan via xAI Grok. Requires `XAI_API_KEY`.

```bash
${SKILL_DIR}/scripts/scan.sh [--topics "Bitcoin SV, AI agents"] [--pool] [--save-topics] [--refresh]
```

- Returns: Technical Developments, Content Opportunities, Notable Activity, Early Signals
- `--pool` includes recent activity from tracked users
- `--save-topics` persists topics to `.claude/persona/topics.json`
- Cached for 4 hours — pass `--refresh` to force

### 4. Generate Draft (Full Pipeline)

Generate a styled draft post by combining all context layers — persona profile, body of work, git activity, social intelligence, and content strategy. Calls the Claude API directly.

```bash
${SKILL_DIR}/scripts/draft.sh [--profile <path>] [--scan <path>] [--topic "angle"] [--parts 3] [--output <path>] [--model claude-sonnet-4-6]
```

Context assembly (mirrors satchmo.dev pipeline):
1. Voice examples from persona profile
2. Body of work from `.claude/persona/work.json`
3. Recent git commits from repos in work.json
4. Social intelligence scan (cached or specify path)
5. Content strategy rules

The LLM cross-references all layers — connecting trending topics to your actual work and recent commits. Requires `ANTHROPIC_API_KEY`.

### 5. Manage Body of Work

Configure the projects/products you've built — gives the LLM context about what to connect trending topics to.

```bash
# Add a project
${SKILL_DIR}/scripts/work.sh add --title "Project Name" --desc "What it does" --tags "tag1, tag2" [--repo owner/repo]

# List projects
${SKILL_DIR}/scripts/work.sh list

# Remove a project
${SKILL_DIR}/scripts/work.sh remove "Project Name"
```

Projects with a `--repo` field also feed into git activity fetching.

### 6. Fetch Git Activity

Fetch recent commits from configured repos (pulled from work.json `repo` fields + explicit repos).

```bash
${SKILL_DIR}/scripts/git-activity.sh [--repos "owner/repo1, owner/repo2"] [--per-repo 5] [--hours 48]
```

Uses `GITHUB_TOKEN` for private repos. Public repos work without auth.

### 7. Apply Style to Draft (Manual)

Assemble a style-matching prompt from a profile and draft content. Does NOT call an LLM — outputs a prompt payload for you to use. Use `draft.sh` instead for the full pipeline.

```bash
${SKILL_DIR}/scripts/apply.sh --draft <path-or--> [--profile <path>] [--format thread|single] [--max-chars 280]
```

- Loads the persona profile, content strategy rules, and draft
- Outputs JSON with `system`, `prompt`, and `output_schema` fields
- Feed this to `generateText()` or your preferred model

### 8. Preview Post

Open a local preview of a styled post in the browser. Fully offline — no external services.

```bash
# Static preview (self-contained HTML, auto-opens browser)
${SKILL_DIR}/scripts/preview.sh --post <json-path> [--image <path>] [--username <handle>]

# Interactive playground (live editing, image generation, approval workflow)
bun run ${SKILL_DIR}/scripts/playground.ts --data <json-path> [--port 4747] [--open]
```

- **preview.sh**: Static HTML preview with base64-embedded images
- **playground.ts**: Live editor with real-time preview, image upload/generation, approve/reject workflow
  - `--open` flag opens browser automatically (default: no auto-open)
  - Shows real X avatar when token is available or profile has been captured
  - Generate Image button uses gemskills (requires `claude plugin install gemskills@b-open-io`)
  - Auto-exits 30s after browser tab closes (heartbeat-based)

## Workflow: Generate a Post (Full Pipeline)

1. Set up body of work: `work.sh add --title "..." --desc "..." --tags "..." --repo "..."`
2. Capture voice profile: `capture.sh --username <handle>`
3. Scan for intelligence: `scan.sh --topics "..."`
4. Generate draft: `draft.sh --parts 3 --output post.json`
5. Preview and edit: `bun run playground.ts --data post.json --open`
6. Approve in playground

Or with a specific topic from the scan:

4b. `draft.sh --topic "opportunity from scan" --parts 2 --output post.json`

## Workflow: Restyle an Existing Draft (Manual)

1. Write a rough draft
2. Run `apply.sh --draft <path> --profile .claude/persona/<handle>.json`
3. Use the returned prompt payload with your preferred LLM
4. Preview: `preview.sh --post <output.json>`

## Workflow: Set Up Tracking Pool

1. `track.sh add wildsatchmo --note "self"`
2. `track.sh add somedev --note "BSV builder"`
3. `track.sh list` — verify pool and profile status
4. `scan.sh --pool` — include pool activity in scans

## Storage

All data lives in `.claude/persona/` in the project root:

```
.claude/persona/
├── <username>.json    # Individual writing profiles
├── tokens.json        # X API tokens keyed by username (multi-account)
├── pool.json          # Tracked user roster
├── work.json          # Body of work / projects config
├── topics.json        # Configured scan topics
└── last-scan.json     # Cached social intelligence scan
```

## Token Resolution

X API tokens are resolved in this order:

1. **`tokens.json` by username** — Multi-account: each persona has its own token in `.claude/persona/tokens.json`
2. **`tokens.json` any account** — Falls back to any valid token from other accounts
3. **`X_BEARER_TOKEN` env var** — App-only bearer token (legacy, single-account)
4. **`X_ACCESS_TOKEN` env var** — OAuth 2.0 user token
5. **OAuth refresh** — Using `X_REFRESH_TOKEN` + `X_CLIENT_SECRET_ID`
6. **`TOKEN_SETUP_NEEDED`** — All methods exhausted, model should run setup-token.sh

The `tokens.json` format:
```json
{
  "wildsatchmo": { "bearer": "AAA...", "added": "2026-03-16T19:00:00Z" },
  "bopen_io": { "bearer": "BBB...", "added": "2026-03-16T19:00:00Z" }
}
```

## Environment Variables

Env vars are a fallback — prefer `tokens.json` for multi-account support.

| Variable | Required For | Where to Get | Notes |
|----------|-------------|--------------|-------|
| `X_BEARER_TOKEN` | capture, track (fallback) | https://developer.x.com/en/portal/dashboard | Single-account fallback |
| `X_ACCESS_TOKEN` | capture, track (fallback) | OAuth 2.0 flow | User token, works for reads too |
| `X_REFRESH_TOKEN` | auto-refresh | OAuth 2.0 flow | Used with `X_CLIENT_SECRET_ID` |
| `X_CLIENT_SECRET_ID` | auto-refresh | https://developer.x.com/en/portal/dashboard | OAuth client ID |
| `XAI_API_KEY` | scan | https://x.ai/api | xAI Grok for social intelligence |
| `ANTHROPIC_API_KEY` | draft | https://console.anthropic.com/ | Claude API for draft generation |
| `GITHUB_TOKEN` | git-activity | https://github.com/settings/tokens | For private repo commit fetching |
