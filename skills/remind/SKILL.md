---
name: remind
version: 1.0.1
description: "Search and recall previous Claude Code conversation sessions. Use this skill whenever the user asks to remember, recall, find, or look up something from a past conversation or session. Triggers on phrases like: 'remember when we...', 'what did we do about...', 'find that conversation where...', 'when did I last work on...', 'what was that command/approach/solution we used for...', 'look up my past sessions about...'. Also use this skill when the user references prior work context that isn't in the current session, asks to continue work from a previous session, or wants to find a specific discussion, decision, or code snippet from their conversation history. Even vague references to past work ('that thing we did', 'the approach from last week') should trigger this skill."
---

# Remind

Recall and search previous Claude Code conversation sessions to find past discussions, decisions, solutions, and context.

## How It Works

This skill searches conversation history using two backends:

1. **Scribe DB** (preferred) — SQLite FTS5 full-text index at `~/.scribe/scribe.db` with 141K+ indexed messages across all AI coding tool sessions. BM25-ranked results, grouped by session.
2. **JSONL fallback** — Direct search through `~/.claude/projects/` JSONL conversation files when Scribe isn't available.

The search script at `scripts/search.py` handles both backends automatically.

## When to Use

- User asks about something from a previous conversation
- User wants to continue or reference prior work
- User asks "when did we..." or "remember when..."
- User needs to find a specific past decision, approach, or code snippet
- User wants to see what they worked on for a project/timeframe

## Workflow

### Step 1: Search

Run the search script with the user's query:

```bash
python3 "SKILL_DIR/scripts/search.py" "<query>" [options]
```

**Options:**
| Flag | Purpose |
|------|---------|
| `--project <path>` | Filter by project path (substring) |
| `--recent <days>` | Only search last N days |
| `--limit <n>` | Max results (default: 10) |
| `--full` | Force JSONL search (skip Scribe DB) |
| `--json` | Machine-readable output |
| `--session <id>` | Read a specific session's messages |
| `--recency-weight <f>` | Recency weight factor (default: 0.2) |
| `--half-life <days>` | Recency half-life in days (default: 30) |
| `--no-recency` | Disable recency weighting |

Results are ranked by a blend of BM25 relevance and recency. Recent conversations get a boost that decays exponentially (30-day half-life). Use `--no-recency` to disable.

**Crafting good queries:**
- Use 2-3 specific keywords, not full sentences
- Technical terms work best: `"stripe webhook"`, `"bap identity"`, `"deploy railway"`
- If too many results, add `--project` or `--recent` filters
- If too few results, try broader terms or `--full` for deeper search

### Step 2: Present Results

Summarize what you found in a clear format:
- Which sessions matched and when they occurred
- What project each session was in
- Key snippets showing the relevant context
- Offer to dive deeper into specific sessions

### Step 3: Deep Dive (if needed)

If the user wants more detail from a specific session:

```bash
python3 "SKILL_DIR/scripts/search.py" --session <session-id> --json
```

This returns the full conversation transcript. Summarize the relevant portions — don't dump the whole thing.

### Step 4: Read Raw JSONL (last resort)

If neither search backend returns results, you can read the JSONL files directly:

```bash
# List all project directories
ls ~/.claude/projects/

# List sessions in a specific project
ls ~/.claude/projects/-Users-satchmo-code-myapp/*.jsonl

# The JSONL format has one JSON object per line with these types:
#   user    — message.content is the user's input
#   assistant — message.content is Claude's response (array of text/tool_use blocks)
#   progress — tool execution progress
#   system   — system messages
```

Session index files (where available) provide quick metadata:
```bash
# Check for pre-built session index
cat ~/.claude/projects/<project-dir>/sessions-index.json
# Contains: sessionId, firstPrompt, summary, created, modified, gitBranch, messageCount
```

## Tips

- **Scribe reindex**: If Scribe DB exists but results seem stale, the user can rescan with `cd ~/code/scribe && bun run packages/cli/src/index.ts scan chat --provider claude`
- **Cross-project**: Searches span all projects by default. Use `--project` to narrow.
- **Session IDs**: These are UUIDs like `69ad65a8-7499-4fd1-9bae-a3f0fcbb11ed`. When presenting results, include session IDs so the user can ask for deep dives.
- **Privacy**: Conversation data stays local. Never output sensitive content (keys, tokens) from search results.
