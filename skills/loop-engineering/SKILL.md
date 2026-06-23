---
name: loop-engineering
version: 0.0.1
description: Use this skill whenever designing, configuring, or hardening an autonomous agent "loop" — a goal an agent iterates toward on its own with a real verification gate, persistent state, and a stop condition. Invoke it when the user mentions "build a loop", "agentic loop", "self-iterating agent", "run this on a schedule/cron", "/loop or /goal", "Ralph loop", "maker-checker", "fleet of agents", "autonomous workflow", or wants an agent to keep working a goal unattended until it's verifiably done. Also use when scoping whether a loop is even worth building, when picking a verification gate, when deciding what a loop is allowed to touch (blast radius), or when a loop is burning tokens without producing accepted work.
---

# Loop Engineering

A **prompt** hands an agent one instruction and waits for you. A **loop** hands the agent a job, a way to know when the job is done, and a rule for when to give up — then runs the full cycle on its own until the goal is met. This skill is how we design loops that survive production instead of billing you in silence.

The single most important idea: **the gate is the loop.** Without a real, automated check on the result, you don't have a loop — you have an agent agreeing with itself on repeat. Everything else (scheduling, sub-agents, connectors) is plumbing around that one load-bearing part. Design the gate first.

## The five building blocks

Every production loop is assembled from these five. Claude Code ships all of them.

| Block | What it is | Our tooling |
|---|---|---|
| **1. Heartbeat** | the trigger that makes it a loop, not a one-off: schedule + goal | `/loop`, `/goal`, hooks, `CronCreate`, `ScheduleWakeup`, GitHub Actions |
| **2. Skill** | reusable instructions the loop reads each pass (rules + a *never-touch* list) | this skill + the project's loop config |
| **3. Sub-agents** | split the **maker** (does the work) from the **checker** (verifies it) | `hunter-skeptic-referee`, `code-auditor`, `tester` |
| **4. Connectors** | let the loop *act* — open the PR, comment the ticket, ping the channel | Linear MCP, `gh`, `resend`, `devops` |
| **5. Verifier (the gate)** | the test/typecheck/build/exercise that automatically **rejects** bad output | `tester` (Jason) — owns running it |

The maker is too generous grading its own homework, so block 3 (a separate, often stronger checker) plus block 5 (an objective gate) is *most of the quality*. Make the maker fast and cheap; make the checker slow and strict.

## Two loop types — coordinated through tickets

Most real work needs **both**, running in parallel, with the ticketing system (the State block) as the seam between them. This is a producer/consumer architecture: discovery produces work, execution consumes it.

```
   DISCOVERY LOOP  (free roam)              EXECUTION LOOP  (systematic)
   ┌───────────────────────────┐           ┌───────────────────────────┐
   │ roam the app like a human │  files    │ pull an open ticket       │
   │ randomized human-like     │  tickets  │ work it end-to-end        │
   │ paths, weird inputs       │ ────────▶ │ verify at the gate        │
   │ surface anomalies         │  TICKETS  │ close the ticket          │
   │ dedup vs OPEN tickets     │ ◀──────── │ (free-roam the fixed area │
   │ file NEW tickets          │  reads    │  as the top verify rung)  │
   └───────────────────────────┘           └───────────────────────────┘
        PRODUCER                                CONSUMER
```

- **Execution loop** — the classic loop: take a ticket, work it, gate it, close it. Run via `Skill(superpowers:subagent-driven-development)` or a fleet via `Skill(bopen-tools:wave-coordinator)`.
- **Discovery loop** — exploratory free-roam testing that *surfaces new work* the execution loop then tackles systematically. Owned by `Skill(bopen-tools:free-roam-testing)`.

The dedup-vs-open-tickets step is what stops discovery from re-filing the same issue every pass. Always read open tickets before filing new ones.

## Do you even need a loop?

Loops are real, but most tasks don't need the heavy version. Build one **only when all four are true** — miss one box and keep it a manual prompt:

1. **The task repeats** (at least weekly). Below that, setup never pays itself back.
2. **Something can automatically reject bad output** — a test, typecheck, build, linter, or hard rule. No gate ⇒ the loop just spins.
3. **The agent can do the work end-to-end** without handing half of it back to a human.
4. **"Done" is objective**, not a matter of taste. If quality is a judgment call, a human still wins.

If it doesn't pass, say so and recommend a single good prompt instead. The honest version of this skill: don't force loops into places they don't belong — you'll just burn money for nothing.

## Blast radius — the one classifier that governs everything

Reversibility of an action — not its reliability score — decides three things at once: **how autonomous the loop may be, what free roam may touch, and whether cleanup is required.** A 99%-accept loop can still ship a catastrophic 1% *irreversible* outcome, so reliability promotes you *within* a tier, never *across* the irreversibility line.

