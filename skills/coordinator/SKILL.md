---
name: coordinator
description: Always active when coding in a premium Claude (Fable/Opus) session with cheaper executors available — a codex or grok quota, or lower-tier Claude models. Triggers whenever implementation work is being planned, scoped, or about to start — before writing any code — to decide where each piece of work executes. Plan big, execute small — judgment (planning, specs, design intent, review, visual validation, git) stays in the premium session; code-writing volume dispatches to workers, with guardrails learned from real dispatch failures.
---

# Coordinator

Premium-model tokens are expensive; cheaper executors sit unused — a codex
or grok quota, lower-tier Claude models. Exploit the price gap: spend premium tokens
on judgment — planning, specs, design intent, review, visual validation — and
spend worker capacity on all code-writing volume. Plan big, execute small.

**You ARE the premium session.** "Here" means you do it yourself. There is no
separate model to delegate judgment to. (For the reverse seat — a cheap main
session consulting premium intelligence — see the `advisor` skill.)

## Routing Table

| Work | Where | Why |
|------|-------|-----|
| Planning, specs, architecture decisions | Here | Judgment is what the premium model is paid for |
| **ALL implementation — backend, frontend, anything that writes code** | Worker dispatch | Worker capacity is cheap; typing code is not where premium adds value |
| Visual validation of UI work (run the app, screenshot, judge, iterate) | Here | The design eye is worth the price — validate, don't type |
| Investigation and debugging analysis (root-causing hard bugs) | Here | Judgment work; the resulting fix dispatches with a precise spec |
| Diff review, commits, pushes, PRs | Here | Git operations stay under your control |
| Trivial edits riding along with review/validation (one-liners, any layer) | Here | Dispatch overhead exceeds the work |
| Work a worker has demonstrably struggled with | Here | Escape hatch — see below |

## Worker Selection

Worker lanes. Pick per unit of work; lanes can run in parallel.

| Worker | Best for |
|--------|----------|
| **codex** (CLI or plugin) | Isolated, well-specced code volume in a sandboxed workspace |
| **grok** (Grok Build CLI, headless) | The same code-volume profile — an independent vendor lane when a quota exists |
| **Cheap Claude subagent** (`Agent` tool with a lower-tier model) | Work needing this session's tools (browser, MCP servers), work leaning on conversation context, or when no CLI lane is available |

Any headless coding CLI backed by a subsidized quota fits the CLI-lane slot;
codex and grok are the known instances. Prefer whichever lane the user's
quotas favor. Ask once when it's ambiguous, then stick with the answer.

**Preflight every CLI lane — and fail loudly.** Before a session's first
dispatch: `command -v <cli>` plus a version/auth check. A missing or
unauthenticated lane is reported as unavailable and the spec re-routes to
another lane *explicitly* — a CLI lane that quietly becomes "I'll just write
it here" defeats the routing. The premium session absorbs implementation
only through the escape hatch, never through a silent fallback.

**Enabling a lane.** Unavailable is a state to fix, not just report — when a
wanted lane fails preflight, offer to enable it (installs change the user's
machine; confirm before running, re-run the preflight after):
- **codex**: `npm i -g @openai/codex` (or install the codex Claude Code
  plugin), then `codex login` in a terminal for the subscription quota, or
  set `OPENAI_API_KEY` for pay-per-token.
- **grok**: `curl -fsSL https://x.ai/cli/install.sh | bash` (installs to
  `~/.grok/bin`, no sudo; inspect the script before piping it). Auth, any
  of: `XAI_API_KEY` env var (pay-per-token, zero interaction), `grok login`
  (browser OAuth, subscription quota — hand to the user), or
  `grok login --device-auth` for headless/remote boxes. Verify with
  `grok models`.

**codex: plugin vs raw CLI.** Detect once per session and prefer the plugin:

- **Plugin installed** (`codex:*` commands / `codex:codex-rescue` agent
  available): dispatch through it — `/codex:rescue --background <task>` or the
  `codex:codex-rescue` subagent. The plugin drives the codex app-server
  directly and adds resumable threads (`--resume`), background job tracking
  (`/codex:status`, `/codex:result`, `/codex:cancel`), and structured output —
  the job log preserves worker output even when nothing comes back inline.
  The underlying sandbox defaults to read-only; the rescue agent adds
  `--write` for implementation tasks but runs read-only when the request
  reads like review or diagnosis — phrase dispatches as edit tasks
  ("implement X, edits expected") so write mode is chosen.
