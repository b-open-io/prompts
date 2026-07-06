---
name: arbitrage
description: Always active when coding in a Claude (Fable/Opus) session alongside a codex quota. Triggers whenever implementation work is being planned, scoped, or about to start — before writing any code — to decide where each piece of work executes. Routes judgment (planning, specs, design intent, review, visual validation, git) to the premium session and all code-writing volume to codex dispatches, with guardrails learned from real dispatch failures.
---

# Arbitrage

Premium-model tokens are expensive; the user's codex quota sits unused.
Exploit the price gap: spend premium tokens on judgment — planning, specs,
design intent, review, visual validation — and spend codex quota on all
code-writing volume.

**You ARE the premium session.** "Here" means you do it yourself. There is no
separate model to delegate judgment to.

## Routing Table

| Work | Where | Why |
|------|-------|-----|
| Planning, specs, architecture decisions | Here | Judgment is what the premium model is paid for |
| **ALL implementation — backend, frontend, anything that writes code** | codex via `/goal` | Quota is free; typing code is not where premium adds value |
| Visual validation of UI work (run the app, screenshot, judge, iterate) | Here | The design eye is worth the price — validate, don't type |
| Investigation and debugging analysis (root-causing hard bugs) | Here | Judgment work; the resulting fix dispatches with a precise spec |
| Diff review, commits, pushes, PRs | Here | Git operations stay under your control |
| Trivial edits riding along with review/validation (one-liners, any layer) | Here | Dispatch overhead exceeds the work |
| Work codex has demonstrably struggled with | Here | Escape hatch — see below |

## Dispatch Protocol

1. **Spec first.** Write a `SPEC-<ticket>-<slug>.md` at the target repo root:
   objective, constraints, files/areas involved, acceptance criteria — the
   exact test command that must go green — and what NOT to touch. For frontend
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

3. **Dispatch in the background with the sandbox flag — always:**
   ```bash
   codex exec --sandbox workspace-write --cd <repo> "/goal <one-liner; details in SPEC-*.md>"
   ```
   - Bare `codex exec` runs a **read-only** sandbox: the dispatch burns quota,
     writes nothing, and returns an apology. Never omit the flag.
   - The sandbox has **no network**. Anything that fetches at build time
     (Google fonts, installs, codegen) will fail inside codex even though it
     passes for you. That is expected — the spec's environment clause covers it.
   - Go repos: the default build cache lives outside the workspace. Tell codex
     to use `GOCACHE=$PWD/.gocache` (and gitignore it) when the default is
     blocked.
   - Keep working while it runs: next spec, review of a prior dispatch,
     validation.

4. **Review the diff here — adversarially.** Codex under sandbox pressure
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

5. **Re-run acceptance yourself, outside the sandbox.** Codex-green is a
   claim, not evidence — its environment differs from yours (network, caches,
   bundler). And when you chain the commands, remember that **piping to
   `tail`/`grep` swallows exit codes**: `bun test | tail -3 && git push` will
   push on a red suite. Run gating commands unpiped, or check exit status
   explicitly, before any commit or push.

6. **Ship from here.** Commit, push, PR from this session — never let codex
   commit. Expect the remote to have moved if other sessions/loops share the
   repo: on rejected push, `git pull --no-rebase`, resolve (watch for
   conflicts whose sides each depend on shared closing lines — naive marker
   stripping breaks functions mid-body), then **re-run acceptance again**
   before the retry push.

## Visual Validation Loop (frontend)

1. codex implements the UI per spec.
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
- If an idle notification arrives without the report content, immediately
  SendMessage the agent: "Send your complete report to main now." One nudge
  recovers it; don't wait passively.
- Treat a second content-free idle from the same agent as a failed dispatch —
  re-run the recon yourself or spawn a fresh agent.

## Escape Hatch: When codex Struggles

Struggle must be **observed, not predicted**. Always dispatch first —
predicting "codex can't do this" just means the spec needs pseudocode-level
detail. But two strikes and it's yours: if a re-dispatch with concrete
corrective feedback still comes back missing the acceptance criteria or
mangling the approach, stop re-dispatching and write the code here yourself,
salvaging whatever of codex's diff is sound.

Sandbox-artifact workarounds (fonts, bundler switches, shims) are NOT strikes
against codex's ability — revert them, confirm the real build passes out here,
and keep dispatching. Strikes are about the actual implementation.

## Red Flags

| Thought | Reality |
|---------|---------|
| "Frontend is design-critical, so I'll code it here" | Taste shows up in the spec and the validation loop, not in typing JSX. Dispatch it. |
| "Faster to just write it myself" | Premium tokens on rote work. Spec it, dispatch it, validate in parallel. |
| "This part is too hard for codex" | Predicted struggle is not observed struggle. Spec it at pseudocode level and dispatch. |
| "codex says tests are green, ship it" | Its sandbox is not your machine. Re-run acceptance here, unpiped. |
| "The diff builds, the workaround is probably fine" | A green build via a shimmed dependency is a failure that compiles. Audit tool-config changes independently. |
| "I'll let codex commit and push" | Review the diff and run git from this session. |
| "No time to write a spec" | An unspecced dispatch comes back wrong and costs more premium tokens to fix than the spec would have. |

## Common Mistakes

- Dispatching without `--sandbox workspace-write` → read-only sandbox, wasted
  dispatch, zero diff.
- Dispatching without acceptance criteria → codex returns "done" with red
  tests. Always name the test command that must pass.
- Dispatching frontend work without design intent in the spec → generic UI
  comes back; the validation loop burns rounds recovering what the spec
  should have said.
- Blocking on codex → run it in the background; keep doing planning/spec/
  validation work in parallel.
- Splitting one coherent unit across dispatches → pick one owner per unit;
  split at the API boundary, not mid-feature.
- Trusting piped exit codes in ship chains → a masked red suite goes to the
  remote. Gate pushes on unpiped commands.
