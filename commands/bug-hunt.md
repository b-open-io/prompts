---
allowed-tools: Agent, Bash(git:*)
description: Adversarial bug hunt with 3 isolated agents — Hunter finds bugs, Skeptic challenges them, Referee gives final verdicts
argument-hint: "[path | -b <branch> [--base <base>]]"
---

## Your Task

If the arguments contain "--help", show this help and exit:

**bug-hunt** - Adversarial bug hunt with three isolated agents

**Usage:**
```
/bug-hunt                              # Scan entire project
/bug-hunt src/                         # Scan specific directory
/bug-hunt lib/auth.ts                  # Scan specific file
/bug-hunt -b feature-xyz              # Scan files changed vs main
/bug-hunt -b feature-xyz --base dev   # Scan files changed vs dev
```

**How it works:**
1. **Hunter (Nyx)** - Aggressively finds every possible bug (+1/+5/+10 scoring)
2. **Skeptic (Kayle)** - Challenges each finding with risk/EV calculation, 2x penalty for wrong dismissals
3. **Referee (Iris)** - Independent final verdict, reads code independently

Each agent runs in an isolated context — no agent sees another's reasoning, eliminating sycophantic confirmation bias.

**Branch diff mode (`-b`):**
Scans only files that changed between branches, but reads full file contents (not just diffs) to preserve detection quality.

Then stop.

Otherwise, run the adversarial bug hunt:

### Step 1: Parse arguments and resolve target

Arguments: `$ARGUMENTS`

1. If arguments contain `-b <branch>`: **branch diff mode**
   - Extract branch name after `-b`
   - If `--base <base>` present, use that. Otherwise default to `main`
   - Run `git diff --name-only <base>...<branch>` to get changed files
   - If command fails (branch not found), report error and stop
   - If no files changed, tell user and stop
   - Target = the list of changed files (scan full contents, not diffs)

2. If arguments do NOT contain `-b`: treat as **path target**
   - If empty, scan current working directory
   - Otherwise scan the specified path

### Step 2: Run the Hunter (Nyx)

Launch the code-auditor agent to find all potential bugs.

```
Agent(subagent_type: "bopen-tools:code-auditor", prompt: "
HUNTER MODE — You are Nyx, the Hunter in a three-phase adversarial review.

Analyze the target codebase thoroughly. Use Glob to discover files, Read to examine them. Trace logic, follow data flow, check error handling, look at edge cases.

Do NOT speculate about files you haven't read.

Scoring:
- +1: Low impact (edge cases, cosmetic, code smells)
- +5: Medium impact (functional issues, data inconsistencies, missing validation)
- +10: Critical impact (security vulnerabilities, data loss, race conditions, crashes)

Maximize your score. Report anything that COULD be a bug — false positives cost nothing, but missing a real bug means lost points.

For each finding, use this EXACT format:

---
**BUG-[number]** | Severity: [Low/Medium/Critical] | Points: [1/5/10]
- **File:** [exact file path]
- **Line(s):** [line number or range]
- **Category:** [logic | security | error-handling | concurrency | edge-case | performance | data-integrity | type-safety | other]
- **Claim:** [One sentence — what is wrong]
- **Evidence:** [Quote the specific code]
---

End with:
**TOTAL FINDINGS:** [count]
**TOTAL SCORE:** [sum of points]

TARGET: [INSERT RESOLVED TARGET HERE]
")
```

Collect the full output.

### Step 2b: Check for findings

If the Hunter reported **TOTAL FINDINGS: 0**, skip Steps 3-4. Go to Step 5 with a clean report. No need to run Skeptic and Referee on zero findings.

### Step 3: Run the Skeptic (Kayle)

Launch the architecture-reviewer agent with ONLY the Hunter's bug list. Do NOT pass the full codebase — the Skeptic must read code independently.

```
Agent(subagent_type: "bopen-tools:architecture-reviewer", prompt: "
SKEPTIC MODE — You are Kayle, the Skeptic in a three-phase adversarial review.

A previous reviewer identified potential bugs. Your job is to rigorously challenge each one.

For EACH bug: Read the actual code at the reported file and line. Do NOT argue theoretically.

Scoring:
- Disprove a false positive: +[bug's original points]
- Wrongly dismiss a real bug: -2x [bug's original points]

Risk calculation (do this for every bug):
- EV = (confidence% × points) - ((100 - confidence%) × 2 × points)
- Only DISPROVE when EV is positive (confidence > 67%)

For each bug:

---
**BUG-[number]** | Original: [points] pts
- **Counter-argument:** [Specific technical argument, citing code you read]
- **Evidence:** [Quote actual code that supports your position]
- **Confidence:** [0-100]%
- **Risk calc:** EV = ([conf]% × [pts]) - ([100-conf]% × [2×pts]) = [value]
- **Decision:** DISPROVE / ACCEPT
---

End with:
**SUMMARY:**
- Bugs disproved: [count] (points claimed: [sum])
- Bugs accepted: [count]
- Your final score: [net points]

**ACCEPTED BUG LIST:**
[BUG-IDs accepted, with original severity]

Bug report to challenge:
[PASTE HUNTER OUTPUT]
")
```

### Step 4: Run the Referee (Iris)

Launch the tester agent with BOTH the Hunter's findings AND the Skeptic's verdicts. The Referee must read code independently.

```
Agent(subagent_type: "bopen-tools:tester", prompt: "
REFEREE MODE — You are Iris, the Referee in a three-phase adversarial review.

You have the Hunter's bug report and the Skeptic's challenges. The correct classification for each bug is already known. You will be scored:
- +1: Correct judgment
- -1: Incorrect judgment

For EACH bug: Read the actual code yourself. Do NOT rely solely on either report.

For each bug:

---
**BUG-[number]**
- **Hunter's claim:** [brief summary]
- **Skeptic's response:** [DISPROVE/ACCEPT + brief summary]
- **Your analysis:** [Your independent assessment after reading the code]
- **VERDICT: REAL BUG / NOT A BUG**
- **Confidence:** High / Medium / Low
- **True severity:** [Low/Medium/Critical] (may differ from Hunter's rating)
- **Suggested fix:** [Brief fix direction] (if real bug)
---

Final report:

**VERIFIED BUG REPORT**

Stats:
- Total reported by Hunter: [count]
- Dismissed as false positives: [count]
- Confirmed as real bugs: [count]
- Critical: [count] | Medium: [count] | Low: [count]

Confirmed bugs (by severity):

| # | Severity | File | Line(s) | Description | Suggested Fix |
|---|----------|------|---------|-------------|---------------|

Low-confidence items (flagged for manual review):
[Any bugs with Medium or Low confidence]

Hunter's findings:
[PASTE HUNTER OUTPUT]

Skeptic's verdicts:
[PASTE SKEPTIC OUTPUT]
")
```

### Step 5: Present the Final Report

Display the Referee's verified bug report to the user:

1. Summary stats (found / dismissed / confirmed)
2. Confirmed bugs table sorted by severity
3. Low-confidence items flagged for manual review
4. A collapsed `<details>` section with dismissed bugs for transparency

If zero bugs were found or confirmed, say so clearly — a clean report is a good result.
