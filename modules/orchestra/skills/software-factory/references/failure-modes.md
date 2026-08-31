# Loop Failure Modes & Guards

Loops do not crash — they fail quietly and bill you in silence. Each mode below has a cheap guard; design them in before you automate. If you only do two things: use an **objective external gate** (not LLM self-assessment) and a **pre-flight budget breaker**. Those two prevent the most damage.

## 1. Ralph Wiggum loop (premature done)

The agent decides it's finished too early, exits on a half-done job (sometimes even tags the commit), and the loop keeps running and spending while producing nothing. Named by Geoffrey Huntley.
**Guard:** an external verifier with an objective exit code, never the maker's self-assessment. Our `confess` and `superpowers:verification-before-completion` skills also fight premature-done — wire them into the checker step.

## 2. Silent runaway / infinite loop

No crash; the model "tries to be helpful" and retries forever. Documented real cases: $16K–$50K in hours, $47K over days.
**Guard:** pre-flight circuit breaker (check budget *before* each call), hard iteration cap, wall-clock timeout, and an alert on cost *velocity* (not just total).

## 3. Context rot / clipping

As the window fills, earlier specs drop out and the agent loses grounding, producing drift.
**Guard:** deterministically re-inject the specs/plan each iteration (the Ralph "stack allocation" pattern). Keep curated decision-grade context, not an ever-growing append. Each iteration should cold-start from the state file.

## 4. Phantom implementation (assume without verify)

The agent assumes a function/endpoint exists and calls it, or builds against an API that isn't there.
**Guard:** a mandatory "search the codebase first, don't assume unimplemented" step before any implementation. Dispatch a read-only search subagent for this.

## 5. Scope creep / over-generation

Single-task-per-iteration discipline slips and the agent adds unrequested features.
**Guard:** strict one-task-per-iteration scoping in the prompt; backpressure from a failing gate; a frozen spec the iteration can't mutate.

## 6. Comprehension debt

"The faster the loop ships code you didn't write, the bigger the gap between what exists and what you understand" (Addy Osmani). The loop outruns human understanding of the codebase.
**Guard:** structured human review of diffs at intervals; maker/checker with a human attestation before downstream systems consume the output.

## 7. Unintelligible auto-merged PRs

The loop writes GitHub titles that start with ticket ids and bodies that dump
checker state, handoff comments, or controlled English. Auto-merge means no
human rewrites them. A maintainer cannot scan what shipped. Field case: Scribe,
2026-08. T3 Code avoids this by always-on `AGENTS.md` plus a human still
reading the PR; a loop that merges unattended needs code.
**Guard:** treat PRs as human artifacts (`human-artifacts.md`). Scaffold
`scripts/lint-pr.sh` + `.github/workflows/pr-lint.yml` + an AGENTS.md **Pull
requests** section. Run the linter before `gh pr create`. Put loop process in a
PR comment. Observe the linter reject a bad title once during prove-phase.

## 8. Cognitive surrender / rubber-stamping

Operators accept output because it *looks* complete, and approval fatigue sets in when asked too often.
**Guard:** a review surface that forces comparison of output against the original spec commitment; reserve human gates for irreversible (High-tier) actions only.

## 9. Tool nondeterminism

Search/ripgrep returns different results across runs, causing duplicate work or wrong conclusions.
**Guard:** explicit "search first, don't assume" instructions; isolate expensive/variable search in subagents; pin tool versions where it matters.

## 10. Injection propagation

Malicious content in tool output poisons the agent's context and propagates across iterations or to sibling agents. Severity scales with persistence: session-scoped → memory-persistent → cross-agent → shared state.
**Guard:** inspect content at communication boundaries; treat tool output as untrusted; scope what the loop can act on (lethal-trifecta awareness: untrusted input + private data + exfiltration channel).

## 11. State corruption (the cleanup gap)

Verification mutates real state (bogus rows, test users, orphaned files/webhooks); over many iterations the loop poisons its own environment.
**Guard:** prefer ephemeral environments so there's nothing to clean; otherwise register teardown for every mutation, or explicitly accept the leftover for that project. See `config-questionnaire.md` field 4.

## 12. Factory escapes its own boundary

The runner is propose-only, but the setup session commits the runner or its
policy directly to the default branch. The factory is safe only after it
starts, while its constitution remains writable by the same unconstrained
identity.
**Guard:** treat bootstrap and factory-policy changes as High-tier. Create them
on a feature branch through a human-review PR, enforce the default branch at
the forge, and give the worker a distinct non-bypass identity. Verify the live
rule with `repository-policy.md`; never trust a prompt or local hook as the
authorization boundary.

## Pre-ship checklist

Before automating, confirm a guard exists for each mode above, plus:

- [ ] Objective external gate that has been observed to *reject* bad output
- [ ] Three stop conditions present (success, failure/cap, budget)
- [ ] Pre-flight cost breaker tested (it actually fires)
- [ ] State file is cold-start readable
- [ ] Never-touch list defined and loaded each pass
- [ ] Blast-radius tier assigned; High-tier actions human-gated
- [ ] If the loop opens PRs: `lint-pr.sh` is wired and has been observed to reject a bad title
- [ ] Bootstrap/policy changes use PRs; live default-branch protection and worker identity were verified

## The mega-skill

**Symptom:** one skill file contains the entire workflow — build instructions, every check on the validation ladder, routing rules, ticket updates — and a single agent context interprets all of it.

**Why it fails:** each step becomes untestable in isolation, failures surface as vague mid-transcript drift instead of a red exit code, and deterministic work (lint, typecheck, tests, status updates) burns tokens and picks up hallucination risk it never needed. The reliability ranking is code > engineer > agent; a mega-skill staffs everything with the least reliable actor.

**Guard:** separate code from agents. Run the maker agent via the SDK or dispatch primitive, run each gate as its own deterministic command, and route failures back to the maker with the same session ID so it keeps its context. The skill's job is the judgment layer — what "done" means, what never to touch — never the pipeline itself.
