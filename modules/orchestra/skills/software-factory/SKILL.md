---
name: software-factory
version: 0.0.10
description: >-
  Design or harden a software factory: an agentic loop that iterates toward a goal with a
  verification gate, persistent state, and a stop condition. Use for "build a loop", "agentic
  loop", "self-iterating agent", "/loop", "/goal", "Ralph loop", "maker-checker", "agentic
  SDLC", "ADW", picking a verification gate, bounding a loop's blast radius, unintelligible
  auto-merged PR titles, or loop process dumped into a GitHub PR body.
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
| **4. Connectors** | let the loop *act* — open the PR, comment the ticket, ping the channel | Linear MCP, `gh`, `resend`, `devops`. PRs are human artifacts: see `references/human-artifacts.md`; promotion and notifications: `references/shipping-and-isolation.md` |
| **5. Verifier (the gate)** | the test/typecheck/build/exercise that automatically **rejects** bad output | `tester` (Jason) — owns running it |

The maker is too generous grading its own homework, so block 3 (a separate, often stronger checker) plus block 5 (an objective gate) is *most of the quality*. Make the maker fast and cheap; make the checker slow and strict.

**Watching the factory floor:** [`looptop`](https://www.npmjs.com/package/looptop) (`npm install -g looptop`) is htop for these loops — a live terminal monitor plus a macOS menu-bar app showing every running loop's status. Optional, and worth installing the day more than one loop runs unattended; the setup installer checks for it.

## Worker types — coordinated through tickets

In the factory analogy, a loop *is* a factory worker — a worker with one specific job. ("Loop" and "worker" are used interchangeably throughout this skill; the vocabulary didn't change, the analogy just got a name.) Most real work needs more than one worker type running in parallel, with the ticketing system (the State block) as the seam between them. The two that coordinate through the same ticket queue are a producer/consumer pair — discovery produces work, execution consumes it — plus a third, maintenance, that keeps the factory itself healthy (see below).

```
   DISCOVERY WORKER  (free-roam loop)       EXECUTION WORKER  (systematic loop)
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

The worker roster:

- **Execution worker** (execution loop) — pulls a ticket, works it, gates it, closes it. Run via `Skill(superpowers:subagent-driven-development)` or a fleet via `Skill(orchestra:wave-coordinator)`.
- **Discovery worker** (discovery loop) — runs the product like a user, surfaces bugs nobody knew existed, and files deduped tickets for the execution worker to pick up. Owned by `Skill(core:free-roam-testing)`.
- **Maintenance worker** (maintenance loop) — recurring upkeep that keeps the factory itself healthy rather than shipping a ticket. See "Maintenance workers & looptop" below.

The dedup-vs-open-tickets step is what stops discovery from re-filing the same issue every pass. Always read open tickets before filing new ones.

At factory scale, a **router** sits above all worker types: work arrives typed (chore, bug, feature, hotfix), and the router picks the workflow and the model tier for it — a workhorse maker for volume, a state-of-the-art model only where planning or checking earns it. Speed-critical work (hotfixes) can **race**: several isolated agents attack the same fix in parallel and the first one through the gate wins. Isolation progresses with maturity — git worktrees are a great place to start and a poor place to end; sandboxes give full isolation plus a place a human can step into mid-run.

On a host with a native workflow engine, staged fan-outs inside a loop pass can
run as a deterministic workflow. Load only the current Coordinator host guide:
`skills/coordinator/references/hosts/claude.md` or
`skills/coordinator/references/hosts/grok.md`. On Codex and OpenCode, the
manual protocols in `wave-coordinator` provide the equivalent barriers.

## The staged multi-model pipeline — the verified recipe

The maker/checker split above is doctrine; this is the concrete, field-verified wiring for an
execution worker. **A headless loop that runs one monolithic session — one model playing planner,
maker, checker, and shipper in a single context — will eventually write a wrong diagnosis into a
ticket as fact, because its mechanical gate verifies code and nothing verifies claims.** (Field case:
a loop asserted "rotate the credential" on a CI outage without evidence; a second single-context agent
then flipped it to "stale, skip it" — also without evidence. Both survived because no adversarial
reviewer ever existed. The outage was real; both written diagnoses were unverified guesses.)

The verified shape — every lane below was live-tested headless before this section was written:

| Stage | Model / lane | Invocation (verified) | What it guards |
|---|---|---|---|
| **Plan** | strongest planner (e.g. fable) | native `Workflow` `agent(..., { model: 'fable', schema })` | Premise verification BEFORE decomposition; routes each item to a lane + named roster agent |
| **Implement** | cheap workers: external CLI (e.g. `grok -m grok-4.6 --permission-mode acceptEdits`) or named roster agents (`agentType`) | supervisor-agent pattern: a thin workflow agent writes the spec file, drives the CLI via Bash, relays the report + `git diff --stat` | Volume off the main seat; disjoint file partitions per item |
| **Review** | independent CROSS-VENDOR checker (e.g. `codex exec -m gpt-5.6-sol --sandbox read-only`) | supervisor agent builds a review brief (diff + every claim), demands a schema verdict | The missing gate: adversarial review of the diff AND the claims; one corrective round max |
| **Gate + ship** | main seat, model PINNED in loop config | mechanical gate unpiped, then `lint-pr.sh` if opening a PR, then git | Merge requires gate green **AND** `verdict.approved`. Auto-merged PRs also require the human-artifact linter green |

Non-negotiables learned the hard way:

- **The native `Workflow` tool works inside headless `claude -p`** — verified. Commit the workflow
  script to the repo (`scriptPath`), version it like code, and give it a `selftest` arg so CI and
  humans can probe parse/load without spawning agents. (Runtime gotcha: the exported `meta` const is
  not in scope in the script body; `Date.now()`/`Math.random()` are unavailable — pass timestamps in
  via args.)
- **Pin every model explicitly — the loop config, the workflow stages, the CLI dispatches.** A loop
  that inherits a mutable CLI default silently runs on whatever model the maintainer's interactive
  sessions last saved; a real loop ran weeks on a stale model this way and nobody knew.
- **The checker reviews CLAIMS, not just diffs.** Any diagnosis, decline rationale, or "X is broken
  because Y" that will be written to a ticket must carry evidence and pass the checker first.
  Unverifiable ⇒ label it "unverified hypothesis" or write nothing. Claims-only tickets route through
  the same review stage with no diff.
- **No checker ⇒ propose-only.** Lane preflight (binary + auth + pinned-model-exists, e.g.
  `grok models | grep`) runs every cycle; a down worker lane re-routes explicitly to roster agents,
  and a down checker lane downgrades the cycle to open-PR-and-stop. The loop never self-approves, and
  a lane never silently collapses into the main seat.
- **Data boundary:** external lanes cross vendors (specs to xAI, review briefs to OpenAI). Specs and
  briefs carry code excerpts, never secrets or env values. launchd does not source shell profiles —
  file-based auth (codex `auth.json`, `grok login`) or an explicitly-sourced env file, checked at
  preflight.
- **GitHub is for humans.** Tickets hold work items; the loop ledger holds process. A loop that
  auto-merges without a human rewrite must lint PR titles and bodies as **code**
  (`scripts/lint-pr.sh` + CI), not as another prompt. Field case: auto-merged PRs with ticket-id
  prefixes and checker dumps a human could not scan (Scribe, 2026-08). T3 Code discovers the
  same contract via always-on `AGENTS.md`; T3 does not auto-merge, so prompt-only is enough
  there. Follow `references/human-artifacts.md`. `/factory-init` copies the templates when the
  connector list includes `gh pr create`.

### Agent runtime selection

Keep the factory's ticket/state backend separate from runtime checkpoints. For
AI SDK v7 applications, use `WorkflowAgent` when tool steps, approvals, and
stream reconnection need workflow durability. Use `HarnessAgent` when an
established sandboxed coding runtime should own the session, after verifying
the experimental harness package against the installed docs.

For bOpen systems covered by the eve adoption plan, treat eve as a conditional
candidate behind the bOpen-owned ACL/persistence proxy. The Phase-2 seam tests
must prove ownership, Postgres durability, restart/resume, dynamic agent
resolution, and deterministic subagent dispatch. A failed proof selects the
v7-native runtime behind the same application conversation and persistence
contracts.

## Maintenance workers & looptop

The third worker type isn't "build this ticket" (execution) or "find what's broken" (discovery) — it's the recurring upkeep that keeps the factory itself healthy: dependency updates, link checks, stale-ticket sweeps, catalog freshness. Its gate is usually "did the check come back clean," not "did a feature ship."

**Cadence patterns** — pick one per project:

- **Dedicated schedule** — its own heartbeat (e.g. a weekly dependency-bump cron), independent of execution volume.
- **Alternating with execution** — one worker splits its time, running as execution or maintenance on alternating passes — "half the time one or the other." Cheaper than a second worker when upkeep volume is low.
- **Two parallel workers** — a standing maintenance loop runs alongside the execution loop once upkeep volume earns its own heartbeat.

**Watching the factory floor with `looptop`:**

- Loops are discovered from their LaunchAgents: `~/Library/LaunchAgents/ai.<slug>.loop.exec.plist`.
- `looptop ls` / `looptop status` / `looptop tail` / `looptop pause` / `looptop resume` — list, inspect, and control any running loop.
- `looptop run <slug> [exec|maintenance]` kickstarts a worker of the given type on demand.
- Each loop's state file carries a `paused` flag in `state.json` that `pause`/`resume` toggle — resume picks the worker back up from where the state file left off (the state-file contract in `references/state-backends.md`).
- Install with `npm install -g looptop`; the setup installer already checks for it (`setup/manifest.json`), so a factory-init'd project has nothing extra to wire up.

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
3. **Automate it** — only now wire the heartbeat (cron/`/loop`/Actions). Promotion respects the blast-radius tier above. A shipping worker must move accepted work out of a local checkout; use `references/shipping-and-isolation.md` for a guarded `dev` → default-branch path and disposable install tests.

### The factory cannot exempt its own bootstrap

Creating or changing the runner, gates, prompts, CI, repository rules, or
credentials is a High-tier factory-policy change. Bootstrap on a feature
branch and deliver it through a human-review PR; the factory may propose but
never approve its own constitution. A prompt saying "propose-only" is not a
security boundary. Before readiness, verify the live default-branch rule and
the unattended worker's identity/capability with
`references/repository-policy.md` and `scripts/check-factory-policy.sh`.
Missing protection, missing/malformed state, mutable model defaults, or
documentation-only breakers keep the factory paused and manual.

## Stop conditions — never optional

Every loop needs at least one of each, or it runs until it succeeds, breaks, or drains the account:

- **Success stop** — the gate goes green / the measurable condition is met.
- **Failure stop** — a hard iteration cap (start **15–20**, raise only as proven) and ≤ **2–3 retries per action**.
- **Budget stop** — admit work only when enough budget is reserved to finish and checkpoint one bounded work item. Once admitted, let that item reach its gate or safe checkpoint; do not strand it because a dollar threshold was crossed mid-session. Stop taking the next item when the reserve is insufficient. Keep an emergency breaker only for runaway behavior, and check wall-clock limits at work-item boundaries.

**Self-improving caps:** the cap is raised by evidence, not vibes. When the process surfaces a defect, fix it; when accept rate proves out, raise the cap and log that decision in the state backend. The loop improves itself.

## The metric that matters: cost per accepted change

Not tokens spent, not loops run. If the loop gives ten results and you toss six, you're doing the review work it was meant to save. **Below a 50% accept rate it costs more than it gives back** — halt and report. `CFO` (Milton) owns tracking this; context re-reads compound every iteration, so cost is super-linear, not linear.

## Configuring a loop: run the questionnaire

Decisions 3, 4, and 5 below are per-project — **you must ask the project**, never assume. Use `references/config-questionnaire.md` for the full interview; the `/factory-init` command runs it interactively. The ten fields:

1. **Goal** — the recursive goal; what does objective "done" look like?
2. **Gate** — what automatically rejects bad output? Required rung on the ladder: `static (typecheck/lint) → unit → integration → real-app exercise`.
3. **Environment** — ephemeral/preview when available (nothing to clean up); prod is fine for early/simple apps. *Ask.*
4. **Side-effects & cleanup** — does verification mutate state? ephemeral vs register-teardown vs acceptable-to-leave. *Ask.* Don't bend the app's mechanics to enforce teardown.
5. **State backend** — Linear / GitHub Issues / Repo vault (Obsidian-compatible). *Ask.* (`references/state-backends.md`)
6. **Maker/checker** — separate checker agent? cheap maker (Haiku-tier reads/diffs) + strict checker (strong model, high effort).
7. **Stop conditions** — cap, success condition, work-item admission budget, emergency runaway breaker, halt-below-accept-rate.
8. **Heartbeat** — manual now (prove) or scheduled (cron/`/loop`/Actions/hook)? cadence?
9. **Connectors** — what does it act on? (open PR, comment ticket, ping channel). If it opens PRs, scaffold the human-artifact gate (`references/human-artifacts.md`).
10. **Economics** — track cost-per-accepted-change? reserve needed to finish one work item? emergency ceiling?

## Failure modes — design the guards in

Loops fail quietly, not loudly. Before shipping, walk `references/failure-modes.md` and confirm a guard for each: the Ralph Wiggum premature-done, silent runaway, context rot, phantom implementation, scope creep, comprehension debt, unintelligible auto-merged PRs, approval fatigue, injection propagation, and the **mega-skill** — one giant skill that interprets the whole build-check-route pipeline in a single agent context, which makes every step untestable and every failure invisible. The two cheapest guards that prevent the most damage: an **objective external gate** (not LLM self-assessment) and work-item admission control that refuses new work before it becomes unaffordable.

## Who does what (roster)

- **`agent-builder` (Satchmo)** — loop architect; runs this skill, assembles the five blocks, owns the design.
- **`tester` (Jason)** — the execution worker's gate; implements and runs verification at the required rung.
- **`free-roam-testing`** — the discovery worker; roams the product like a user and files deduped tickets.
- **`project-manager`** — the state layer; tickets as worker memory across all three backends.
- **`devops`** — heartbeat + connectors for every worker type, including maintenance-worker cadence; cron/Actions, circuit breakers, the promotion gate.
- **`code-auditor` / `hunter-skeptic-referee`** — adversarial maker/checker separation.
- **`CFO` (Milton)** — cost-per-accepted-change watchdog.
- **`wave-coordinator`** — fleets of workers at scale.

Register every worker with looptop **at configuration time, paused** — see
`references/looptop-registration.md` for the exact on-disk contract (plist,
state dir, manifest, ledger schemas). A worker invisible to looptop is a
worker nobody can observe, pause, or kickstart; prove-phase means paused
registration, never no registration.

## References

- `references/config-questionnaire.md` — the full per-project loop interview, field by field.
- `references/blast-radius.md` — tiering detail + the prove→harden→automate promotion protocol.
- `references/failure-modes.md` — the catalog of quiet failure modes and their guards.
- `references/human-artifacts.md` — GitHub PRs as human artifacts: AGENTS.md contract, lint-pr.sh, CI.
- `references/looptop-registration.md` — the worker registration contract, verified against looptop source.
- `references/repository-policy.md` — self-bootstrap, default-branch enforcement, and delivery identity checks.
- `references/shipping-and-isolation.md` — guarded branch promotion, review notices, and disposable plugin-install tests.
- `references/state-backends.md` — Linear vs GitHub Issues vs repo-vault, with the state-file contract.
