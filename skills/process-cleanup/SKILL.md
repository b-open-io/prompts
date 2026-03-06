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

Run these commands to build a complete picture. All three are needed — each reveals different context.

### 1. Process snapshot

```bash
ps -eo pid,ppid,rss,%cpu,lstart,tty,command -m | head -100
```

This gives top 100 processes by memory with start times, TTY (which terminal), and full commands.

### 2. Listening ports (dev servers)

```bash
lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep -v "^COMMAND"
```

Maps PIDs to ports — critical for identifying dev servers and what they serve.

### 3. Working directories (project context)

```bash
lsof -c node -c bun -c next -c python -c ruby -a -d cwd 2>/dev/null
```

Shows which project directory each process is serving. "Next.js dev → bopen-ai" is far more useful than "node next dev".

### 4. Identify yourself

```bash
echo "My PID: $$, Parent: $PPID"
```

Never recommend killing your own process tree.

## Analysis

### Friendly Names

Raw command lines are unreadable. Map them to names humans recognize:

| Pattern in command | Friendly name |
|---|---|
| `claude` (bare or `-c`) | Claude Code — {project from cwd or tty} |
| `claude --resume` | Claude Code (resumed session, likely stale) |
| `claude.*--claude-in-chrome` | Claude Chrome bridge |
| `opencode` | OpenCode session |
| `codex` | Codex app |
| `next dev` or `next-router-worker` | Next.js dev → {project} |
| `bun dev` | Bun dev → {project} |
| `vite` | Vite dev → {project} |
| `convex dev` | Convex dev → {project} |
| `portless` | Portless proxy → {project} |
| `turso` | Turso DB |
| `postgres` | PostgreSQL |
| `redis-server` | Redis |
| `mongod` | MongoDB |
| `node.*webpack\|esbuild\|turbopack` | Bundler watcher |
| `tsc.*--watch` | TypeScript watcher |
| `Google Chrome Helper` | Chrome (group all, sum memory) |
| `Dia.*Helper` | Dia browser (group all) |
| `Wispr Flow` | Wispr Flow voice (group all) |
| `iTerm2` | iTerm terminal |
| `Electron\|Helper (Renderer)` | Derive app name from path |

For anything else, extract the app name from the binary path. `/Applications/Foo.app/Contents/...` → "Foo".

Derive the project name from `lsof` cwd data or from the command args (look for paths like `/Users/.../code/project-name`).

### Waste Score (0-100)

Score each process (or process group) on three axes:

**Resources (0-40)**: Based on RSS memory
- Under 100 MB: 0-5
- 100-500 MB: 5-15
- 500 MB - 1 GB: 15-25
- 1-2 GB: 25-35
- Over 2 GB: 35-40

**Staleness (0-40)**: Based on how long it's been running. Parse the `lstart` column to calculate age.
- Under 1 hour: 0
- 1-24 hours: 5-10
- 1-3 days: 10-20
- 3-7 days: 20-30
- Over 7 days: 30-40

**Replaceability (0-20)**: How easy is it to restart?
- Trivial to restart (AI CLIs, dev servers, watchers): 15-20
- Moderate (databases, long builds): 5-10
- Hard or risky (active user sessions, system services): 0-5

Total waste = resources + staleness + replaceability.

### Safety Classification

- **SAFE**: Stale AI CLI sessions (not the current one), old `--resume` sessions, dev servers for projects unrelated to the current working directory, orphaned watchers, zombie MCP helpers, duplicate processes
- **CAUTION**: Dev servers for nearby projects, databases, anything started today, anything the user might be actively using
- **PROTECTED**: Your own process tree (PID/PPID), system processes (owner is not the user), the user's active browser

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
