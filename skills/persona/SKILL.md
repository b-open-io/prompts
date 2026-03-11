---
name: persona
version: 1.0.0
description: >-
  Capture writing style profiles, track a pool of users, scan social
  intelligence, and apply style-matching to draft content. Use when asked
  to "capture my writing style", "draft a post in my voice", "scan what's
  trending", "add someone to the pool", or "track @username".
allowed-tools: Bash(${SKILL_DIR}/scripts:*), Read, Write
---

# Persona — Writing Style & Social Intelligence

## Operations

### 1. Capture Writing Style

Build a writing profile from a user's X posts. Requires `X_BEARER_TOKEN`.

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

### 4. Apply Style to Draft

Assemble a style-matching prompt from a profile and draft content. Does NOT call an LLM — outputs a prompt payload for you to use.

```bash
${SKILL_DIR}/scripts/apply.sh --draft <path-or--> [--profile <path>] [--format thread|single] [--max-chars 280]
```

- Loads the persona profile, content strategy rules, and draft
- Outputs JSON with `system`, `prompt`, and `output_schema` fields
- Feed this to `generateText()` or your preferred model

## Workflow: Draft a Post

1. Ensure a profile exists: `capture.sh --username <handle>`
2. Optionally scan for context: `scan.sh --topics "..."`
3. Write a rough draft (or let the scan inform it)
4. Run `apply.sh --draft <path> --profile .claude/persona/<handle>.json`
5. Use the returned prompt payload with the LLM to generate the styled post

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
├── pool.json          # Tracked user roster
├── topics.json        # Configured scan topics
└── last-scan.json     # Cached social intelligence scan
```

## Environment Variables

| Variable | Required For | Where to Get |
|----------|-------------|--------------|
| `X_BEARER_TOKEN` | capture, track (validation) | https://developer.x.com/en/portal/dashboard |
| `XAI_API_KEY` | scan | https://x.ai/api |
