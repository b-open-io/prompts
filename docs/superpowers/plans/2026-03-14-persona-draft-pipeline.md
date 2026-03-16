# Persona Draft Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between social intelligence scanning and draft generation by adding the missing scripts that mirror satchmo.dev's `regenerate-post` pipeline — body of work context, git activity, and the actual LLM call.

**Architecture:** Three new scripts (`work.sh`, `git-activity.sh`, `draft.sh`) that each produce one context layer, plus `draft.sh` orchestrates them all into a single Claude API call. Mirrors the exact data flow from `regenerate-post/route.ts` but as portable CLI tools. `apply.sh` remains unchanged (it serves a different use case: restyling an existing draft).

**Tech Stack:** Bash scripts (consistent with existing skill), `curl` for GitHub/Anthropic APIs, `jq` for JSON processing. No new dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/work.sh` | Create | Manage body-of-work config (add/remove/list projects) |
| `scripts/git-activity.sh` | Create | Fetch recent commits from configured repos via GitHub API |
| `scripts/draft.sh` | Create | Orchestrate all context → Claude API → `{thread}` JSON output |
| `scripts/x-token.sh` | Exists | Shared X token resolution (no changes) |
| `scripts/capture.sh` | Exists | Voice profile capture (no changes) |
| `scripts/scan.sh` | Exists | Social intelligence scan (no changes) |
| `scripts/apply.sh` | Exists | Style-match an existing draft (no changes) |
| `scripts/playground.ts` | Exists | Preview/edit (no changes) |
| `SKILL.md` | Modify | Document new scripts and end-to-end workflow |

---

## Task 1: Body of Work Config (`work.sh`)

Mirrors `src/data/featured-work.ts` — a list of projects with titles, descriptions, and tags that give the LLM context about what you've built.

**Files:**
- Create: `scripts/work.sh`
- Data: `.claude/persona/work.json`

- [ ] **Step 1: Create `work.sh` with add/remove/list subcommands**

```bash
#!/bin/bash
# Manage body of work — projects the persona has built.
# Usage: work.sh <add|remove|list> [options]
# Data: .claude/persona/work.json
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
WORK_FILE="$PERSONA_DIR/work.json"

ensure_work() {
    mkdir -p "$PERSONA_DIR"
    if [ ! -f "$WORK_FILE" ]; then
        echo '{"projects":[]}' > "$WORK_FILE"
    fi
}

cmd_add() {
    local title="" desc="" tags="" url="" repo=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --title) title="$2"; shift 2 ;;
            --desc) desc="$2"; shift 2 ;;
            --tags) tags="$2"; shift 2 ;;
            --url) url="$2"; shift 2 ;;
            --repo) repo="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -z "$title" ]; then
        echo "Error: --title is required"
        echo "Usage: work.sh add --title \"Project\" --desc \"What it does\" --tags \"tag1, tag2\" [--url URL] [--repo owner/repo]"
        exit 1
    fi

    ensure_work

    # Check for duplicate
    if jq -e --arg t "$title" '.projects[] | select(.title == $t)' "$WORK_FILE" > /dev/null 2>&1; then
        echo "Already exists: $title"
        exit 0
    fi

    # Build tags array
    local tags_json="[]"
    if [ -n "$tags" ]; then
        tags_json=$(echo "$tags" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | jq -R . | jq -s .)
    fi

    jq --arg t "$title" --arg d "$desc" --argjson tags "$tags_json" --arg u "$url" --arg r "$repo" \
        '.projects += [{"title": $t, "desc": $d, "tags": $tags, "url": $u, "repo": $r} | del(.[] | select(. == ""))]' \
        "$WORK_FILE" > "${WORK_FILE}.tmp" && mv "${WORK_FILE}.tmp" "$WORK_FILE"

    echo "Added: $title"
}

cmd_remove() {
    local title="$1"
    if [ -z "$title" ]; then
        echo "Error: title required"
        exit 1
    fi

    ensure_work
    jq --arg t "$title" '.projects = [.projects[] | select(.title != $t)]' \
        "$WORK_FILE" > "${WORK_FILE}.tmp" && mv "${WORK_FILE}.tmp" "$WORK_FILE"
    echo "Removed: $title"
}

