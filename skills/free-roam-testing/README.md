# Free-Roam Testing

Scripted tests check what you already thought to check. Free roam finds what you didn't. This skill drives your running app along randomized, human-like paths to surface new bugs, broken flows, and confusing UX, then files them as deduplicated tickets that an execution loop works through systematically.

## Why randomness finds what scripts miss

A real user clicks the wrong button, pastes an emoji into a number field, hits back mid-submit, opens two tabs, and abandons a half-finished checkout. Reproduce that texture and you hit the bugs a fixed test suite was never written to catch. Free roam manufactures that variety on purpose by rotating personas, fuzzing inputs, and varying the path through the app on every pass.

It is the **discovery** half of the two-loop architecture in `loop-engineering`. Discovery produces tickets; the execution loop consumes them. Keeping the two separate is the point — one loop surfaces breadth while the other resolves depth, and the ticket queue between them is what lets either resume tomorrow.

## The roam loop

```
read open tickets  →  pick an entry point  →  roam (randomized)  →
   capture the anomaly  →  dedup vs open tickets  →  file a new ticket  →  repeat
```

Reading the open tickets first is what stops the loop from refiling the same issue every pass, which is the fastest way a discovery loop wastes money.

## Safety comes before the first click

Free roam is unpredictable, so it only runs inside a known boundary:

- **Environment** — On an ephemeral or preview env, roam freely and mutate anything, because the whole thing gets discarded. On production, stay read-mostly and touch only safe, reversible actions.
- **Never-touch list** — A hard list of actions the roam must never take, read on every pass. On prod this always covers destructive deletes, real payments, and real outbound email or SMS.
- **Identity** — Always a dedicated test account with credentials scoped to test or staging, so a curious agent can never act as a real customer or reach real money.

## What it produces

Each finding is written so a cold-start agent can reproduce it without guessing: the exact steps, expected versus actual behavior, a screenshot, console errors, failed network requests, plus a category and severity. Genuinely new findings become agent-ready tickets; anything matching an open ticket gets a new repro added as a comment instead of a duplicate.

## What's in here

- `SKILL.md` — the roam loop, the safety boundary, and the hand-off to the execution loop.
- `references/entropy-techniques.md` — persona scripts, input-fuzz payloads, path-variation tactics, and the dedup heuristics.

Free roam runs in two places: as its own scheduled discovery loop, and as the top rung of the execution loop's verification gate, where roaming the area around a fresh fix gives realistic regression feedback that scripted tests miss. Jason (`tester`) owns running it as part of the gate; Satchmo (`agent-builder`) wires it into the loop design.
