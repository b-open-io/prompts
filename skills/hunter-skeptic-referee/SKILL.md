---
name: hunter-skeptic-referee
description: "This skill should be used when the user asks to 'find bugs', 'do a thorough code review', 'run a security audit', 'hunt for bugs', 'check for correctness issues', or 'review this code for edge cases'. Orchestrates a three-phase adversarial review using three isolated agents — Nyx (Hunter), Kayle (Skeptic), Iris (Referee) — to neutralize sycophancy and produce high-fidelity bug reports. User-facing command: /bug-hunt"
version: 1.1.1
user-invocable: false
---

# Hunter / Skeptic / Referee

An adversarial code review workflow designed by danpeguine (@danpeguine). Three agents run in isolated contexts — no agent sees what any other agent "wants" to hear. This eliminates sycophantic confirmation bias and produces ground-truth bug reports.

**User command:** `/bug-hunt [path | -b branch [--base base]]`

## Why Isolated Contexts

When a single agent both finds bugs and evaluates them, it anchors on its own earlier judgments. By resetting context between phases and giving each agent only what it needs, every verdict is genuinely independent. The Skeptic cannot see the Hunter's enthusiasm. The Referee cannot see the Skeptic's skepticism.

## The Three Agents

| Phase | Agent | Subagent Type | Role |
|-------|-------|---------------|------|
| 1. Hunter | **Nyx** | `bopen-tools:code-auditor` | Find every possible bug. Maximize recall. False positives OK. |
| 2. Skeptic | **Kayle** | `bopen-tools:architecture-reviewer` | Challenge every finding. Risk/EV calculation. 2x penalty for wrong dismissals. |
| 3. Referee | **Iris** | `bopen-tools:tester` | Final arbiter. Read code independently. Produce ground truth. |

## Target Resolution

The skill supports two modes:

**Path mode** (default): Scan a file, directory, or the entire project.
```
/bug-hunt              # Entire project
/bug-hunt src/         # Directory
/bug-hunt lib/auth.ts  # Specific file
```

**Branch diff mode** (`-b`): Scan only files changed between branches. Reads full file contents, not just diffs.
```
/bug-hunt -b feature-xyz              # vs main
/bug-hunt -b feature-xyz --base dev   # vs dev
```

For branch diff mode: `git diff --name-only <base>...<branch>` to get the file list.

## Scoring Systems

### Hunter (+1/+5/+10)
| Score | Meaning |
|-------|---------|
| +1 | Low — minor edge case, cosmetic, code smell |
| +5 | Medium — functional issue, data inconsistency, missing validation |
| +10 | Critical — security vulnerability, data loss, race condition, crash |

### Skeptic (risk-calibrated)
- Disprove a false positive: **+[bug's original points]**
- Wrongly dismiss a real bug: **-2x [bug's original points]**
- **EV formula:** `EV = (confidence% × points) - ((100 - confidence%) × 2 × points)`
- Only DISPROVE when EV is positive (confidence > 67%)

### Referee (symmetric ±1)
- Correct judgment: **+1**
- Incorrect judgment: **-1**
- Framed against "known ground truth" to induce precision

## Structured Output Format

All three agents use a consistent BUG-ID format for cross-phase traceability:

**Hunter output:**
```
**BUG-[N]** | Severity: [Low/Medium/Critical] | Points: [1/5/10]
- **File:** [path]
- **Line(s):** [number or range]
- **Category:** [logic|security|error-handling|concurrency|edge-case|performance|data-integrity|type-safety|other]
- **Claim:** [one sentence]
- **Evidence:** [code quote]
```

**Skeptic output:**
```
**BUG-[N]** | Original: [points] pts
- **Counter-argument:** [technical argument citing code]
- **Evidence:** [code quote]
- **Confidence:** [0-100]%
- **Risk calc:** EV = ...
- **Decision:** DISPROVE / ACCEPT
```

**Referee output:**
```
**BUG-[N]**
- **Hunter's claim:** [summary]
- **Skeptic's response:** [DISPROVE/ACCEPT + summary]
- **Your analysis:** [independent assessment]
- **VERDICT: REAL BUG / NOT A BUG**
- **Confidence:** High / Medium / Low
- **True severity:** [Low/Medium/Critical]
- **Suggested fix:** [brief direction]
```

## Execution Protocol

### Step 1 — Resolve target

Parse arguments for path mode vs branch diff mode. In branch diff mode, run `git diff --name-only` to get the file list.

### Step 2 — Spawn the Hunter (Nyx)

Dispatch `bopen-tools:code-auditor` with the target scope. The Hunter uses Glob/Read/Grep to examine actual code. Must NOT speculate about unread files.

### Step 2b — Early exit check

If Hunter reports **TOTAL FINDINGS: 0**, skip Skeptic and Referee. Present a clean report directly.

### Step 3 — Spawn the Skeptic (Kayle)

Dispatch `bopen-tools:architecture-reviewer` with ONLY the structured bug list (BUG-IDs, files, lines, claims, evidence, severity). Do NOT pass the full codebase or any narrative text. The Skeptic reads code independently.

### Step 4 — Spawn the Referee (Iris)

Dispatch `bopen-tools:tester` with the Hunter's full report AND the Skeptic's full report. The Referee reads code independently.

### Step 5 — Present the report

Display the Referee's verified report:
1. Summary stats (found / dismissed / confirmed by severity)
2. Confirmed bugs table sorted by severity
3. Low-confidence items flagged for manual review
4. Collapsed `<details>` section with dismissed bugs for transparency

A clean report (zero confirmed bugs) is a valid result — say so clearly.

## Context Boundary Rules

| Phase | Gets access to |
|-------|---------------|
| Hunter (Nyx) | Full codebase (or changed files in branch diff mode) |
| Skeptic (Kayle) | Structured bug list + referenced file paths only |
| Referee (Iris) | Hunter findings + Skeptic verdicts only |

**Violating these boundaries reintroduces the sycophancy problem.** If the Skeptic sees the Hunter's confidence, it anchors on it. If the Referee sees either agent's emotional register, it drifts toward consensus rather than truth.

## When to Use

- Pre-release security audits
- Reviewing unfamiliar or legacy codebases
- High-stakes modules (auth, payments, data integrity)
- Pull requests with broad scope or architectural changes
- Branch review before merge (`-b` mode)

For quick informal reviews, just use Nyx directly in normal mode.
