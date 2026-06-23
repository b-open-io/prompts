# Loop Config Questionnaire

Run this once, when initializing a loop in a project. The output is a written loop config (store it in the state backend or a `loop.config.md` in the repo) that every iteration reads. Fields 3, 4, and 5 are genuinely per-project — **ask the project, never assume a default.**

The point of the interview is to force the load-bearing decisions before any tokens are spent. A loop with a vague goal, no gate, or no stop condition is not a loop you should automate.

## 1. Goal

- What is the recursive goal the agent iterates toward?
- What does **objective "done"** look like? Write it as a condition a machine could check, not a feeling.
- If you can't state "done" objectively, stop — this is a manual-prompt task, not a loop.

## 2. Gate (the verifier)

What automatically rejects bad output? Pick the **required rung** on the ladder, lowest that still gives honest signal:

```
static (typecheck / lint)  →  unit  →  integration  →  real-app exercise
   weakest signal                                         strongest signal
```

- A passing unit test is the *weakest* proof the feature works for a human; driving the actual running app (via `agent-browser` / `chrome-cdp` / `webapp-testing`) is the strongest.
- The architect sets the required rung; `tester` (Jason) implements and runs it.
- LLM-as-judge gates are only for genuinely subjective quality (tone, UX). For anything with an exit code, use the exit code — the model that did the work is too generous a grader.

## 3. Environment  *(ask the project)*

- Is an ephemeral / preview environment available (e.g. Vercel preview deploy + seeded throwaway DB)? Prefer it — there's nothing to clean up because the whole environment is discarded.
- If not, running against prod is fine for early-stage / simple apps and is often more thorough. This is a per-project call.
- Is a read-only-prod middle ground possible (verify without writes)?

## 4. Side-effects & cleanup  *(ask the project)*

- Does verification mutate state (rows, users, files, emails, webhooks)? Over hundreds of iterations, leftover test data is corruption, not noise.
- Choose one: **ephemeral** (nothing to clean) → **register teardown** (every mutation records its undo up front, transaction-style) → **acceptable-to-leave** (explicitly fine for this project).
- Do **not** alter the app's mechanics just to enforce teardown — work with the project you have. Undo-registration is a nice-to-have, not a hard gate.

## 5. State backend  *(ask the project)*

Where does the loop keep "what's done / what failed / what's next" so it resumes instead of restarting? See `state-backends.md`. One of:

- **Linear** — we're native to it (linear-sync, OPL-#### convention).
- **GitHub Issues** — universal, works anywhere `git` + `gh` exist.
- **Repo vault** — checked-in markdown files (Obsidian-style), e.g. `loop/state.md` + `loop/specs/*.md`.

State must be readable by a **cold-start agent** — each iteration gets a fresh context window.

## 6. Maker / checker

- Separate the agent that does the work from the agent that checks it? (Strongly recommended above trivial tasks.)
- Maker: fast/cheap model for generation and reads/diffs (Haiku-tier).
- Checker: stronger model on higher effort, adversarially prompted to *refute*. Checker overhead is negligible against the cost of bad output passing undetected.

## 7. Stop conditions

- **Iteration cap** — start 15–20; raise only on proven accept rate.
- **Retries per action** — 2–3, then surface the failure.
- **Success stop** — gate green / measurable condition met.
- **Budget stop** — pre-flight cost circuit breaker + hard dollar and wall-clock ceilings.
- **Accept-rate halt** — stop and report if accept rate drops below 50%.

## 8. Heartbeat

- Where in build order is this loop? Manual (proving), hardened-but-watched, or ready to automate?
- Trigger: `/loop` (interval), `/goal` (until condition true), a hook (lifecycle), `CronCreate` / `ScheduleWakeup`, or GitHub Actions.
- Cadence and the blast-radius tier (decides whether automation needs human sign-off — see `blast-radius.md`).

## 9. Connectors

- What does the loop *act* on, not just describe? Open a PR, link/comment a ticket, ping a channel, deploy a preview.
- Each connector that performs an irreversible action inherits the High blast-radius gate.

## 10. Economics

- Track cost-per-accepted-change? (`CFO` / Milton owns this.)
- Hard budget ceiling for the loop, enforced pre-flight.
- Remember context re-reads compound every iteration — cost is super-linear.
