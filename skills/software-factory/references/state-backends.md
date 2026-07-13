# State Backends

State is what makes a loop *learn* instead of repeating the same mistake forever. Each pass the agent records what's done, what failed, and what's next, so tomorrow's run resumes instead of starting from zero. The hard rule: **state lives outside the context window** — in tickets, files, and git — and must be readable by a cold-start agent, because each iteration gets a fresh context window.

In the two-loop architecture, the state backend is also the **seam** between the discovery loop (which writes tickets) and the execution loop (which reads, works, and closes them). Pick one backend per project — ask the project.

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

## Option C — Repo vault  *(checked-in files, Obsidian-style)*

Zero external dependency; state is versioned with the code. Good for solo/early projects or when you want state diffable in PRs.

```
loop/
├── state.md            # Done / Failed / Next / Decisions — the live ledger
├── specs/*.md          # one concern per file, re-injected each iteration
└── findings/*.md       # discovery output before promotion to Next
```

- `state.md` is the cold-start entry point — the first thing each iteration reads.
- Commit the state file each pass so git history *is* the audit trail.
- This mirrors the Ralph pattern (`IMPLEMENTATION_PLAN.md` + `specs/`) and `superpowers` progress ledgers.

## Choosing

| Want… | Use |
|---|---|
| Internal work, team visibility, status tracking | Linear |
| OSS / hand-off to others / no Linear account | GitHub Issues |
| Solo, early-stage, state-in-PR, zero deps | Repo vault |

All three satisfy the same contract; the loop config records which one this project uses so every iteration reads the right place.
