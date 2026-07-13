# Loop Engineering

A loop hands an agent a goal, a gate that proves the work is real, a memory of what it already tried, and a rule for when to stop — then runs the cycle on its own until the goal is met. This skill is how we design loops that hold up in production instead of quietly draining an account overnight.

## The gate is the whole thing

A check the model grades itself against will pass almost anything, because the model that wrote the work is a soft grader of its own homework. A real gate is a test, a type check, a build, or the running app being driven the way a person would drive it — something that can fail the work without asking the agent's permission first. Design that gate before you write a single line of the loop, because everything else is plumbing around it.

The failure this prevents has a name: the Ralph Wiggum loop, where the agent decides it's finished on a half-done job and the schedule keeps spending while producing nothing. A loop with a weak gate doesn't crash. It bills you in silence until someone notices the accept rate has quietly fallen through the floor.

## The five building blocks

| Block | What it does |
|---|---|
| **Heartbeat** | the trigger that runs the loop unattended — `/loop`, `/goal`, hooks, cron, GitHub Actions |
| **Skill** | reusable instructions the loop reads every pass, including a hard list of what it must never touch |
| **Sub-agents** | a fast cheap *maker* does the work; a slow strict *checker* reviews it |
| **Connectors** | let the loop act — open the PR, comment the ticket, ping the channel |
| **Verifier** | the gate that automatically rejects bad output |

## Worker types, one ticket queue

A loop *is* a factory worker with one specific job. Most real work runs an execution worker and a discovery worker in parallel, coordinated through a ticketing system that holds the state, plus a maintenance worker for recurring upkeep:

```
  DISCOVERY WORKER (free roam)          EXECUTION WORKER (systematic)
  roam the app like a human    files    pull an open ticket
  surface new anomalies       ──────▶   work it, gate it, close it
  dedup vs open tickets       tickets   (free-roam the fix to verify)
  file new tickets            ◀──────   reads
       PRODUCER                              CONSUMER
```

The discovery worker is its own skill, `free-roam-testing`. The execution worker runs through `subagent-driven-development` or, for a fleet, `wave-coordinator`. The maintenance worker handles recurring upkeep (dependency bumps, link checks, stale-ticket sweeps) on its own cadence — see `SKILL.md`'s "Maintenance workers & looptop" section, and watch any of them with `looptop`. Tickets are the memory that lets any worker resume tomorrow instead of starting cold, which is why the state backend (Linear, GitHub Issues, or a repo vault that's Obsidian-compatible) is a first-class design decision rather than an afterthought.

## When a loop is worth building

Build one only when all four hold. Miss a single box and a good one-shot prompt will serve you better:

1. The task repeats at least weekly, so the setup cost pays itself back.
2. Something can automatically reject bad output — a test, a build, a linter, a hard rule.
3. The agent can do the work end to end without handing half of it back.
4. "Done" is objective, so quality isn't left to taste.

## Blast radius decides autonomy

The reversibility of what a loop can do — not its accept rate — sets how much freedom it gets. A loop that's right 99% of the time still deletes the production table on the run where it's wrong. Reversible actions (reads, drafts, sandbox writes) can self-certify once the gate is green; irreversible ones (prod deploys, deletes, payments, pushing to main) stay human-approved every time regardless of track record. This same classifier governs what free roam may touch and whether a verification step needs cleanup.

## Build order

Prove it once by hand on a real case, watching the gate actually reject bad work. Harden it with stop conditions, a pre-flight budget breaker, and a state file. Only then wire the heartbeat and let it run unattended, because scheduling something you haven't proven reliable is how loops blow up while you sleep.

## What's in here

- `SKILL.md` — the working methodology the loop architect follows.
- `references/config-questionnaire.md` — the ten-field interview for initializing a loop in a project.
- `references/blast-radius.md` — the three autonomy tiers and the promotion protocol.
- `references/failure-modes.md` — ten ways loops fail quietly, each with its guard.
- `references/state-backends.md` — Linear, GitHub Issues, and repo-vault state, with the contract all three satisfy.

The `/factory-init` command runs the questionnaire and scaffolds a loop end to end. Satchmo (`agent-builder`) is the point person who owns loop design; Jason runs the gate, Wags owns the ticket state, Root wires the heartbeat, and Milton watches the cost per accepted change.
