---
allowed-tools: Skill(orchestra:software-factory), Skill(core:linear-planning), Read, Write, Grep, Glob, Bash, TaskCreate, TaskUpdate, TaskGet, TaskList
description: Interactively design and scaffold an autonomous agent loop in this project (goal, gate, state, stop conditions, heartbeat, human-readable GitHub PRs)
argument-hint: "[goal or feature the loop should work toward]"
---

## Your Task

If the arguments contain "--help", show this help and exit:

**factory-init** — Design and scaffold an autonomous agent loop

**Usage:** `/factory-init [goal or feature the factory should work toward]`

**Description:**
Runs the software-factory config questionnaire, decides whether a loop is even
warranted, then scaffolds a runnable loop: the verification gate, the state
backend, stop conditions, blast-radius boundary, the heartbeat, and — when
the loop opens GitHub PRs — the human-artifact contract (AGENTS.md section,
lint-pr.sh, CI). Follows prove → harden → automate — it does NOT schedule
anything unattended until the loop is proven by hand.

**Arguments:**
- `[goal]` : What the loop should accomplish (optional — will be asked if omitted)

**Examples:**
- `/factory-init "keep the e2e test suite green on every push"`
- `/factory-init "triage and fix accessibility issues across the marketing site"`
- `/factory-init "explore the app nightly and file new bugs"`

Then stop.

Otherwise, design the loop:

### Step 1: Load the methodology

Invoke `Skill(orchestra:software-factory)`. It defines the five building blocks,
the two loop types, blast-radius tiering, stop conditions, and the failure-mode
guards. Everything below follows it.

### Step 2: Qualify — does this even need a loop?

Apply the four-box test from the skill. A loop is worth building **only when all
four are true**: the task repeats (≥ weekly), something can automatically reject
bad output, the agent can do it end-to-end, and "done" is objective. If any box
fails, say so plainly and recommend a single good prompt instead. Do not scaffold
a loop that shouldn't exist.

### Step 3: Run the config questionnaire

Walk the ten fields in `software-factory/references/config-questionnaire.md`. Fields
3 (environment), 4 (cleanup), and 5 (state backend) are per-project — **ask the
user, don't assume**. Detect what you can from the repo first (test runner, CI,
Linear/GitHub presence, preview-env config) and propose defaults, but confirm the
per-project fields.

### Step 4: Set the blast-radius boundary

Classify the loop's actions (Low / Medium / High). Write the **never-touch list**
for anything irreversible. This boundary governs free-roam permission, the
automation/promotion gate, and cleanup — all at once.

Treat factory bootstrap and policy changes themselves as High-tier. If this is
a Git repository, resolve the live default branch, create or reuse a non-default
feature branch before writing factory files, and deliver the scaffold through a
human-review PR. Never make the bootstrap commit directly on the default
branch. Read `software-factory/references/repository-policy.md`.

### Step 5: Scaffold

Produce a written loop config (store it in the chosen state backend or a
`loop/config.md` in the repo) capturing every questionnaire answer, then wire:

- **Gate** — delegate the verification rung to the `tester` agent (Jason) to implement and run.
- **State** — initialize the backend (Linear labels, GitHub `loop` labels, or `loop/state.md`).
- **Maker/checker** — note the model split (cheap maker, strict checker).
- **Stop conditions** — cap (15–20 to start), retries (2–3), pre-flight budget breaker.
- **Repository policy** — for GitHub-backed delivery, run
  `software-factory/scripts/check-factory-policy.sh` against the live default
  branch and record the unattended worker identity. Protection plus a
  non-bypass worker credential is required before scheduling; otherwise leave
  the loop paused and manual. Do not create or change a repository rule without
  explaining it and getting authorization at the time of that mutation.
- **Executable safety** — missing/malformed state fails closed; pin every model;
  enforce the configured iteration, retry, wall-clock, budget, and accept-rate
  breakers in code rather than merely writing them into config.
- **Human artifacts** — if field 9 includes `gh pr create`, follow
  `software-factory/references/human-artifacts.md`. Resolve this skill's
  directory and copy:
  - `scripts/lint-pr.sh` → the project's `scripts/lint-pr.sh` (chmod +x; run `--self-test`)
  - `templates/pr-lint.yml` → `.github/workflows/pr-lint.yml`
  - `templates/pull_request_template.md` → `.github/pull_request_template.md`
  - `templates/write-pr/SKILL.md` → `.claude/skills/write-pr/SKILL.md` when the project commits skills
  Append the AGENTS.md **Pull requests** section from that reference. In the
  exec/ship prompt: run `bash scripts/lint-pr.sh --title "$TITLE" --body-file "$BODY"`
  before `gh pr create`; put loop process in a PR **comment**, never the body.
  Do not scaffold this when the loop never opens a GitHub pull request.
- **Observability** — register the worker with Looptop immediately in a paused,
  manual-only posture. Include `runtimeDirs`, `telemetry.eventsPath`, and the
  machine-readable `factory` policy in `loop.json`. Append sanitized
  `run/stage/worker/gate/artifact/decision/policy` events to `events.jsonl`.
  When separate exec and maintenance LaunchAgents exist, use distinct wrapper
  executable names so macOS does not display indistinguishable background rows.

### Step 6: Prove, don't automate

Run the full cycle **once, watched**, on a real case. Confirm the gate actually
*rejects* bad output. Report the result and the cost-per-accepted-change. Only
after the loop is proven and hardened should the heartbeat (cron / `/loop` /
`/goal` / GitHub Actions) be wired — and High blast-radius actions stay
human-gated regardless. Hand that automation step to the `devops` agent.

Before declaring the scaffold complete, verify all of the following and attach
the evidence to the handoff: bootstrap PR URL; live branch-policy and worker
identity check; valid paused state plus a missing-state rejection; model pins;
breaker tests; PR-linter self-test; required status names; Looptop discovery;
and at least one sanitized `events.jsonl` prove event.