| Tier | Example actions | Autonomy gate | Free roam | Cleanup |
|---|---|---|---|---|
| **Low** (reversible) | reads, drafts, sandbox/ephemeral writes | self-certify once the gate is green + audit log | roam freely | none needed |
| **Medium** | staging changes, external messages, non-destructive writes | timed human review window | safe mutations only | teardown or gate |
| **High** (irreversible) | prod deploy, data deletion, payments, push to main | **mandatory human approval, regardless of accept-rate history** | never (unless on ephemeral env) | must be gated |

Reserve human gates for irreversible actions only — humans rubber-stamp when asked too often (approval fatigue), so over-gating *reduces* safety. See `references/blast-radius.md` for the promotion protocol (prove 3–5 runs watched → confirm sandbox + circuit breaker → promote to unattended).

## Build order: prove → harden → automate

The order matters more than the tools. Scheduling something you haven't made reliable by hand is exactly how loops blow up while you sleep.

1. **Prove it once** — run the full cycle manually, watched, on a real case. Confirm the gate actually fails bad output.
2. **Harden it** — add the stop conditions, circuit breaker, state file, never-touch list; run it watched a few more times; measure accept rate.
3. **Automate it** — only now wire the heartbeat (cron/`/loop`/Actions). Promotion respects the blast-radius tier above.

## Stop conditions — never optional

Every loop needs at least one of each, or it runs until it succeeds, breaks, or drains the account:

- **Success stop** — the gate goes green / the measurable condition is met.
- **Failure stop** — a hard iteration cap (start **15–20**, raise only as proven) and ≤ **2–3 retries per action**.
- **Budget stop** — a **pre-flight** cost circuit breaker (check *before* each model call, never after) + a hard dollar/wall-clock ceiling.

**Self-improving caps:** the cap is raised by evidence, not vibes. When the process surfaces a defect, fix it; when accept rate proves out, raise the cap and log that decision in the state backend. The loop improves itself.

## The metric that matters: cost per accepted change

Not tokens spent, not loops run. If the loop gives ten results and you toss six, you're doing the review work it was meant to save. **Below a 50% accept rate it costs more than it gives back** — halt and report. `CFO` (Milton) owns tracking this; context re-reads compound every iteration, so cost is super-linear, not linear.

## Configuring a loop: run the questionnaire

Decisions 1, 2, and 6 below are per-project — **you must ask the project**, never assume. Use `references/config-questionnaire.md` for the full interview; the `/loop-init` command runs it interactively. The ten fields:

1. **Goal** — the recursive goal; what does objective "done" look like?
2. **Gate** — what automatically rejects bad output? Required rung on the ladder: `static (typecheck/lint) → unit → integration → real-app exercise`.
3. **Environment** — ephemeral/preview when available (nothing to clean up); prod is fine for early/simple apps. *Ask.*
4. **Side-effects & cleanup** — does verification mutate state? ephemeral vs register-teardown vs acceptable-to-leave. *Ask.* Don't bend the app's mechanics to enforce teardown.
5. **State backend** — Linear / GitHub Issues / checked-in repo vault. *Ask.* (`references/state-backends.md`)
6. **Maker/checker** — separate checker agent? cheap maker (Haiku-tier reads/diffs) + strict checker (strong model, high effort).
7. **Stop conditions** — cap, success condition, budget, halt-below-accept-rate.
8. **Heartbeat** — manual now (prove) or scheduled (cron/`/loop`/Actions/hook)? cadence?
9. **Connectors** — what does it act on? (open PR, comment ticket, ping channel)
10. **Economics** — track cost-per-accepted-change? budget ceiling?

## Failure modes — design the guards in

Loops fail quietly, not loudly. Before shipping, walk `references/failure-modes.md` and confirm a guard for each: the Ralph Wiggum premature-done, silent runaway, context rot, phantom implementation, scope creep, comprehension debt, approval fatigue, injection propagation. The two cheapest guards that prevent the most damage: an **objective external gate** (not LLM self-assessment) and a **pre-flight budget breaker**.

## Who does what (roster)

- **`agent-builder` (Satchmo)** — loop architect; runs this skill, assembles the five blocks, owns the design.
- **`tester` (Jason)** — the gate; implements and runs verification at the required rung.
- **`project-manager`** — the state layer; tickets as loop memory across all three backends.
- **`devops`** — heartbeat + connectors; cron/Actions, circuit breakers, the promotion gate.
- **`code-auditor` / `hunter-skeptic-referee`** — adversarial maker/checker separation.
- **`CFO` (Milton)** — cost-per-accepted-change watchdog.
- **`wave-coordinator`** — fleets of loops at scale.

## References

- `references/config-questionnaire.md` — the full per-project loop interview, field by field.
- `references/blast-radius.md` — tiering detail + the prove→harden→automate promotion protocol.
- `references/failure-modes.md` — the catalog of quiet failure modes and their guards.
- `references/state-backends.md` — Linear vs GitHub Issues vs repo-vault, with the state-file contract.