cmd_list() {
    ensure_work
    local count
    count=$(jq '.projects | length' "$WORK_FILE")
    if [ "$count" = "0" ]; then
        echo "No projects configured. Add with: work.sh add --title \"...\" --desc \"...\""
        exit 0
    fi
    echo "Body of work ($count projects):"
    echo ""
    jq -r '.projects[] | "  \(.title): \(.desc) [\(.tags | join(", "))]"' "$WORK_FILE"
}

# Format for LLM context (used by draft.sh)
cmd_context() {
    ensure_work
    jq -r '.projects[] | "- \(.title): \(.desc) (\(.tags | join(", ")))"' "$WORK_FILE"
}

ACTION="${1:-}"
shift || true

case "$ACTION" in
    add) cmd_add "$@" ;;
    remove) cmd_remove "$@" ;;
    list) cmd_list ;;
    context) cmd_context ;;
    *) echo "Usage: work.sh <add|remove|list|context> [options]"; exit 1 ;;
esac
```

- [ ] **Step 2: Test it**

```bash
chmod +x scripts/work.sh
bash scripts/work.sh add --title "MAP Protocol" --desc "Most widely used metadata protocol on Bitcoin" --tags "Protocol, BSV, Standard"
bash scripts/work.sh add --title "1Sat Ordinals" --desc "Most used token protocol on Bitcoin" --tags "Protocol, Ordinals, BSV" --repo "b-open-io/1satordinals.com"
bash scripts/work.sh list
bash scripts/work.sh context
```

Expected: formatted list and LLM-ready context output.

- [ ] **Step 3: Commit**

```bash
git add scripts/work.sh
git commit -m "Add work.sh — body of work config for persona draft context"
```

---

## Task 2: Git Activity Fetcher (`git-activity.sh`)

Mirrors `fetchRecentCommits()` from `regenerate-post/route.ts` — fetches recent commits from configured repos.

**Files:**
- Create: `scripts/git-activity.sh`

- [ ] **Step 1: Create `git-activity.sh`**

```bash
#!/bin/bash
# Fetch recent git activity from configured repos.
# Usage: git-activity.sh [--repos "owner/repo1, owner/repo2"] [--per-repo 5] [--hours 48]
# Also reads repos from work.json (projects with "repo" field).
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
WORK_FILE="$PERSONA_DIR/work.json"
REPOS=""
PER_REPO=5
HOURS=48

while [ $# -gt 0 ]; do
    case "$1" in
        --repos) REPOS="$2"; shift 2 ;;
        --per-repo) PER_REPO="$2"; shift 2 ;;
        --hours) HOURS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Build repo list: explicit --repos + repos from work.json
ALL_REPOS=""
if [ -n "$REPOS" ]; then
    ALL_REPOS=$(echo "$REPOS" | tr ',' '\n' | sed 's/^ *//;s/ *$//')
fi

if [ -f "$WORK_FILE" ]; then
    work_repos=$(jq -r '.projects[] | select(.repo != null and .repo != "") | .repo' "$WORK_FILE" 2>/dev/null)
    if [ -n "$work_repos" ]; then
        if [ -n "$ALL_REPOS" ]; then
            ALL_REPOS=$(printf "%s\n%s" "$ALL_REPOS" "$work_repos" | sort -u)
        else
            ALL_REPOS="$work_repos"
        fi
    fi
fi

if [ -z "$ALL_REPOS" ]; then
    echo "(no repos configured — add repos to work.json or pass --repos)"
    exit 0
fi

# GitHub auth
HEADERS=(-H "Accept: application/vnd.github+json" -H "User-Agent: persona-skill")
if [ -n "$GITHUB_TOKEN" ]; then
    HEADERS+=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

