---
name: notebooklm
version: 1.0.0
description: Detailed API reference for all notebooklm scripts
---

# API Reference

## Authentication Manager (`auth_manager.py`)

### Commands

#### `setup`
Initial authentication with visible browser.

```bash
python scripts/run.py auth_manager.py setup
```

**Behavior:**
- Opens visible Chrome window
- Navigates to Google login
- User manually completes authentication
- Saves session state for future use

**Output:**
```
✓ Authentication successful
  Session saved to ~/.claude/skills/notebooklm/data/browser_state/
```

#### `status`
Check current authentication state.

```bash
python scripts/run.py auth_manager.py status
```

**Output (authenticated):**
```
✓ Authenticated as user@example.com
  Session valid until: 2024-01-15
```

**Output (not authenticated):**
```
✗ Not authenticated
  Run: python scripts/run.py auth_manager.py setup
```

#### `reauth`
Force re-authentication.

```bash
python scripts/run.py auth_manager.py reauth
```

**Use when:**
- Session expired
- Authentication errors persist
- Switching Google accounts

#### `clear`
Remove all authentication data.

```bash
python scripts/run.py auth_manager.py clear
```

---

## Notebook Manager (`notebook_manager.py`)

### Commands

#### `add`
Add notebook to library.

```bash
python scripts/run.py notebook_manager.py add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "API Documentation" \
  --description "Complete REST API docs for v2.0" \
  --topics "api,rest,documentation"
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--url` | Yes | Full NotebookLM URL |
| `--name` | Yes | Short descriptive name |
| `--description` | Yes | Detailed content description |
| `--topics` | Yes | Comma-separated topic tags |

**Output:**
```
✓ Notebook added
  ID: nb_abc123
  Name: API Documentation
  Topics: api, rest, documentation
```

#### `list`
Display all notebooks in library.

```bash
python scripts/run.py notebook_manager.py list
```

**Output:**
```
Your Notebook Library:

1. API Documentation (nb_abc123)
   Topics: api, rest, documentation
   Added: 2024-01-10

2. Product Specs (nb_def456)
   Topics: product, roadmap
   Active: ✓
```

#### `search`
Find notebooks by topic or keyword.

```bash
python scripts/run.py notebook_manager.py search --query "api"
```

**Output:**
```
Matching notebooks:

1. API Documentation (nb_abc123)
   Topics: api, rest, documentation
```

#### `activate`
Set default notebook for queries.

```bash
python scripts/run.py notebook_manager.py activate --id nb_abc123
```

**Output:**
```
✓ Active notebook set: API Documentation (nb_abc123)
```

#### `remove`
Delete notebook from library.

```bash
python scripts/run.py notebook_manager.py remove --id nb_abc123
```

**Output:**
```
✓ Notebook removed: API Documentation
```

#### `stats`
Show library statistics.

```bash
python scripts/run.py notebook_manager.py stats
```

**Output:**
```
Library Statistics:
  Total notebooks: 5
  Topics covered: 12
  Last added: 2024-01-10
```

---

## Question Interface (`ask_question.py`)

### Basic Query

```bash
python scripts/run.py ask_question.py \
  --question "What are the authentication methods?"
```

### Query Specific Notebook

```bash
python scripts/run.py ask_question.py \
  --question "What are the authentication methods?" \
  --notebook-id nb_abc123
```

### Query by URL

```bash
python scripts/run.py ask_question.py \
  --question "What are the authentication methods?" \
  --notebook-url "https://notebooklm.google.com/notebook/..."
```

### Debug Mode

```bash
python scripts/run.py ask_question.py \
  --question "What are the authentication methods?" \
  --show-browser
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `--question` | Yes | Question to ask |
| `--notebook-id` | No* | Notebook ID from library |
| `--notebook-url` | No* | Direct notebook URL |
| `--show-browser` | No | Show browser window |

*One of `--notebook-id` or `--notebook-url` required if no active notebook set

**Output:**
```
Question: What are the authentication methods?

Answer:
According to the API documentation, there are three authentication methods:

1. API Key (simplest, for server-to-server)
2. OAuth 2.0 (for user-facing applications)
3. JWT Tokens (for internal microservices)

EXTREMELY IMPORTANT: Is that ALL you need to know?
```

---

## Cleanup Manager (`cleanup_manager.py`)

### Preview Cleanup

```bash
python scripts/run.py cleanup_manager.py
```

**Output:**
```
Cleanup Preview:
  Browser cache: 150MB
  Old transcripts: 12 files
  Temp files: 5 files

Run with --confirm to execute cleanup
```

### Execute Cleanup

```bash
python scripts/run.py cleanup_manager.py --confirm
```

### Preserve Library

```bash
python scripts/run.py cleanup_manager.py --preserve-library
```

**Keeps:**
- Notebook metadata
- Authentication state
- Removes: Cache, temp files, old transcripts

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication required |
| 3 | Notebook not found |
| 4 | Network error |
| 5 | Rate limit exceeded |

---

## Data File Structure

### `~/.claude/skills/notebooklm/data/library.json`

```json
{
  "notebooks": [
    {
      "id": "nb_abc123",
      "name": "API Documentation",
      "description": "Complete REST API docs for v2.0",
      "topics": ["api", "rest", "documentation"],
      "url": "https://notebooklm.google.com/notebook/...",
      "added_at": "2024-01-10T12:00:00Z",
      "last_accessed": "2024-01-15T08:30:00Z"
    }
  ],
  "active_notebook_id": "nb_abc123",
  "version": "1.0.0"
}
```

### `~/.claude/skills/notebooklm/data/auth_info.json`

```json
{
  "authenticated": true,
  "email": "user@example.com",
  "session_expires": "2024-01-20T00:00:00Z",
  "last_verified": "2024-01-15T10:00:00Z"
}
```
