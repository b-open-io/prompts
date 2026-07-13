---
name: software-factory
version: 0.0.3
description: Use this skill when designing, configuring, or hardening a software factory — an AI developer workflow where agents iterate toward a goal — a goal an agent iterates toward on its own with a real verification gate, persistent state, and a stop condition. Invoke it when the user mentions "build a loop", "agentic loop", "self-iterating agent", "run this on a schedule/cron", "/loop or /goal", "Ralph loop", "maker-checker", "fleet of agents", "autonomous workflow", "AI developer workflow", "ADW", "software factory", "agentic SDLC", or wants an agent to keep working a goal unattended until it's verifiably done. Also use when scoping whether a loop is even worth building, when picking a verification gate, when deciding what a loop is allowed to touch (blast radius), or when a loop is burning tokens without producing accepted work.
---

# Software Factory

A **prompt** hands an agent one instruction and waits for you. A **loop** hands the agent a job, a way to know when the job is done, and a rule for when to give up — then runs the full cycle on its own until the goal is met. This skill is how we design loops that survive production instead of billing you in silence.

Call the concept by its older name: **this is the software development lifecycle.** A "loop" is one control-flow primitive inside a larger *AI developer workflow* — the plan → build → test → review → ship pipeline engineers used to walk by hand, now staffed by agents and deterministic code with an engineer at exactly two points: the plan going in (prompting is planning) and the review coming out (validation). Everything between those two constraints is system. The skill is named for the whole factory, with the iterate-until-verified loop as its engine — design the whole workflow, and remember the highest-leverage work is building the system that builds the system — the agentic layer, where one improvement multiplies across every future run.

The single most important idea: **the gate is the loop.** Without a real, automated check on the result, you don't have a loop — you have an agent agreeing with itself on repeat. Everything else (scheduling, sub-agents, connectors) is plumbing around that one load-bearing part. Design the gate first.

## Three actors: code, engineers, agents

Every workflow node is staffed by one of three actors, and reliability ranks them **code > engineers > agents**. Code runs deterministically at zero token cost and never hallucinates; agents are the most expensive and least reliable actor in the system. The placement heuristic: push every deterministic step — lint, format, typecheck, test runs, status updates, result routing — into plain code, and reserve agents for the judgment steps code can't do. Staffing an agent where code suffices is the most common way loops burn money. The corollary for gates: run checks as separate code, feed failures back to the maker agent in the same session, and never bury the whole ladder inside one mega-skill the agent interprets (see failure modes).

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

At factory scale, a **router** sits above both loops: work arrives typed (chore, bug, feature, hotfix), and the router picks the workflow and the model tier for it — a workhorse maker for volume, a state-of-the-art model only where planning or checking earns it. Speed-critical work (hotfixes) can **race**: several isolated agents attack the same fix in parallel and the first one through the gate wins. Isolation progresses with maturity — git worktrees are a great place to start and a poor place to end; sandboxes give full isolation plus a place a human can step into mid-run.

**On Claude Code specifically**, staged fan-outs inside a loop pass — find → adversarially verify → synthesize, judge panels, loop-until-dry discovery — can run as a native `Workflow` (deterministic script, live `/workflows` progress, resumable). This is framework-dependent and opt-in-gated; see `skills/coordinator/references/native-workflows.md` for when it applies. On other runtimes, the manual wave protocols in `wave-coordinator` do the same job.

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

0. **Design it by doing it** — walk every node of the workflow yourself, by hand, once. Sketch the result (a Mermaid diagram earns its keep here). Encode only steps you have personally executed; a node you've never run manually is a guess wearing automation.
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

Decisions 3, 4, and 5 below are per-project — **you must ask the project**, never assume. Use `references/config-questionnaire.md` for the full interview; the `/loop-init` command runs it interactively. The ten fields:

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

Loops fail quietly, not loudly. Before shipping, walk `references/failure-modes.md` and confirm a guard for each: the Ralph Wiggum premature-done, silent runaway, context rot, phantom implementation, scope creep, comprehension debt, approval fatigue, injection propagation, and the **mega-skill** — one giant skill that interprets the whole build-check-route pipeline in a single agent context, which makes every step untestable and every failure invisible. The two cheapest guards that prevent the most damage: an **objective external gate** (not LLM self-assessment) and a **pre-flight budget breaker**.

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
