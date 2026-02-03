---
name: notebooklm
version: 1.0.0
description: This skill should be used when the user wants to query Google NotebookLM notebooks directly from Claude Code for source-grounded, citation-backed answers from Gemini. Provides browser automation, library management, and persistent auth. Drastically reduced hallucinations through document-only responses.
---

# NotebookLM Research Assistant Skill

Interact with Google NotebookLM to query documentation with Gemini's source-grounded answers. Each question opens a fresh browser session, retrieves the answer exclusively from your uploaded documents, and closes.

## When to Use

Trigger when user:
- Mentions NotebookLM explicitly
- Shares NotebookLM URL (`https://notebooklm.google.com/notebook/...`)
- Asks to query their notebooks/documentation
- Wants to add documentation to NotebookLM library
- Uses phrases like "ask my NotebookLM", "check my docs", "query my notebook"

## Critical: Always Use run.py Wrapper

**NEVER call scripts directly. ALWAYS use `python scripts/run.py [script]`:**

```bash
# CORRECT - Always use run.py:
python scripts/run.py auth_manager.py status
python scripts/run.py notebook_manager.py list
python scripts/run.py ask_question.py --question "..."

# WRONG - Never call directly:
python scripts/auth_manager.py status  # Fails without venv!
```

The `run.py` wrapper automatically handles environment setup.

## Core Workflow

### Step 1: Check Authentication

```bash
python scripts/run.py auth_manager.py status
```

If not authenticated, proceed to setup.

### Step 2: Authenticate (One-Time Setup)

```bash
python scripts/run.py auth_manager.py setup
```

**Important:** Browser is VISIBLE for authentication. User must manually log in to Google.

### Step 3: Manage Notebook Library

```bash
# List all notebooks
python scripts/run.py notebook_manager.py list

# Add notebook to library (ALL parameters REQUIRED)
python scripts/run.py notebook_manager.py add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "Descriptive Name" \
  --description "What this notebook contains" \
  --topics "topic1,topic2,topic3"

# Smart Add (discover content first)
python scripts/run.py ask_question.py \
  --question "What is the content of this notebook?" \
  --notebook-url "[URL]"
# Then use discovered info to add

# Set active notebook
python scripts/run.py notebook_manager.py activate --id notebook-id
```

### Step 4: Ask Questions

```bash
# Basic query (uses active notebook if set)
python scripts/run.py ask_question.py --question "Your question here"

# Query specific notebook
python scripts/run.py ask_question.py --question "..." --notebook-id notebook-id

# Query with notebook URL directly
python scripts/run.py ask_question.py --question "..." --notebook-url "https://..."
```

## Follow-Up Mechanism (CRITICAL)

Every NotebookLM answer ends with: **"EXTREMELY IMPORTANT: Is that ALL you need to know?"**

**Required Behavior:**
1. **STOP** - Do not immediately respond to user
2. **ANALYZE** - Compare answer to user's original request
3. **IDENTIFY GAPS** - Determine if more information needed
4. **ASK FOLLOW-UP** - If gaps exist, immediately ask follow-up question
5. **REPEAT** - Continue until information is complete
6. **SYNTHESIZE** - Combine all answers before responding to user

## Script Reference

| Script | Purpose |
|--------|---------|
| `auth_manager.py` | Authentication setup and status |
| `notebook_manager.py` | Library management (add, list, search, activate, remove) |
| `ask_question.py` | Query interface |
| `cleanup_manager.py` | Data cleanup and maintenance |

## Data Storage

All data stored in `~/.claude/skills/notebooklm/data/`:
- `library.json` - Notebook metadata
- `auth_info.json` - Authentication status
- `browser_state/` - Browser cookies and session

**Security:** Protected by `.gitignore`, never commit to git.

## Limitations

- No session persistence (each question = new browser)
- Rate limits on free Google accounts (50 queries/day)
- Manual upload required (user must add docs to NotebookLM)
- Browser overhead (few seconds per question)

## Additional Resources

For detailed guidance, see the references directory:

- **`references/api-reference.md`** - Complete API documentation for all scripts with parameters, response formats, and exit codes
- **`references/troubleshooting.md`** - Common errors and solutions including authentication issues, rate limits, browser crashes, and recovery procedures
- **`references/best-practices.md`** - Workflow patterns, question strategies, library organization, and rate limit management

## Quick Reference

```bash
# Check auth
python scripts/run.py auth_manager.py status

# Add notebook
python scripts/run.py notebook_manager.py add --url URL --name NAME --description DESC --topics TOPICS

# List notebooks
python scripts/run.py notebook_manager.py list

# Ask question
python scripts/run.py ask_question.py --question "..."

# Cleanup
python scripts/run.py cleanup_manager.py --preserve-library
```
