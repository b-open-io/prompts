---
name: free-roam-testing
version: 0.0.2
description: Use this skill to run a discovery loop that explores a running app the way a curious or chaotic human would — randomized, unscripted paths, weird inputs, edge interactions — to surface NEW bugs, broken flows, confusing UX, and slow spots, then file them as deduplicated tickets. Invoke it when the user says "free roam", "explore the app", "monkey test", "find issues I don't know about", "exploratory testing", "use it like a real user", "discovery loop", "surface new bugs", or wants an agent to poke around an app autonomously and report what's broken. This is the producer half of the loop architecture — it feeds tickets to the execution loop. NOT for scripted regression tests (that's the tester agent's verification gate). Always respects a never-touch list and a blast-radius boundary before mutating anything.
---

# Free-Roam Testing

Scripted tests check what you already thought to check. **Free roam finds what you didn't.** This skill drives the actual running app along randomized, human-like paths to surface new issues, then files them as deduplicated tickets that an execution worker works systematically. It is **the discovery worker of a software factory** — the producer half of the worker architecture in `Skill(bopen-tools:software-factory)` (loop and worker are used interchangeably there).

The value comes from *unpredictability*: a real user clicks the wrong thing, pastes an emoji into a number field, hits back mid-submit, opens two tabs, and abandons a checkout. Reproduce that texture and you find the bugs that scripted suites never touch.

## Before you roam: the safety boundary

Free roam is randomized, so it is only safe inside a known blast-radius boundary. Establish these **before the first click**:

1. **Environment** — Prefer an ephemeral / preview env (Vercel preview + seeded throwaway DB): roam freely, mutate anything, it's discarded. On **prod**, you are read-mostly + safe-mutations-only.
2. **Never-touch list** — A hard list of actions the roam must never take, read every pass. On prod this always includes: destructive deletes, real payments, real outbound email/SMS, anything irreversible (High blast-radius — see `software-factory/references/blast-radius.md`). Ask the project for app-specific additions.
3. **Identity** — Use a dedicated test account, never a real user's. Scope credentials to test/staging.

If you cannot confirm a boundary, ask — do not roam against prod with unknown blast radius.

## The roam loop

```
read open tickets  →  pick an entry point  →  roam (randomized)  →
   observe & capture anomaly  →  dedup vs open tickets  →  file NEW ticket  →  repeat
```

### 1. Load context

- Read the **open tickets** from the state backend first (Linear / GitHub / repo vault, Obsidian-compatible — see `software-factory/references/state-backends.md`). You need them to dedup; refiling a known issue every pass is the #1 way discovery loops waste money.
- Read the never-touch list and the app's basic surface (routes, primary flows).

### 2. Roam like a human

Drive the real app with `agent-browser` / `chrome-cdp` / `webapp-testing` (or the CLI for a CLI app). Inject entropy deliberately — vary by run so you don't retread the same path:

- **Personas** — rotate: a confused first-timer, an impatient power user, a hostile/abusive user, a mobile user on a flaky connection.
- **Path entropy** — pick a non-obvious next action; follow secondary links; revisit via back/forward; open things in new tabs; refresh mid-flow.
- **Input entropy** — empty, huge, emoji/unicode, scripts (`<script>`), SQL-ish strings, wrong types, leading/trailing whitespace, paste-bombs, boundary numbers (0, -1, MAX_INT).
- **Timing entropy** — double-click submits, navigate away mid-request, rapid repeats.

There is no `Math.random()` to lean on — generate variety from the persona + an explicit "do something you haven't tried yet this session" instruction, and track visited paths in scratch state.

### 3. Capture anomalies

For each issue, record enough for a cold-start agent to reproduce:

- What you did (exact steps / path), what you expected, what happened.
- Evidence: screenshot, console errors (`read_console_messages`), failed network requests (`read_network_requests`), and the URL/state.
- Category: broken (error/crash), wrong (incorrect behavior), confusing (UX), slow (perf), unsafe (security smell).
- Severity and whether it's reproducible.

### 4. Dedup, then file

- Compare each anomaly against open tickets. If it matches an existing one, add a comment with the new repro instead of opening a duplicate.
- File genuinely new findings as tickets using the project's state backend. Make them **agent-ready** (What / Why / Where / How / Done-when) so the execution loop can pick them up without clarification — use `Skill(bopen-tools:linear-planning)` for Linear.
- Tag them so the two loops stay coordinated (`discovery`, severity).

### 5. Stop conditions

Free roam has no natural "done", so bound it explicitly:

- **Time / iteration cap** — a fixed roam budget per run.
- **Dry-streak** — after K consecutive paths surface nothing new, stop (the loop-until-dry pattern); diminishing returns mean it's time to end the session.
- **Budget** — pre-flight token/cost ceiling, same as any loop.

## Two places this runs

1. **As its own discovery loop** — scheduled in parallel with the execution loop, continuously surfacing work.
2. **As the top rung of the execution loop's gate** — after a fix lands, roam the affected area for realistic regression feedback that scripted tests miss.

## Hand-off to the execution loop

You are the producer. You do **not** fix what you find — you file it. The execution loop (`Skill(superpowers:subagent-driven-development)` / `Skill(bopen-tools:wave-coordinator)`) consumes the tickets and works them systematically with a verification gate. Keeping discovery and execution separate is the point: one surfaces breadth, the other resolves depth.

## References

- `references/entropy-techniques.md` — persona scripts, input-fuzz payloads, and path-variation tactics.
