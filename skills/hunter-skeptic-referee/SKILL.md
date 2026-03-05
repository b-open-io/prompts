---
name: hunter-skeptic-referee
description: "This skill should be used when the user asks to 'find bugs', 'do a thorough code review', 'run a security audit', 'hunt for bugs', 'check for correctness issues', or 'review this code for edge cases'. Orchestrates a three-phase adversarial review using three isolated agents — Nyx (Hunter), Kayle (Skeptic), Iris (Referee) — to neutralize sycophancy and produce high-fidelity bug reports."
version: 1.1.0
---

# Hunter / Skeptic / Referee

An adversarial code review workflow designed by danpeguine (@danpeguine). Three agents run in isolated contexts — no agent sees what any other agent "wants" to hear. This eliminates sycophantic confirmation bias and produces ground-truth bug reports.

## Why Isolated Contexts

When a single agent both finds bugs and evaluates them, it anchors on its own earlier judgments. By resetting context between phases and giving each agent only what it needs, every verdict is genuinely independent. The Skeptic cannot see the Hunter's enthusiasm. The Referee cannot see the Skeptic's skepticism.

## The Three Agents

| Phase | Agent | Role |
|-------|-------|------|
| 1. Hunter | **Nyx** (code-auditor) | Find every possible bug. Maximize recall. False positives OK. |
| 2. Skeptic | **Kayle** (architecture-reviewer) | Challenge every finding. Disprove false positives. 2x penalty for wrong dismissals. |
| 3. Referee | **Iris** (tester) | Final arbiter. Weigh both sides. Produce ground truth. |

## How to Run

### Step 1 — Spawn the Hunter (Nyx)

Dispatch the code-auditor agent with the full codebase in context. Tell Nyx to operate in **Hunter mode**.

```
Agent(subagent_type="bopen-tools:code-auditor", prompt="
HUNTER MODE: You are the Hunter in a three-phase adversarial review.

Analyze the following codebase thoroughly and identify ALL potential bugs, issues, and anomalies.

Scoring:
- +1: Minor (edge cases, cosmetic)
- +5: Significant (functional issues, data inconsistencies)
- +10: Critical (security vulnerabilities, data loss, crashes)

Maximize your score. Be aggressive. Report anything that COULD be a bug. Missing a real bug is worse than a false positive.

For each bug:
1. File and line number
2. Description of the issue
3. Why it's a bug or failure mode
4. Severity score (+1/+5/+10)

End with your total score.

Codebase to audit: [SPECIFY FILES/DIRS]
")
```

Collect the numbered bug list.

### Step 2 — Spawn the Skeptic (Kayle)

Dispatch the architecture-reviewer agent with ONLY the Hunter's bug list and the specific code snippets referenced. Do NOT give the full codebase. Tell Kayle to operate in **Skeptic mode**.

```
Agent(subagent_type="bopen-tools:architecture-reviewer", prompt="
SKEPTIC MODE: You are the Skeptic in a three-phase adversarial review.

A previous reviewer identified the following potential bugs. Your job is to DISPROVE as many as possible.

Scoring:
- Disprove a bug: +[bug's original score] points
- Wrongly dismiss a real bug: -2x [bug's original score] points

For each bug:
1. Analyze the reported issue
2. Attempt to disprove it (explain why it's NOT a bug)
3. Confidence level (%)
4. Decision: CONFIRMED or DISMISSED
5. Points gained/risked

End with: total confirmed, total dismissed, your final score.

Bug report to challenge:
[PASTE HUNTER'S OUTPUT]

Relevant code snippets:
[PASTE ONLY THE CODE REFERENCED IN EACH FINDING]
")
```

### Step 3 — Spawn the Referee (Iris)

Dispatch the tester agent with the Hunter's findings AND the Skeptic's verdicts. Nothing else. Tell Iris to operate in **Referee mode**.

```
Agent(subagent_type="bopen-tools:tester", prompt="
REFEREE MODE: You are the Referee in a three-phase adversarial review.

You have: (1) Bug findings from the Hunter, (2) Challenges from the Skeptic.

IMPORTANT: I have the verified ground truth for each bug. You will be scored:
- +1: Correct judgment
- -1: Incorrect judgment

For each bug:
- Hunter's claim (summary)
- Skeptic's counter (summary)
- Your analysis
- VERDICT: REAL BUG or NOT A BUG
- Confidence: High / Medium / Low

Final summary:
- Total confirmed as real
- Total dismissed
- Ranked list of confirmed bugs by severity

Be precise. You are being scored against ground truth.

Hunter's findings:
[PASTE HUNTER'S OUTPUT]

Skeptic's verdicts:
[PASTE SKEPTIC'S OUTPUT]
")
```

### Step 4 — Present the Report

The Referee's output is the authoritative bug report. Present it to the user with confirmed bugs ranked by severity.

## Context Boundary Rules

| Phase | Gets access to |
|-------|---------------|
| Hunter (Nyx) | Full codebase |
| Skeptic (Kayle) | Bug list + referenced code snippets only |
| Referee (Iris) | Hunter findings + Skeptic verdicts only |

**Violating these boundaries reintroduces the sycophancy problem.** If the Skeptic sees the Hunter's confidence, it anchors on it. If the Referee sees either agent's emotional register, it drifts toward consensus rather than truth.

## Severity Reference

| Score | Meaning |
|-------|---------|
| +1 | Minor — unlikely edge case, low impact |
| +5 | Significant — affects correctness under reachable conditions |
| +10 | Critical — security vulnerability, data loss, or system corruption |

## When to Use

- Pre-release security audits
- Reviewing unfamiliar or legacy codebases
- High-stakes modules (auth, payments, data integrity)
- Pull requests with broad scope or architectural changes

For quick informal reviews, just use Nyx directly in normal mode.
