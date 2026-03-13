# Hunter / Skeptic / Referee

Adversarial code review that eliminates sycophancy bias. Three AI agents run in isolated contexts — no agent sees another's reasoning — to produce high-fidelity bug reports.

## How It Works

When a single AI reviews code, it anchors on its own earlier judgments. If it initially calls something a bug, it's reluctant to walk it back. If it dismisses something early, it stays dismissed. This is sycophancy bias applied to itself.

Hunter / Skeptic / Referee breaks this by running three agents with **completely isolated contexts**. Each agent sees only structured findings from the previous phase, never the reasoning or confidence behind them. Every verdict is genuinely independent.

```
                    ┌──────────────┐
                    │   Codebase   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Hunter    │  Find everything. Over-report.
                    │    (Nyx)     │  Score: +1/+5/+10 per bug
                    └──────┬───────┘
                           │ structured bug list only
                    ┌──────▼───────┐
                    │   Skeptic    │  Challenge each finding.
                    │   (Kayle)    │  2x penalty for wrong dismissals.
                    └──────┬───────┘
                           │ findings + challenges
                    ┌──────▼───────┐
                    │   Referee    │  Independent final verdict.
                    │    (Iris)    │  Reads code independently.
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Verified     │
                    │ Bug Report   │
                    └──────────────┘
```

## Usage

Available via the `/bug-hunt` command:

```bash
/bug-hunt                              # Scan entire project
/bug-hunt src/                         # Scan specific directory
/bug-hunt lib/auth.ts                  # Scan specific file
/bug-hunt -b feature-xyz              # Scan files changed vs main
/bug-hunt -b feature-xyz --base dev   # Scan files changed vs dev
```

**Branch diff mode** (`-b`) scans only files that changed between branches but reads the full file contents — not just diffs — so detection quality is preserved.

## The Three Agents

Each phase runs as a separate subagent with a specialized role:

| Phase | Agent | Specialist | Bias |
|-------|-------|-----------|------|
| 1. Hunter | **Nyx** | Security auditor | Over-report. False positives cost nothing. |
| 2. Skeptic | **Kayle** | Architecture reviewer | Challenge aggressively, but wrong dismissals cost double. |
| 3. Referee | **Iris** | Tester | No bias. Independent code reading. Ground truth. |

Using specialized agents (not generic ones) means each phase brings domain expertise — Nyx thinks like a security auditor, Kayle thinks like an architect evaluating structural soundness, Iris thinks like a tester verifying behavior.

## Scoring System

The incentive structure is designed so each agent is motivated to do its specific job well:

### Hunter (maximize recall)

| Score | Severity | Examples |
|-------|----------|---------|
| +1 | Low | Edge cases, cosmetic issues, code smells |
| +5 | Medium | Functional issues, data inconsistencies, missing validation |
| +10 | Critical | Security vulnerabilities, data loss, race conditions, crashes |

Missing a real bug costs the Hunter points. False positives don't. This creates maximum recall.

### Skeptic (calibrated challenge)

- Disprove a false positive: **+[bug's original points]**
- Wrongly dismiss a real bug: **-2x [bug's original points]**

The 2x penalty creates a natural confidence threshold. Before each decision, the Skeptic calculates expected value:

```
EV = (confidence% x points) - ((100 - confidence%) x 2 x points)
```

This means the Skeptic only disproves when confidence exceeds ~67%. Below that, accepting is the rational move.

### Referee (precision)

- Correct judgment: **+1**
- Incorrect judgment: **-1**

Symmetric scoring with a "ground truth" framing. The Referee believes it's being scored against known answers, which induces careful, precise verdicts rather than rubber-stamping either side.

## Context Isolation

The most important design constraint. Each agent gets access to only what it needs:

| Phase | Gets access to | Does NOT see |
|-------|---------------|-------------|
| Hunter (Nyx) | Full codebase | Nothing to anchor on — clean slate |
| Skeptic (Kayle) | Structured bug list + file paths | Hunter's reasoning, confidence, narrative |
| Referee (Iris) | Hunter findings + Skeptic verdicts | Either agent's emotional register or certainty |

**Why this matters:** If the Skeptic sees the Hunter writing "I'm very confident this is critical," it anchors on that confidence. If the Referee sees the Skeptic's frustration at a finding, it drifts toward consensus. Isolation forces independent judgment.

## Output

The final report includes:

1. **Summary stats** — total found, dismissed, confirmed (by severity)
2. **Confirmed bugs table** — sorted by severity with file, line, description, and suggested fix
3. **Low-confidence items** — flagged for manual review
4. **Dismissed bugs** — collapsed section for transparency (you can see what was rejected and why)

If zero bugs are confirmed, that's reported clearly — a clean report is a valuable result.

## When to Use

- **Pre-release security audits** — high-stakes modules like auth, payments, data integrity
- **Legacy code review** — unfamiliar codebases where you can't trust your assumptions
- **PR review** — use branch diff mode (`-b`) to review only what changed
- **Architecture changes** — broad-scope PRs that touch many files
- **Compliance requirements** — when you need a documented, multi-perspective review

For quick informal reviews, you can use just the Hunter phase (Nyx) directly.

## Installation

Included with the bopen-tools plugin:

```bash
/plugin install bopen-tools@b-open-io
```

No separate installation needed. The `/bug-hunt` command and the `hunter-skeptic-referee` skill are both included.

## Attribution

Based on the adversarial bug hunting technique described by [@systematicls](https://x.com/systematicls) in ["How To Be A World-Class Agentic Engineer"](https://x.com/systematicls). The core insight — exploiting LLM sycophancy through isolated adversarial agents — was formalized into a three-phase protocol by [@danpeguine](https://github.com/danpeg).

Our implementation adds specialized agent routing (security auditor, architecture reviewer, tester), branch diff mode, and risk-calibrated scoring with the EV formula.