# Cutoff time
SINCE=$(date -u -v-${HOURS}H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "${HOURS} hours ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || "")
SINCE_PARAM=""
if [ -n "$SINCE" ]; then
    SINCE_PARAM="&since=${SINCE}"
fi

# Fetch commits from each repo
LINES=""
echo "$ALL_REPOS" | while read -r repo; do
    [ -z "$repo" ] && continue
    response=$(curl -s "${HEADERS[@]}" \
        "https://api.github.com/repos/${repo}/commits?per_page=${PER_REPO}${SINCE_PARAM}" 2>/dev/null)

    # Skip if error or not an array
    if ! echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1; then
        continue
    fi

    echo "$response" | jq -r --arg repo "$repo" '
        .[] | "[\($repo)] \(.commit.author.date | split("T")[0]): \(.commit.message | split("\n")[0])"
    ' 2>/dev/null
done
```

- [ ] **Step 2: Test it**

```bash
chmod +x scripts/git-activity.sh
# With a repo that exists
bash scripts/git-activity.sh --repos "rohenaz/wildsatchmo" --per-repo 3
```

Expected: `[rohenaz/wildsatchmo] 2026-03-14: commit message` lines.

- [ ] **Step 3: Commit**

```bash
git add scripts/git-activity.sh
git commit -m "Add git-activity.sh — fetch recent commits for draft context"
```

---

## Task 3: Draft Generator (`draft.sh`)

The missing piece — orchestrates all context layers and calls Claude to generate styled drafts. Mirrors the exact flow from `regenerate-post/route.ts`.

**Files:**
- Create: `scripts/draft.sh`

- [ ] **Step 1: Create `draft.sh`**

```bash
#!/bin/bash
# Generate a styled draft post by combining persona + intelligence + git activity.
# Usage: draft.sh [--profile <path>] [--scan <path>] [--topic "specific angle"] [--parts 3] [--output <path>]
#
# Context assembly (mirrors satchmo.dev/api/x/regenerate-post):
#   1. Voice examples from persona profile (capture.sh output)
#   2. Body of work from work.json (work.sh output)
#   3. Recent git activity from configured repos (git-activity.sh)
#   4. Social intelligence / trending data (scan.sh output or live Grok)
#   5. Content strategy rules (references/content-strategy.md)
#
# Calls Claude API and outputs {thread: [{text, image_prompt}]} JSON.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCES_DIR="$(cd "$SCRIPT_DIR/../references" && pwd)"
PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"

PROFILE_PATH=""
SCAN_PATH=""
TOPIC=""
PARTS=3
OUTPUT=""
MODEL="claude-sonnet-4-6"

while [ $# -gt 0 ]; do
    case "$1" in
        --profile) PROFILE_PATH="$2"; shift 2 ;;
        --scan) SCAN_PATH="$2"; shift 2 ;;
        --topic) TOPIC="$2"; shift 2 ;;
        --parts) PARTS="$2"; shift 2 ;;
        --output) OUTPUT="$2"; shift 2 ;;
        --model) MODEL="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Require ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY is not set"
    echo ""
    echo "1. Get an API key from https://console.anthropic.com/"
    echo "2. Export it: export ANTHROPIC_API_KEY=\"your-key\""
    exit 1
fi

# ── Resolve profile ──────────────────────────────────────────────
if [ -z "$PROFILE_PATH" ]; then
    if [ -d "$PERSONA_DIR" ]; then
        PROFILE_PATH=$(find "$PERSONA_DIR" -name "*.json" -not -name "pool.json" -not -name "topics.json" -not -name "last-scan.json" -not -name "work.json" -type f 2>/dev/null | while read -r f; do
            echo "$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0) $f"
        done | sort -rn | head -1 | awk '{print $2}')
    fi
fi

if [ -z "$PROFILE_PATH" ] || [ ! -f "$PROFILE_PATH" ]; then
    echo "Error: No persona profile found. Run: capture.sh --username <handle>"
    exit 1
fi

USERNAME=$(jq -r '.username' "$PROFILE_PATH")
EXAMPLES=$(jq -r '.examples | to_entries | .[] | "\(.key + 1). \(.value)"' "$PROFILE_PATH")
EXAMPLE_COUNT=$(jq '.examples | length' "$PROFILE_PATH")

echo "Profile: @$USERNAME ($EXAMPLE_COUNT voice examples)" >&2

