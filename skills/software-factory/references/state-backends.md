# State Backends

State is what makes a loop *learn* instead of repeating the same mistake forever. Each pass the agent records what's done, what failed, and what's next, so tomorrow's run resumes instead of starting from zero. The hard rule: **state lives outside the context window** — in tickets, files, and git — and must be readable by a cold-start agent, because each iteration gets a fresh context window.

In the worker architecture, the state backend is also the **seam** between the discovery worker (which writes tickets) and the execution worker (which reads, works, and closes them). Pick one backend per project — ask the project.

## The state-file contract

Whatever the backend, every loop needs a durable record answering:

- **Done** — what's completed (and the evidence/gate result that accepted it)
- **Failed** — what was tried and rejected, so it isn't retried blindly
- **Next** — the prioritized open work
- **Decisions** — cap changes, promotions, and why (auditable self-improvement)

## Option A — Linear  *(our default for internal work)*

We're Linear-native: `linear-sync`, the `OPL-####` convention, MCP wired.

- Discovery files findings as issues (`save_issue`); execution lists open issues, works them, comments results, closes them.
- Each iteration: `list_issues` (state: open) → dedup against existing → work → `save_comment` with the gate result → close or re-prioritize.
- Use `Skill(bopen-tools:linear-planning)` to write agent-ready tickets (What / Why / Where / How / Done-when).
- **Caveat:** only the main session has MCP access — subagents can't call Linear MCP. Have subagents return structured findings; the main session writes them.

## Option B — GitHub Issues  *(universal / OSS-friendly)*

Works anywhere `git` + `gh` exist; no Linear account needed. Best for projects shipped to others.

```bash
gh issue list --state open --label loop          # read state
gh issue create --title "..." --body "..." --label loop,discovery
gh issue comment <n> --body "gate: PASS — <evidence>"
gh issue close <n>
```

- Label convention keeps loop tickets separate (`loop`, `discovery`, `execution`).
- Dedup by searching open issues before creating (`gh issue list --search`).

## Option C — Repo vault (Obsidian-compatible)

Zero external dependency; state is versioned with the code, and — because it follows Obsidian's own conventions — the same folder opens as a browsable, linked knowledge base if anyone points Obsidian at the repo. Good for solo/early projects or when you want state diffable in PRs.

```
loop/
├── state.md            # Done / Failed / Next / Decisions — the live ledger
├── tickets/*.md         # one ticket per file, frontmatter-first
├── specs/*.md           # one concern per file, re-injected each iteration
└── findings/*.md        # discovery output before promotion to Next
```

The conventions that make it Obsidian-compatible without requiring Obsidian:

- **Frontmatter-first task files** — every machine-readable field a loop needs to query (`status`, `priority`, `assignee`, dedup keys) lives in the YAML frontmatter; prose (the description, the repro, the discussion) lives in the body. A cold-start agent greps frontmatter for state and reads the body for context — it never has to parse prose to find a status.
- **Thin category-index notes** — an index note (e.g. `tickets/open.md`) embeds a query over the frontmatter (`dataview`-style or a plain script) instead of being a hand-edited ledger someone forgets to update. The index is generated, not maintained.
- **Wikilink-style relations** — `[[ticket-042]]` style links between tickets, specs, and findings instead of ad hoc path references, so relations survive renames and render as a graph if opened in Obsidian.
- **Zero required plugins** — every convention above is plain markdown + YAML. Nothing here requires Obsidian to be installed; agents read and write the same files with `Read`/`Write`/`grep`.

**The honest verdict:** Obsidian is a knowledge system, not a ticketing system. It has no native states, no dedup queries, no claiming, and no API — dataview-style embeds simulate a query but don't enforce a schema, and there's nothing to stop two workers from writing the same file at once. The Local REST API community plugin is an opt-in enhancement for programmatic access; never make it required, since that reintroduces an external dependency this option exists to avoid. Concurrency is last-write-wins at the vault level, so multi-worker claiming must not rely on vault trust — use git's atomicity instead: a worker claims a ticket by committing a claim file (or a frontmatter field flip) and treats a failed/conflicting commit as "already claimed, retry elsewhere."

**Detection, for cross-reference:** Obsidian keeps a registry of known vaults at `~/Library/Application Support/obsidian/obsidian.json` (macOS) or `~/.config/obsidian/obsidian.json` (Linux); a folder is a vault the moment it contains a `.obsidian/` directory, registered or not.

- `state.md` is the cold-start entry point — the first thing each iteration reads.
- Commit the state file each pass so git history *is* the audit trail.
- This mirrors the Ralph pattern (`IMPLEMENTATION_PLAN.md` + `specs/`) and `superpowers` progress ledgers.

## Choosing

The setup wizard offers exactly three options — **Linear / GitHub Issues / Repo vault (Obsidian-compatible)** — and Linear stays the default recommendation for multi-worker factories (native MCP, no polling, team visibility for free).

| Want… | Use |
|---|---|
| Internal work, team visibility, status tracking, multiple workers | Linear (default) |
| OSS / hand-off to others / no Linear account | GitHub Issues |
| Solo, early-stage, state-in-PR, zero deps, browsable in Obsidian | Repo vault (Obsidian-compatible) |

All three satisfy the same contract; the loop config records which one this project uses so every iteration reads the right place.