- **CLI only**: `codex exec --sandbox workspace-write --cd <repo> "..."` with
  every guardrail in the Dispatch Protocol below.
- Same brain either way — the plugin changes thread/job management, not what
  codex can do. Sandbox physics (no network, no port binding) are identical.

**grok (Grok Build CLI) dispatch shape:**
```bash
PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)   # unique per dispatch — parallel lanes on a shared path corrupt each other
printf '%s\n' "<one-line imperative; details in SPEC-*.md>" > "$PROMPT_FILE"
grok --prompt-file "$PROMPT_FILE" -m grok-4.5 --permission-mode acceptEdits \
  --sandbox workspace --output-format plain --cwd <repo>
```
- **Preflight with `grok models`** — one command verifies the binary AND
  auth and lists the available model IDs. **Pin the intended model
  explicitly** and confirm it appears in the full `grok models` output —
  never ride the CLI default, which may be a weaker non-reasoning variant.
- `acceptEdits`, never `--always-approve`: the worker edits files; you re-run
  verification yourself. (Its permission mode may also have blocked it from
  running the acceptance command — your re-run covers that.)
- `--sandbox workspace` scopes filesystem access; custom profiles live in
  `.grok/sandbox.toml`. **Footgun: an unknown profile only WARNS ("sandbox
  could not be applied") and runs unsandboxed** — check stderr before
  trusting isolation. Unlike codex's sandbox, the grok lane can reach the
  network, so offline fixtures are usually unneeded — but verify what the
  chosen profile actually permits rather than assuming, and the "what NOT
  to touch" list and adversarial review carry full weight here regardless.
- Parallel dispatches: `--worktree` gives each run an isolated git worktree
  natively. `--best-of-n <N>` (headless) races N attempts *within* the lane
  and picks the best — in-lane redundancy; cross-vendor racing (below)
  remains the stronger diversity play.
- Wrap dispatches in a timeout so a hung lane returns a status instead of
  stalling the barrier — but **verify the binary during lane preflight**:
  `command -v gtimeout || command -v timeout`. Stock macOS ships NEITHER
  (both come with coreutils); a blind `gtimeout ... grok ...` dies with
  exit 127 before the worker ever starts, and the failure reads like a lane
  failure. No timeout binary? Dispatch unwrapped and rely on background-job
  monitoring. If a flag misbehaves, re-check `grok --help`.

Claude subagent workers get a fully self-contained prompt: they have no
conversation history. Include the spec content (or its path), acceptance
command, and the final-report demand below, exactly as for the CLI lanes.

## Parallel Dispatch Without Collisions

Parallel workers step on each other in exactly one place: the files they
write. Pick an isolation strategy per fan-out, in this order of preference:

| Strategy | When | Cost |
|----------|------|------|
| **1. Disjoint file ownership** (default) | Units partition cleanly by file/module | Cheapest: shared tree, no merge step |
| **2. Sequential waves** | Unit B imports code unit A must first create, or B's spec can't be written until A's output is known | Wall-clock: waves serialize |
| **3. Worktree isolation** | Two workers genuinely must touch the SAME file, or overlap is uncertain | Coordinator absorbs the merge: integrate each diff here, re-run acceptance after every merge |

**Strategy 1 mechanics — this is the workhorse:**
- Every spec lists "files you may EDIT (only these)" and names the sibling
  tasks' files under "do NOT touch". The partition IS the lock.
- **Pin the seams verbatim in every spec.** Any contract two units share —
  type signatures, request/response body fields, storage keys, function
  names — is written exactly, in both specs, by the coordinator. Workers
  code against the contract, not against each other's unfinished files.
- Tell workers that type errors originating in a sibling task's not-yet-
  landed files are expected: report them, never "fix" them. Run the real
  whole-project typecheck yourself at the barrier.
- Hard rule: two concurrent workers writing one file in a shared tree is
  never acceptable — last write wins silently. Re-partition or use waves
  or worktrees instead.

**Strategy 2 mechanics:** dispatch in dependency order; a later wave's spec
may reference files an earlier wave landed. A unit that IMPORTS a sibling's
module but codes against a pinned contract does not need to wait — waves
are for when the spec itself cannot be finished, not for import edges. For
fan-outs larger than ~5 Claude subagents, `wave-coordinator` covers wave
sizing and context budgeting.

**Strategy 3 mechanics:** grok has native `--worktree`; codex sandboxes are
already isolated workspaces; for Claude subagents or manual lanes use git
worktrees directly (`superpowers:using-git-worktrees` where installed,
plain `git worktree add` otherwise). The isolation is the easy half — the
coordinator owns integration: review each worker's diff, merge or apply it
to the main tree here, and re-run acceptance after EACH integration, not
once at the end. If two isolated diffs rewrote the same lines, judgment
about which side wins is premium work; do not dispatch the merge.

Field note: strategy 1 with pinned contracts ran two real fan-outs (five
dispatches, then three) against one shared tree with zero integration
conflicts — the whole-project typecheck was green the moment the last
worker landed.

## Delegation Economics

- **Every dispatch has a fixed floor cost** — spec writing, context
  re-establishment, review. Splitting finer does not monotonically get
  cheaper; over-fragmented briefs raise the total. One owner per coherent
  unit; split at API boundaries, not mid-feature.
- **Verify the premise, not just the output.** Acceptance criteria only audit
  what is downstream of the decomposition. If the plan rests on a factual
  premise (an API's actual shape, a library's real behavior, "which files are
  involved"), spend one cheap dispatch verifying it before fanning out —
  perfectly executed tasks built on a wrong premise all pass review and are
  all wrong.
- **Fan out in parallel on independent units; hard barrier before shipping.**
  Keep planning/review work flowing while workers run, but wait for every
  outstanding dispatch before synthesis, cross-unit review, or any git
  operation that assumes the set is complete.
- **Infra failure ≠ quality failure.** A timeout, quota error, or dead run
  gets the same spec re-dispatched fresh. A quality miss gets one corrective
  re-dispatch with concrete feedback, then the two-strike escape hatch.
- **Race lanes on high-stakes work.** When correctness matters enough to pay
  twice, dispatch the SAME spec to two independent vendor lanes (codex +
  grok) and pick the stronger diff. A premium session judging two
  cross-vendor implementations gets three independent perspectives for one
  extra dispatch. Never race on routine work — that's paying double for
  volume.
- **Keep this session's context lean.** Everything in the premium context is
  re-read at premium prices every turn. Don't paste full worker logs or
  diffs when a path reference and an excerpt carry the decision; delegate
  broad exploration to cheap read-only agents and keep only conclusions.
- **No arbitrage on trivial work.** Dispatch overhead exceeds a one-liner; do
  those here while reviewing.

## Dispatch Protocol

1. **Spec first.** Write a `SPEC-<ticket>-<slug>.md` at the target repo root:
   objective, files/areas involved, interfaces (signatures, types, API shapes
   the code must match), constraints, acceptance criteria — the exact test
   command that must go green — and what NOT to touch. A spec that can't be
   finished means the decision isn't made yet: that's judgment work to do
   here, not ambiguity to hand to a cheaper model. For frontend
   work the spec carries the design intent: layout, states, interactions,
   spacing, motion, reference patterns. For the hardest parts, spec down to
   pseudocode — the thinking stays here; the typing still dispatches. Keep
   spec files untracked (never commit them).

2. **Every spec MUST include the environment clause** (verbatim or close):
   > If you hit an environment blocker (read-only path, no network, blocked
   > cache), STOP and report it. Never work around it by changing build
   > tooling, removing dependencies, reimplementing libraries, or deleting
   > assets. Environment artifacts are the dispatcher's problem, not a code
   > problem.

3. **Every dispatch prompt MUST demand a structured final report.** An
   uninstructed codex run frequently returns nothing usable — the work may
   even be done, silently. Append (verbatim or close):
   > End with a FINAL REPORT: files changed (paths), commands run and their
   > pass/fail, status of each acceptance criterion, and anything you could
   > not do and why. If you changed no files, say so explicitly and explain.
   If the report still comes back empty, don't re-dispatch blind — read the
   evidence directly: `git status`/`git diff` in the workspace, or the
   plugin's `/codex:result` job log. An empty report over a real diff is a
   reporting failure, not a work failure.

4. **Dispatch in the background — with write access. Always.**
   ```bash
   codex exec --sandbox workspace-write --cd <repo> "<one-line imperative; details in SPEC-*.md>"
   ```
   (A custom codex prompt like `/goal` may front the one-liner where the
   user's codex config defines one — optional local sugar, not required.)
   - Bare `codex exec` runs a **read-only** sandbox: the dispatch burns quota,
     writes nothing, and returns an apology. Never omit the flag (plugin
     path: never omit the write-capable run).
   - The sandbox has **no network**. Anything that fetches at build time
     (Google fonts, installs, codegen) will fail inside codex even though it
     passes for you. That is expected — the spec's environment clause covers it.
   - **If the task NEEDS external data, ship it offline.** Fetch the API
     response/catalog/fixture yourself, save it into the workspace (e.g.
     `SPEC-catalog-snapshot.json`), and spec an EXPLICIT override (env var or
     flag) that reads the file — never a silent fallback. The worker develops
     and tests against the snapshot; you re-verify live after review. A
     dispatch whose acceptance requires live network is a wasted dispatch.
   - **The project's bundler/build tool is sacrosanct.** Dev servers and some
     bundlers (Next 16 Turbopack) bind a port, which the sandbox forbids —
     builds then fail with `Operation not permitted`. Spec the fallback gate
     explicitly: "gate on `tsc --noEmit` + lint and REPORT the port error."
     The worker must never invoke or configure an alternative bundler (e.g.
     `next build --webpack`) even as a probe: its errors are pure noise for a
     Turbopack project, and 'fixing' them pollutes the diff. Treat any
     bundler-switch in output or diff as a sandbox artifact to revert.
   - Go repos: the default build cache lives outside the workspace. Tell the
     worker to use `GOCACHE=$PWD/.gocache` (and gitignore it) when the default
     is blocked.
   - Keep working while it runs: next spec, review of a prior dispatch,
     validation.

5. **Review the diff here — adversarially.** A worker under sandbox pressure
   produces *plausible workarounds*, not just bugs. Real failures seen in the
   field: removed `next/font` Google fonts to dodge the network; switched
   `next build` to `--webpack` to make a webpack-only alias apply; and
   **reimplemented a crypto signing library as a local shim aliased in at
   build time**. All three shipped a green build. Checklist before accepting:
   - [ ] `git diff` the build/tool config surface: `package.json` scripts,
     `next.config.*`, `tsconfig`, `Dockerfile`, CI files, lockfiles. Any
     change there needs an independent justification, not "build was failing".
   - [ ] Grep the diff for new aliases, shims, mocks, `patch-package`, vendored
     copies of dependencies. A "shim" for a real library is a red alert.
   - [ ] Fonts, remote assets, telemetry, analytics removed? Sandbox artifact.
     Revert and rebuild outside the sandbox before concluding anything.
   - [ ] Does the diff exceed the spec's "what NOT to touch" list?

6. **Re-run acceptance yourself, outside the sandbox.** Worker-green is a
   claim, not evidence — its environment differs from yours (network, caches,
   bundler). And when you chain the commands, remember that **piping to
   `tail`/`grep` swallows exit codes**: `bun test | tail -3 && git push` will
   push on a red suite. Run gating commands unpiped, or check exit status
   explicitly, before any commit or push.

7. **Ship from here.** Commit, push, PR from this session — never let a
   worker commit. Expect the remote to have moved if other sessions/loops
   share the repo: on rejected push, `git pull --no-rebase`, resolve (watch
   for conflicts whose sides each depend on shared closing lines — naive
   marker stripping breaks functions mid-body), then **re-run acceptance
   again** before the retry push.

## Visual Validation Loop (frontend)

1. Worker implements the UI per spec.
2. Run the app here — interact, screenshot, judge against the design intent.
3. Write concrete visual feedback (what's off, by how much, what good looks
   like) and re-dispatch.
4. Loop until it looks right; then diff review + git here.

Auth-gated UIs: you cannot enter credentials (hard boundary). Plan for it —
mock-data mode, a signed-in user session in the driven browser, or hand the
sign-in step to the user *early*, before the validation loop blocks on it.

## Background Subagent Etiquette (recon fan-outs)

Recon/research subagents spawned via the Agent tool sometimes go idle with a
bare idle notification instead of delivering their report:

- In every background-agent prompt, end with: "Your final message is the
  deliverable — send the complete report; do not stop after an
  acknowledgment."
- Stronger (belt and suspenders): also instruct "Before you finish or go
  idle for any reason, SendMessage your complete report to `main`. An idle
  notification is not a deliverable." Field data: even with the
  final-message line, roughly half of researcher agents in a fan-out idle
  without delivering; the explicit SendMessage instruction is what recovers
  the other half without a nudge round-trip.
- If an idle notification arrives without the report content, immediately
  SendMessage the agent: "Send your complete report to main now." One nudge
  recovers it; don't wait passively.
- Treat a second content-free idle from the same agent as a failed dispatch —
  re-run the recon yourself or spawn a fresh agent.

## Escape Hatch: When a Worker Struggles

Struggle must be **observed, not predicted**. Always dispatch first —
predicting "the worker can't do this" just means the spec needs
pseudocode-level detail. But two strikes and it's yours: if a re-dispatch
with concrete corrective feedback still comes back missing the acceptance
criteria or mangling the approach, stop re-dispatching and write the code
here yourself, salvaging whatever of the worker's diff is sound. Switching
lanes (codex ↔ grok, or CLI → Claude subagent) counts as a legitimate
second attempt when the failure smells worker-specific rather than
spec-specific.

Sandbox-artifact workarounds (fonts, bundler switches, shims) are NOT strikes
against a worker's ability — revert them, confirm the real build passes out
here, and keep dispatching. Strikes are about the actual implementation.

## Red Flags

| Thought | Reality |
|---------|---------|
| "Frontend is design-critical, so I'll code it here" | Taste shows up in the spec and the validation loop, not in typing JSX. Dispatch it. |
| "Faster to just write it myself" | Premium tokens on rote work. Spec it, dispatch it, validate in parallel. |
| "This part is too hard for a worker" | Predicted struggle is not observed struggle. Spec it at pseudocode level and dispatch. |
| "The worker says tests are green, ship it" | Its sandbox is not your machine. Re-run acceptance here, unpiped. |
| "The diff builds, the workaround is probably fine" | A green build via a shimmed dependency is a failure that compiles. Audit tool-config changes independently. |
| "I'll let the worker commit and push" | Review the diff and run git from this session. |
| "No time to write a spec" | An unspecced dispatch comes back wrong and costs more premium tokens to fix than the spec would have. |
| "More, smaller dispatches = cheaper" | Each dispatch has a floor cost. Over-fragmenting raises the bill and multiplies review surface. |
| "This code block in my plan is nearly done, I'll just finish it" | A code block longer than an interface signature or a few illustrative lines is a spec that hasn't been delegated yet. Stop and dispatch it. |
| "Quicker to fix the worker's bug myself" | Same failure in disguise — the premium session quietly absorbing volume. Send a corrected spec back to the lane. |
| "grok/codex isn't installed, I'll implement meanwhile" | That's a silent fallback. Report the lane unavailable, re-route explicitly, and only absorb work via the escape hatch. |

## Common Mistakes

- Dispatching codex without `--sandbox workspace-write` (raw CLI) or a
  write-capable run (plugin), or grok without `--permission-mode
  acceptEdits` → a worker that can't write; wasted dispatch, zero diff.
- Dispatching without acceptance criteria → the worker returns "done" with
  red tests. Always name the test command that must pass.
- Dispatching without the final-report demand → empty stdout over real (or
  absent) work; you burn a round-trip discovering which.
- Dispatching frontend work without design intent in the spec → generic UI
  comes back; the validation loop burns rounds recovering what the spec
  should have said.
- Blocking on a worker → run it in the background; keep doing planning/spec/
  validation work in parallel.
- Splitting one coherent unit across dispatches → pick one owner per unit;
  split at the API boundary, not mid-feature.
- Fanning out on an unverified premise → every downstream task passes review
  and the feature is still wrong. Verify the premise with a cheap dispatch
  first when it matters.
- Trusting piped exit codes in ship chains → a masked red suite goes to the
  remote. Gate pushes on unpiped commands.
