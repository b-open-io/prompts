---
allowed-tools: Skill(bopen-tools:software-factory), Skill(bopen-tools:linear-planning), Read, Write, Grep, Glob, Bash, TaskCreate, TaskUpdate, TaskGet, TaskList
description: Interactively design and scaffold an autonomous agent loop in this project (goal, gate, state, stop conditions, heartbeat)
argument-hint: "[goal or feature the loop should work toward]"
---

## Your Task

If the arguments contain "--help", show this help and exit:

**factory-init** — Design and scaffold an autonomous agent loop

**Usage:** `/factory-init [goal or feature the factory should work toward]`

**Description:**
Runs the software-factory config questionnaire, decides whether a loop is even
warranted, then scaffolds a runnable loop: the verification gate, the state
backend, stop conditions, blast-radius boundary, and the heartbeat. Follows
prove → harden → automate — it does NOT schedule anything unattended until the
loop is proven by hand.

**Arguments:**
- `[goal]` : What the loop should accomplish (optional — will be asked if omitted)

**Examples:**
- `/factory-init "keep the e2e test suite green on every push"`
- `/factory-init "triage and fix accessibility issues across the marketing site"`
- `/factory-init "explore the app nightly and file new bugs"`

Then stop.

Otherwise, design the loop:

### Step 1: Load the methodology

Invoke `Skill(bopen-tools:software-factory)`. It defines the five building blocks,
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

### Step 5: Scaffold

Produce a written loop config (store it in the chosen state backend or a
`loop/config.md` in the repo) capturing every questionnaire answer, then wire:

- **Gate** — delegate the verification rung to the `tester` agent (Jason) to implement and run.
- **State** — initialize the backend (Linear labels, GitHub `loop` labels, or `loop/state.md`).
- **Maker/checker** — note the model split (cheap maker, strict checker).
- **Stop conditions** — cap (15–20 to start), retries (2–3), pre-flight budget breaker.

### Step 6: Prove, don't automate

Run the full cycle **once, watched**, on a real case. Confirm the gate actually
*rejects* bad output. Report the result and the cost-per-accepted-change. Only
after the loop is proven and hardened should the heartbeat (cron / `/loop` /
`/goal` / GitHub Actions) be wired — and High blast-radius actions stay
human-gated regardless. Hand that automation step to the `devops` agent.
