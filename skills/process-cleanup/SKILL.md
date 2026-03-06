---
name: process-cleanup
description: "Finds stale and resource-hungry processes, scores them by waste, and presents a cleanup report with friendly names. Use this skill when the user says 'what's eating my RAM', 'kill stale processes', 'clean up my machine', 'free up memory', 'my computer is slow', 'what's running', 'too many things open', or asks to find/kill background processes. Also use proactively when you notice sluggishness, process spawn failures, or many duplicate processes during normal work."
user-invocable: false
allowed-tools:
  - Bash
---

# Process Cleanup

Autonomously investigate running processes, score them by waste (resources x staleness), and produce a categorized report with friendly names and ready-to-use kill commands.

This skill runs without user interaction. Gather everything, analyze, score, and present the full report. The user decides what to kill after reading it.

## Investigation

Run the bundled script — it handles all data collection, scoring, and safety classification in one pass:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/process-cleanup/scripts/cleanup-report.sh
```

The script outputs structured JSON to stdout (progress messages go to stderr). Parse the JSON to build your report.

### What the script collects

- Process snapshot (`ps -eo pid,ppid,rss,%cpu,lstart,tty,command`)
- Listening ports (`lsof -iTCP -sTCP:LISTEN`)
- Working directories (`lsof -c node -c bun -c next -c python -c ruby -a -d cwd`)
- Your own PID/PPID (never kills its own process tree)

### Script output shape

```json
{
  "my_pid": 12345,
  "total_recoverable_mb": 4300,
  "safe": [{"pid": 38585, "name": "Claude Code (resumed session, likely stale)", "memory_mb": 4300, "age_hours": 456, "score": 92, "port": null}],
  "caution": [{"pid": 28755, "name": "Next.js dev -> agentcraft", "memory_mb": 156, "age_hours": 48, "score": 45, "port": "3000"}],
  "protected": [{"pid": 76187, "name": "Claude Code -> prompts", "memory_mb": 553, "age_hours": 1, "score": 21, "port": null}],
  "kill_command": "kill 38585 ..."
}
```

The `score` field is already computed (0-100, resources + staleness + replaceability). Use it directly for sorting.

### Friendly names reference

The script applies these mappings automatically. This table is for your reference when the script output looks unexpected:

| Pattern in command | Friendly name |
|---|---|
| `claude` (bare or `-c`) | Claude Code -> {project} |
| `claude --resume` | Claude Code (resumed session, likely stale) |
| `claude.*--claude-in-chrome` | Claude Chrome bridge |
| `opencode` | OpenCode session |
| `codex` | Codex app |
| `next dev` or `next-router-worker` | Next.js dev -> {project} |
| `bun dev` | Bun dev -> {project} |
| `vite` | Vite dev -> {project} |
| `convex dev` | Convex dev -> {project} |
| `portless` | Portless proxy -> {project} |
| `turso` | Turso DB |
| `postgres` | PostgreSQL |
| `redis-server` | Redis |
| `mongod` | MongoDB |
| `node.*webpack\|esbuild\|turbopack` | Bundler watcher |
| `tsc.*--watch` | TypeScript watcher |
| `Google Chrome Helper` | Chrome (renderer) |
| `Dia.*Helper` | Dia browser (renderer) |
| `Wispr Flow` | Wispr Flow voice |
| `iTerm2` | iTerm terminal |
| `Electron\|Helper (Renderer)` | Derive app name from path |

## Output Format

Present findings as a single report. Sort by waste score descending within each safety tier.

```
## Process Cleanup Report

**Total recoverable**: ~X.X GB across N processes

### SAFE TO KILL (X.X GB)

| Score | Process                        | Memory  | Age      | PID   |
|-------|--------------------------------|---------|----------|-------|
|  92   | Claude Code (Feb 14, stale)    | 4.3 GB  | 19 days  | 38585 |
|  78   | OpenCode (x15 sessions)        | 1.3 GB  | 25-31 d  | ...   |

### USE CAUTION (X.X GB)

| Score | Process                        | Memory  | Age      | PID   |
|-------|--------------------------------|---------|----------|-------|
|  45   | Next.js dev → agentcraft       | 156 MB  | 2 days   | 28755 |

### PROTECTED
- This Claude session — 553 MB — PID 76187
- Chrome (47 tabs) — 2.9 GB
- iTerm2 — 264 MB
```

Rules for the report:
- Memory in MB or GB, never KB
- Age as "3 days", "2 hours", "19 days" — never raw timestamps
- Group related processes (show "OpenCode (x15)" not 15 rows)
- Include port numbers for dev servers when available (e.g., "Next.js dev → bopen-ai :3000")
- Show total recoverable memory at the top

End with kill commands:

```bash
# SAFE — reclaim ~X.X GB
kill PID1 PID2 PID3

# CAUTION — review first:
# kill PID4  # Next.js dev → agentcraft :3000 (156 MB)
```

Then state what you recommend and let the user decide.
