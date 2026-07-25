# looptop registration — the worker on-disk contract

A factory worker is **registered with looptop at configuration time, paused** —
registration is observability, scheduling is autonomy, and conflating them is
how a "working factory" shows an empty looptop. Before authoring registration,
verify the contract against the installed looptop
`src/core/{discover,state,plist,types}.ts` and `spec/loop.schema.json`; both are
the live source for the installed version.

## Discovery

looptop scans `~/Library/LaunchAgents/ai.<slug>.loop.exec.plist` (plus
optional `ai.<slug>.loop.maintenance.plist`). No plist → the loop does not
exist to looptop, even for manual `looptop run` kickstarts.

## State dir: `~/.<slug>/loop/`

(Resolved from `~/.<slug>/loop/loop.json` first, else the dirname of the
plist's `StandardOutPath`.) Four files:

- `loop.json` — the manifest:
  `{ schemaVersion: 1, slug, displayName, labelPrefix: "ai.<slug>.loop",
  stateDir, repoDir, modes: ["exec"], maintenance: [],
  schedule: { exec: [], maintenance: [] }, host, createdAt }`
  Empty `schedule.exec` = manual-only (prove phase).
- `state.json` — mutable: `{ paused: true, exec_total: 0, exec_accepted: 0 }`.
  `looptop pause/resume <slug>` edits `paused`; the runner MUST honor it.
- `ledger.jsonl` — one line per pass:
  `{ "ts", "mode": "exec"|"maintenance", "rc", "payload": { "result", "ref", "detail" } }`
- `loop.log` — runner output; also the plist's `StandardOutPath`/`StandardErrorPath`.

## Plist (prove-phase shape)

`Label` = `ai.<slug>.loop.exec`; `ProgramArguments` = the runner script;
`RunAtLoad` false; **no** `StartInterval`/`StartCalendarInterval` (manual
kickstart only via `looptop run <slug> exec`, which needs the job loaded:
`launchctl load ~/Library/LaunchAgents/ai.<slug>.loop.exec.plist`). Point
`StandardOutPath` at `<stateDir>/loop.log` — looptop derives the state dir
from it when `~/.<slug>/loop/loop.json` is absent. Promotion to unattended
(per blast-radius) = adding the schedule keys, nothing else changes.

## Runner obligations

One pass per invocation; check `state.json` `paused` FIRST and exit 0 with a
`"skipped"` ledger entry when paused; append a ledger line for every outcome
(completed / error / skipped) with the real `rc`; log to `loop.log`.

Installing the plist + `launchctl load` is user-machine persistence — get the
user's explicit go-ahead; never install it silently.
