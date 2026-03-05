#!/usr/bin/env python3
"""Search Claude Code conversation history.

Two search backends:
  1. Scribe DB (preferred) - Uses SQLite FTS5 index at ~/.scribe/scribe.db
  2. JSONL fallback - Direct grep through ~/.claude/projects/ JSONL files

Usage:
    python3 search.py <query> [options]

Options:
    --project <path>     Filter by project path (substring match)
    --limit <n>          Max results (default: 10)
    --recent <days>      Only search last N days
    --full               Force JSONL full-text search (skip Scribe DB)
    --context <n>        Show N surrounding messages for each match (default: 2)
    --json               Output as JSON
    --session <id>       Read a specific session by ID (prints full conversation)

Examples:
    python3 search.py "auth middleware"
    python3 search.py "stripe" --project /Users/me/code/myapp
    python3 search.py "deploy railway" --limit 5 --recent 7
    python3 search.py --session abc123-def456
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"
SCRIBE_DB = Path.home() / ".scribe" / "scribe.db"


# ─── Scribe DB Search (FTS5) ────────────────────────────────────────────────


def scribe_search(query, project_filter=None, recent_days=None, limit=10, context_messages=2):
    """Search using Scribe's SQLite FTS5 index. Returns grouped-by-session results."""
    if not SCRIBE_DB.exists():
        return None  # Signal to fall back

    try:
        conn = sqlite3.connect(str(SCRIBE_DB))
        conn.row_factory = sqlite3.Row
    except sqlite3.Error:
        return None

    try:
        # Build FTS query - wrap words in quotes for phrase-ish matching
        fts_terms = " OR ".join(f'"{w}"' for w in query.split())

        sql = """
            SELECT te.timestamp, te.content, te.external_thread_id as session_id,
                   te.external_message_id, te.event_type,
                   pr.path as project_path,
                   rank
            FROM timeline_events_fts fts
            JOIN timeline_events te ON te.rowid = fts.rowid
            LEFT JOIN project_roots pr ON te.project_root_id = pr.id
            WHERE timeline_events_fts MATCH ?
            AND te.source = 'claude'
        """
        params = [fts_terms]

        if project_filter:
            sql += " AND pr.path LIKE ?"
            params.append(f"%{project_filter}%")

        if recent_days:
            cutoff = int((datetime.now(timezone.utc) - timedelta(days=recent_days)).timestamp())
            sql += " AND te.timestamp >= ?"
            params.append(cutoff)

        sql += " ORDER BY te.timestamp DESC LIMIT ?"
        params.append(limit * 5)  # Fetch extra to group by session

        rows = conn.execute(sql, params).fetchall()

        # Group by session
        sessions = {}
        for row in rows:
            sid = row["session_id"] or "unknown"
            if sid not in sessions:
                sessions[sid] = {
                    "session_id": sid,
                    "project": row["project_path"] or "",
                    "matches": [],
                    "latest_timestamp": row["timestamp"],
                }
            sessions[sid]["matches"].append({
                "timestamp": row["timestamp"],
                "content": row["content"] or "",
                "rank": row["rank"],
            })

        # Sort sessions by latest match timestamp
        sorted_sessions = sorted(sessions.values(), key=lambda s: -s["latest_timestamp"])

        # For each session, fetch surrounding context from evidence_messages
        results = []
        for session in sorted_sessions[:limit]:
            sid = session["session_id"]

            # Get thread info
            thread = conn.execute("""
                SELECT title, workspace_path, started_at, ended_at
                FROM evidence_threads
                WHERE external_thread_id = ? AND provider_id = 'claude'
                LIMIT 1
            """, [sid]).fetchone()

            # Get first user message as summary
            first_msg = conn.execute("""
                SELECT content_text FROM evidence_messages
                WHERE thread_id IN (
                    SELECT id FROM evidence_threads
                    WHERE external_thread_id = ? AND provider_id = 'claude'
                )
                AND role = 'user'
                ORDER BY timestamp ASC
                LIMIT 1
            """, [sid]).fetchone()

            # Get matching snippets
            snippets = []
            for match in session["matches"][:3]:
                content = match["content"]
                if content:
                    # Clean up content for display
                    content = re.sub(r'<[^>]+>', '', content)  # Strip HTML/XML tags
                    content = re.sub(r'\x1b\[[0-9;]*m', '', content)  # Strip ANSI
                    content = content.strip()[:300]
                    if content:
                        snippets.append(content)

            date_str = datetime.fromtimestamp(session["latest_timestamp"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M")

            results.append({
                "session_id": sid,
                "project": session["project"],
                "date": date_str,
                "first_prompt": (first_msg["content_text"][:200] if first_msg else ""),
                "snippets": snippets,
                "match_count": len(session["matches"]),
            })

        conn.close()
        return results

    except sqlite3.Error as e:
        conn.close()
        print(f"Scribe DB error: {e}", file=sys.stderr)
        return None


def scribe_read_session(session_id, context_messages=None):
    """Read a full session from Scribe's evidence_messages table."""
    if not SCRIBE_DB.exists():
        return None

    try:
        conn = sqlite3.connect(str(SCRIBE_DB))
        conn.row_factory = sqlite3.Row

        messages = conn.execute("""
            SELECT em.role, em.content_text, em.timestamp, em.tool_name
            FROM evidence_messages em
            JOIN evidence_threads et ON em.thread_id = et.id
            WHERE et.external_thread_id = ? AND et.provider_id = 'claude'
            ORDER BY em.timestamp ASC
        """, [session_id]).fetchall()

        conn.close()

        if not messages:
            return None

        return [{
            "role": msg["role"],
            "text": msg["content_text"] or "",
            "timestamp": msg["timestamp"],
            "tool": msg["tool_name"],
        } for msg in messages if msg["content_text"]]

    except sqlite3.Error:
        return None


# ─── JSONL Fallback Search ───────────────────────────────────────────────────


def load_session_indexes():
    """Load all sessions-index.json files across projects."""
    entries = []
    for project_dir in CLAUDE_PROJECTS.iterdir():
        if not project_dir.is_dir():
            continue
        idx_file = project_dir / "sessions-index.json"
        if idx_file.exists():
            try:
                data = json.loads(idx_file.read_text())
                for entry in data.get("entries", []):
                    entry["_project_dir"] = str(project_dir)
                    entries.append(entry)
            except (json.JSONDecodeError, OSError):
                continue
    return entries


def extract_project_name(project_dir_name):
    """Convert directory name like -Users-satchmo-code-myapp to readable path."""
    parts = project_dir_name.lstrip("-").split("-")
    return "/" + "/".join(parts)


def search_indexes(query, project_filter=None, recent_days=None, limit=10):
    """Fast search: scan session index metadata (summaries + first prompts)."""
    entries = load_session_indexes()
    query_lower = query.lower()
    query_words = query_lower.split()
    results = []

    for entry in entries:
        if project_filter:
            pp = entry.get("projectPath", "")
            if project_filter not in pp:
                continue

        if recent_days:
            modified = entry.get("modified") or entry.get("created", "")
            if modified:
                try:
                    mod_dt = datetime.fromisoformat(modified.replace("Z", "+00:00"))
                    cutoff = datetime.now(timezone.utc) - timedelta(days=recent_days)
                    if mod_dt < cutoff:
                        continue
                except (ValueError, TypeError):
                    pass

        searchable = " ".join([
            entry.get("summary", ""),
            entry.get("firstPrompt", ""),
            entry.get("gitBranch", ""),
            entry.get("projectPath", ""),
        ]).lower()

        score = sum(1 for w in query_words if w in searchable)
        if score == 0:
            continue

        if query_lower in searchable:
            score += len(query_words)

        results.append((score, entry))

    results.sort(key=lambda x: (-x[0], x[1].get("modified", "")))
    return results[:limit]


def extract_messages_from_jsonl(jsonl_path):
    """Extract user and assistant text messages from a JSONL file."""
    messages = []
    try:
        with open(jsonl_path, "r") as f:
            for line in f:
                try:
                    obj = json.loads(line.strip())
                except json.JSONDecodeError:
                    continue

                msg_type = obj.get("type", "")
                if msg_type not in ("user", "assistant"):
                    continue

                msg = obj.get("message", {})
                content = msg.get("content", "")
                text = ""

                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    text_parts = []
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            text_parts.append(block.get("text", ""))
                    text = "\n".join(text_parts)

                if text and len(text) > 5:
                    if text.strip().startswith("<system-reminder>"):
                        continue
                    messages.append({
                        "role": msg_type,
                        "text": text,
                        "timestamp": obj.get("timestamp", ""),
                    })
    except OSError:
        pass
    return messages


def search_jsonl_full(query, project_filter=None, recent_days=None, limit=10):
    """Deep search: scan actual JSONL conversation content."""
    query_lower = query.lower()
    query_words = query_lower.split()
    results = []

    for project_dir in CLAUDE_PROJECTS.iterdir():
        if not project_dir.is_dir():
            continue

        if project_filter:
            proj_name = extract_project_name(project_dir.name)
            if project_filter not in proj_name:
                continue

        for jsonl_file in project_dir.glob("*.jsonl"):
            if recent_days:
                mtime = datetime.fromtimestamp(jsonl_file.stat().st_mtime, tz=timezone.utc)
                cutoff = datetime.now(timezone.utc) - timedelta(days=recent_days)
                if mtime < cutoff:
                    continue

            session_id = jsonl_file.stem
            messages = extract_messages_from_jsonl(str(jsonl_file))
            if not messages:
                continue

            matching_snippets = []
            best_score = 0

            for msg in messages:
                text_lower = msg["text"].lower()
                score = sum(1 for w in query_words if w in text_lower)
                if score == 0:
                    continue

                if query_lower in text_lower:
                    score += len(query_words)

                if score > best_score:
                    best_score = score

                idx = text_lower.find(query_words[0])
                if idx >= 0:
                    start = max(0, idx - 80)
                    end = min(len(msg["text"]), idx + len(query_words[0]) + 120)
                    snippet = msg["text"][start:end].strip()
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(msg["text"]):
                        snippet = snippet + "..."
                    matching_snippets.append({
                        "role": msg["role"],
                        "snippet": snippet,
                    })

            if best_score > 0:
                first_user = next((m for m in messages if m["role"] == "user"), None)
                results.append({
                    "score": best_score,
                    "session_id": session_id,
                    "project": extract_project_name(project_dir.name),
                    "first_prompt": (first_user["text"][:200] if first_user else ""),
                    "message_count": len(messages),
                    "snippets": [s["snippet"] for s in matching_snippets[:3]],
                    "modified": jsonl_file.stat().st_mtime,
                })

    results.sort(key=lambda x: (-x["score"], -x.get("modified", 0)))
    return results[:limit]


def read_session_jsonl(session_id):
    """Find and read a session by ID from JSONL files."""
    for project_dir in CLAUDE_PROJECTS.iterdir():
        if not project_dir.is_dir():
            continue
        jsonl_file = project_dir / f"{session_id}.jsonl"
        if jsonl_file.exists():
            return extract_messages_from_jsonl(str(jsonl_file))
    return None


# ─── Output Formatting ───────────────────────────────────────────────────────


def format_results(results, source="scribe"):
    """Format search results for display."""
    if not results:
        print("No matching sessions found.")
        return

    print(f"Found {len(results)} matching session(s):\n")
    for i, r in enumerate(results, 1):
        project = r.get("project", "")
        date = r.get("date", "")
        first_prompt = r.get("first_prompt", "")
        session_id = r.get("session_id", "")
        match_count = r.get("match_count", len(r.get("snippets", [])))

        print(f"── [{i}] {project or 'Unknown project'}")
        if date:
            print(f"   Date:     {date}  ({match_count} matches)")
        if first_prompt:
            display = first_prompt[:180]
            if len(first_prompt) > 180:
                display += "..."
            print(f"   Prompt:   {display}")
        print(f"   Session:  {session_id}")

        snippets = r.get("snippets", [])
        if snippets:
            print(f"   Matches:")
            for s in snippets[:3]:
                snippet = s if isinstance(s, str) else s.get("snippet", "")
                snippet = snippet.replace("\n", " ")[:200]
                print(f"     > {snippet}")
        print()


def format_session(messages):
    """Format a full session for display."""
    if not messages:
        print("Session not found or empty.")
        return

    print(f"Session: {len(messages)} messages\n")
    for msg in messages:
        role = msg["role"].upper()
        text = msg["text"]
        # Truncate very long messages
        if len(text) > 500:
            text = text[:500] + f"... [{len(text)} chars total]"
        text = text.replace("\n", "\n   ")
        print(f"[{role}] {text}")
        print()


# ─── Main ────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Search Claude Code conversation history")
    parser.add_argument("query", nargs="?", help="Search query (words or phrase)")
    parser.add_argument("--project", help="Filter by project path (substring match)")
    parser.add_argument("--limit", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--full", action="store_true", help="Force JSONL full-text search (skip Scribe)")
    parser.add_argument("--recent", type=int, help="Only search sessions from last N days")
    parser.add_argument("--context", type=int, default=2, help="Surrounding messages to show")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--session", help="Read a specific session by ID")
    args = parser.parse_args()

    # Session read mode
    if args.session:
        messages = scribe_read_session(args.session) or read_session_jsonl(args.session)
        if args.json:
            print(json.dumps(messages or [], indent=2, default=str))
        else:
            format_session(messages)
        return

    if not args.query:
        parser.error("query is required (unless using --session)")

    # Search mode
    results = None

    if not args.full:
        # Try Scribe DB first
        results = scribe_search(
            args.query,
            project_filter=args.project,
            recent_days=args.recent,
            limit=args.limit,
        )
        if results is not None:
            if not args.json:
                print("[Scribe FTS5 index]\n")

    if results is None:
        # Fall back to JSONL search
        if not args.json:
            print("[JSONL direct search]\n")
        results = search_jsonl_full(
            args.query,
            project_filter=args.project,
            recent_days=args.recent,
            limit=args.limit,
        )

    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        format_results(results)


if __name__ == "__main__":
    main()