# ── Body of work ─────────────────────────────────────────────────
WORK_CONTEXT="(no body of work configured — run work.sh add)"
if [ -f "$PERSONA_DIR/work.json" ]; then
    WORK_CONTEXT=$(bash "$SCRIPT_DIR/work.sh" context 2>/dev/null)
    if [ -z "$WORK_CONTEXT" ]; then
        WORK_CONTEXT="(no projects configured)"
    fi
fi
echo "Work: $(echo "$WORK_CONTEXT" | wc -l | tr -d ' ') projects" >&2

# ── Git activity ─────────────────────────────────────────────────
GIT_CONTEXT=$(bash "$SCRIPT_DIR/git-activity.sh" 2>/dev/null)
if [ -z "$GIT_CONTEXT" ]; then
    GIT_CONTEXT="(no recent git activity)"
fi
echo "Git: $(echo "$GIT_CONTEXT" | wc -l | tr -d ' ') commits" >&2

# ── Social intelligence ──────────────────────────────────────────
SCAN_CONTEXT=""
if [ -n "$SCAN_PATH" ] && [ -f "$SCAN_PATH" ]; then
    SCAN_CONTEXT=$(jq -r '
        "TECHNICAL DEVELOPMENTS:\n" + .trending + "\n\n" +
        "CONTENT OPPORTUNITIES:\n" + .opportunities + "\n\n" +
        "NOTABLE ACTIVITY:\n" + .notable + "\n\n" +
        "EARLY SIGNALS:\n" + .early_signals
    ' "$SCAN_PATH")
elif [ -f "$PERSONA_DIR/last-scan.json" ]; then
    SCAN_CONTEXT=$(jq -r '
        "TECHNICAL DEVELOPMENTS:\n" + .trending + "\n\n" +
        "CONTENT OPPORTUNITIES:\n" + .opportunities + "\n\n" +
        "NOTABLE ACTIVITY:\n" + .notable + "\n\n" +
        "EARLY SIGNALS:\n" + .early_signals
    ' "$PERSONA_DIR/last-scan.json")
fi
if [ -z "$SCAN_CONTEXT" ]; then
    SCAN_CONTEXT="(no scan data — run scan.sh first)"
fi
echo "Scan: loaded" >&2

# ── Content strategy ─────────────────────────────────────────────
STRATEGY=""
if [ -f "$REFERENCES_DIR/content-strategy.md" ]; then
    STRATEGY=$(cat "$REFERENCES_DIR/content-strategy.md")
fi

# ── Build system prompt (mirrors regenerate-post/route.ts) ───────
SYSTEM="You are @${USERNAME}. You write your own X/Twitter posts.
You are NOT an assistant drafting on behalf of someone — you ARE the person. Write in first person as yourself.

=== YOUR BODY OF WORK ===
${WORK_CONTEXT}

=== YOUR VOICE (${EXAMPLE_COUNT} examples, match this tone exactly) ===
These are your real tweets sorted by a blend of recency and engagement. Your new post MUST sound like these — same vocabulary, sentence structure, energy, and personality:

${EXAMPLES}

=== SOCIAL CONTENT STRATEGY ===
${STRATEGY}

RULES:
- Write EXACTLY like the voice examples above. Same energy, same style.
- Draw from trending topics AND recent work. Connect what's happening in the industry to what you're building.
- Every post should feel like it came from a real person sharing genuine thoughts, not a content calendar.
- Output valid JSON only. No markdown fences, no explanation."

# ── Build user prompt ────────────────────────────────────────────
TOPIC_LINE=""
if [ -n "$TOPIC" ]; then
    TOPIC_LINE="
=== SPECIFIC ANGLE ===
Focus on this topic/opportunity: ${TOPIC}
Connect it to your actual work and experience. Don't force it if there's no real connection.
"
fi

PROMPT="=== RECENT GIT ACTIVITY ===
${GIT_CONTEXT}

=== TRENDING RIGHT NOW ===
${SCAN_CONTEXT}
${TOPIC_LINE}
Generate a ${PARTS}-part thread. Return JSON: {\"thread\":[{\"text\":\"...\",\"image_prompt\":\"...\"},...]}. Each text max 280 chars. Include image_prompt on parts where a visual would boost engagement (null otherwise)."

echo "Generating ${PARTS}-part draft..." >&2

# ── Call Claude API ──────────────────────────────────────────────
RESPONSE=$(curl -s "https://api.anthropic.com/v1/messages" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "$(jq -n \
        --arg model "$MODEL" \
        --arg system "$SYSTEM" \
        --arg prompt "$PROMPT" \
        '{
            model: $model,
            max_tokens: 2048,
            temperature: 0.7,
            system: $system,
            messages: [{"role": "user", "content": $prompt}]
        }')")

# ── Parse response ───────────────────────────────────────────────
TEXT=$(echo "$RESPONSE" | jq -r '.content[0].text // empty')

if [ -z "$TEXT" ]; then
    echo "Error: No response from Claude API" >&2
    echo "$RESPONSE" | jq -r '.error.message // .' >&2
    exit 1
fi

# Clean markdown fences if present
CLEANED=$(echo "$TEXT" | sed 's/^```\(json\)\{0,1\}//;s/```$//' | sed '/^$/d')

# Validate JSON
if ! echo "$CLEANED" | jq -e '.thread' > /dev/null 2>&1; then
    # Try to extract JSON from response
    CLEANED=$(echo "$TEXT" | grep -o '{.*}' | head -1)
    if ! echo "$CLEANED" | jq -e '.thread' > /dev/null 2>&1; then
        echo "Error: Failed to parse response as JSON" >&2
        echo "Raw response:" >&2
        echo "$TEXT" >&2
        exit 1
    fi
fi

# Add username to output for playground compatibility
RESULT=$(echo "$CLEANED" | jq --arg u "$USERNAME" '. + {username: $u, parts: .thread}')

# Save output
if [ -n "$OUTPUT" ]; then
    echo "$RESULT" > "$OUTPUT"
    echo "Draft saved to $OUTPUT" >&2
fi

echo "$RESULT"
echo "" >&2
echo "Preview with: bun run \$(dirname \$0)/playground.ts --data $OUTPUT" >&2
```

- [ ] **Step 2: Test it**

```bash
chmod +x scripts/draft.sh
# Dry run — check context assembly (will fail at API call without key, that's fine)
bash scripts/draft.sh --parts 2 2>&1 | head -20
```

Expected: "Profile: @wildsatchmo (46 voice examples)", "Work: N projects", "Git: N commits", "Scan: loaded"

- [ ] **Step 3: Full test with API key**

```bash
export ANTHROPIC_API_KEY="..."
bash scripts/draft.sh --parts 3 --output /tmp/test-draft.json
# Then preview it
bun run scripts/playground.ts --data /tmp/test-draft.json --open
```

Expected: 3-part thread JSON with text + image_prompt fields, playground opens with content.

- [ ] **Step 4: Test with specific topic from scan**

```bash
bash scripts/draft.sh --topic "MCP server ecosystem exploding" --parts 2 --output /tmp/topic-draft.json
```

Expected: Draft focused on MCP servers, connected to your actual work (Agent Skills, ClawNet).

- [ ] **Step 5: Commit**

```bash
git add scripts/draft.sh
git commit -m "Add draft.sh — full context draft generation mirroring satchmo.dev pipeline"
```

---

## Task 4: Update SKILL.md

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Add draft operation and update workflow**

Add after the "Apply Style to Draft" section:

```markdown
### 6. Generate Draft (Full Pipeline)

Generate a styled draft post by combining all context layers — persona profile, body of work, git activity, social intelligence, and content strategy. Calls the Claude API directly.

\`\`\`bash
${SKILL_DIR}/scripts/draft.sh [--profile <path>] [--scan <path>] [--topic "angle"] [--parts 3] [--output <path>] [--model claude-sonnet-4-6]
\`\`\`

Context assembly (mirrors satchmo.dev pipeline):
1. Voice examples from persona profile
2. Body of work from `.claude/persona/work.json`
3. Recent git commits from repos in work.json
4. Social intelligence scan (cached or specify path)
5. Content strategy rules

Requires `ANTHROPIC_API_KEY`. Optionally uses `GITHUB_TOKEN` for git activity.

### 7. Manage Body of Work

Configure the projects/products you've built — gives the LLM context about what to connect trending topics to.

\`\`\`bash
# Add a project
${SKILL_DIR}/scripts/work.sh add --title "Project Name" --desc "What it does" --tags "tag1, tag2" [--repo owner/repo]

# List projects
${SKILL_DIR}/scripts/work.sh list

# Remove a project
${SKILL_DIR}/scripts/work.sh remove "Project Name"
\`\`\`

### 8. Fetch Git Activity

Fetch recent commits from configured repos (pulled from work.json `repo` fields).

\`\`\`bash
${SKILL_DIR}/scripts/git-activity.sh [--repos "owner/repo1, owner/repo2"] [--per-repo 5] [--hours 48]
\`\`\`

Requires `GITHUB_TOKEN` for private repos.
```

Update the workflow section:

```markdown
## Workflow: Generate a Post (Full Pipeline)

1. Set up body of work: `work.sh add --title "..." --desc "..." --tags "..." --repo "..."`
2. Capture voice profile: `capture.sh --username <handle>`
3. Scan for intelligence: `scan.sh --topics "..."`
4. Generate draft: `draft.sh --parts 3 --output post.json`
5. Preview and edit: `bun run playground.ts --data post.json --open`
6. Approve in playground → done

Or with a specific topic from the scan:
4b. `draft.sh --topic "opportunity from scan" --parts 2 --output post.json`
```

Update the env vars table to include `ANTHROPIC_API_KEY` and `GITHUB_TOKEN`.

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "Document draft pipeline, work.sh, and git-activity.sh in SKILL.md"
```

---

## Task 5: Seed Body of Work for wildsatchmo

Pre-populate work.json with the same projects from `featured-work.ts` so the pipeline works out of the box.

- [ ] **Step 1: Seed projects**

```bash
bash scripts/work.sh add --title "MAP Protocol" --desc "Most widely used metadata protocol on Bitcoin. Structured, typed key-value data in any transaction output." --tags "Protocol, BSV, Standard"
bash scripts/work.sh add --title "1Sat Ordinals" --desc "Most used token protocol on Bitcoin. Inscribe data to individual satoshis." --tags "Protocol, Ordinals, BSV" --repo "b-open-io/1satordinals.com"
bash scripts/work.sh add --title "Sigma Identity" --desc "Self-sovereign identity for AI agents and apps. OAuth 2.0 backed by blockchain signatures." --tags "Identity, Auth, AI"
bash scripts/work.sh add --title "ClawNet" --desc "Ship AI agent sandboxes with portable skills, identity, and deployment tooling." --tags "Agents, Platform, CLI" --repo "b-open-io/clawnet-bot"
bash scripts/work.sh add --title "Agent Skills" --desc "Plugin ecosystem for Claude Code — BSV, Gemini images, design, and developer tooling." --tags "Claude, Plugins, DX"
bash scripts/work.sh add --title "MNEE" --desc "USD-backed stablecoin on Bitcoin. Production payments infrastructure." --tags "Stablecoin, BSV, Payments"
bash scripts/work.sh list
```

- [ ] **Step 2: Commit** (don't commit work.json — it's user data in .claude/persona/)

No commit needed — work.json is local persona data, not checked into the skill repo.

---

## Task 6: End-to-end test

- [ ] **Step 1: Full pipeline dry run**

```bash
# Ensure profile exists
bash scripts/capture.sh --username wildsatchmo

# Scan (uses cached if fresh)
bash scripts/scan.sh

# Generate draft
bash scripts/draft.sh --parts 3 --output /tmp/e2e-draft.json

# Verify output structure
jq '.thread | length' /tmp/e2e-draft.json  # should be 3
jq '.thread[0] | keys' /tmp/e2e-draft.json  # should have text, image_prompt
jq '.username' /tmp/e2e-draft.json  # should be "wildsatchmo"

# Preview
bun run scripts/playground.ts --data /tmp/e2e-draft.json --open
```

- [ ] **Step 2: Push all changes**

```bash
git push
```
