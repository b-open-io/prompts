---
name: hunter-skeptic-referee
description: This skill should be used when the user asks to "find bugs", "do a thorough code review", "run a security audit", "hunt for bugs", "check for correctness issues", or "review this code for edge cases". This skill implements a three-phase adversarial bug-finding workflow that neutralizes sycophancy by isolating each reviewer's context. Invoke before any major bug hunt, code review, or security audit.
version: 1.0.0
---

# Hunter / Skeptic / Referee

A three-phase adversarial code review workflow designed by danpeguine (@danpeguine). Each phase runs in an isolated context to prevent sycophancy contamination — no agent knows what any other agent "wants" to hear.

## Why Isolated Contexts

The core insight: when a single agent both finds bugs and evaluates them, it anchors on its own earlier judgments. By resetting context between phases and giving each agent only what it needs, every verdict is genuinely independent. The Skeptic cannot see the Hunter's enthusiasm. The Referee cannot see the Skeptic's skepticism. Each agent reasons from first principles.

## The Three-Phase Workflow

### Phase 1 — Hunter

**Goal:** Find every real bug. Maximize recall at the cost of precision.

**Context to provide:** Full codebase (or the full relevant module/file set).

**Scoring incentive:** Hunter is scored on thoroughness. Finding a real bug that gets confirmed is rewarded. Missing a bug is penalized more than a false positive.

**Focus areas:**
- Off-by-one errors
- Null/undefined handling gaps
- Race conditions and concurrency issues
- Incorrect assumptions about inputs or state
- Missing error handling
- Security vulnerabilities (injection, auth bypass, data exposure)
- Data corruption risks

**Output format:** For each issue found:
- Clear description of the issue
- Exact code location (file, line, function)
- Explanation of why it is a bug or failure mode
- Severity score: `+1` (minor), `+5` (significant), `+10` (critical / security / data loss)

**Hunter system prompt:**

> You are a senior engineer reviewing code for correctness and edge cases.
>
> Your job is to find as many real bugs and correctness issues as possible. For each issue found:
> - Describe the issue clearly
> - Show the exact code location
> - Explain why it's a bug or failure mode
> - Assign a severity score: +1 (minor), +5 (significant), +10 (critical/security/data loss)
>
> Focus on: off-by-one errors, null/undefined handling, race conditions, incorrect assumptions, missing error handling, security issues, data corruption risks.
>
> Be aggressive. Find everything. You are scored on thoroughness.

---

### Phase 2 — Skeptic

**Goal:** Filter false positives. Maximize precision.

**Context to provide:** The Hunter's bug list + only the specific code snippets referenced in each finding. Do NOT give the Skeptic the full codebase or the Hunter's reasoning — only the findings and the relevant excerpts.

**Scoring incentive:** The Skeptic is penalized 2x for dismissing a real bug. This makes it precise but not lenient — it cannot dismiss carelessly.

**Challenges to apply to each finding:**
- Is this actually a bug, or is it intentional behavior?
- Is the problematic code path reachable in practice?
- Does surrounding context (callers, validators, types) prevent the issue?
- Is there existing handling elsewhere that makes this a non-issue?

**Output format:** For each item: `CONFIRMED` (real bug) or `DISMISSED` (false positive), with a clear explanation for dismissed items.

**Skeptic system prompt:**

> You are a senior engineer reviewing a bug report for false positives.
>
> A previous reviewer identified the following potential issues. Your job is to challenge each one:
> - Is this actually a bug, or is it by design?
> - Is the problematic code path actually reachable?
> - Does the surrounding context make this a non-issue?
> - Is there existing handling that prevents the issue?
>
> For each item, verdict: CONFIRMED (real bug) or DISMISSED (false positive).
> For dismissed items, explain why clearly.
>
> Note: If you dismiss a real bug, you get a -2x penalty on your score. Be precise, not lenient.

---

### Phase 3 — Referee

**Goal:** Produce ground truth. Resolve disputes objectively.

**Context to provide:** The Hunter's original findings AND the Skeptic's verdicts. Nothing else.

**Role:** The Referee has no stake in either side. It weighs evidence from both and makes a final call. Its output is the authoritative bug report.

**Scoring:** `+1` for each confirmed issue, `-1` for each dismissed issue (to reflect actual signal quality in the Hunter's original report).

**Output format:** For each issue: final `CONFIRMED` or `DISMISSED` judgment with reasoning. Produce a final ranked list of confirmed bugs sorted by severity.

**Referee system prompt:**

> You are a senior engineer making final judgments on a disputed bug report.
>
> You have: (1) The original bug findings, (2) The skeptic's challenges.
>
> For each issue:
> - Weigh the hunter's evidence against the skeptic's rebuttal
> - Make a final CONFIRMED or DISMISSED judgment
> - Add +1 if confirmed, -1 if dismissed (to reflect actual signal quality)
>
> Your output is the ground truth. Be objective.

---

## How to Run This Workflow

1. **Spawn Hunter** with the full codebase in context. Collect the numbered bug list.
2. **Reset context** (new conversation or subagent). Do not carry the Hunter's reasoning forward.
3. **Spawn Skeptic** with: the numbered bug list + code snippets for each finding only. Collect verdicts.
4. **Reset context** again.
5. **Spawn Referee** with: Hunter findings + Skeptic verdicts only. Collect final report.
6. **Present final report** to the user: confirmed bugs ranked by severity, dismissed items with rationale.

In Claude Code, the natural implementation is three sequential subagent Task calls with explicit context boundaries — pass only what each phase needs, nothing more.

## Context Boundary Rules

| Phase | Gets access to |
|-------|---------------|
| Hunter | Full codebase |
| Skeptic | Bug list + referenced code snippets only |
| Referee | Hunter findings + Skeptic verdicts only |

Violating these boundaries reintroduces the sycophancy problem. If the Skeptic sees the Hunter's confidence, it anchors on it. If the Referee sees either agent's emotional register, it drifts toward consensus rather than truth.

## Severity Reference

| Score | Meaning |
|-------|---------|
| +1 | Minor — unlikely edge case, low impact |
| +5 | Significant — affects correctness under reachable conditions |
| +10 | Critical — security vulnerability, data loss, or system corruption |

## When to Use This Workflow

Use the full three-phase workflow for:
- Pre-release security audits
- Reviewing unfamiliar or legacy codebases
- High-stakes modules (auth, payments, data integrity)
- Pull requests with broad scope or architectural changes

Use only the Hunter phase for quick, informal reviews where speed matters more than precision.
