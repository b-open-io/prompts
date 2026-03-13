---
allowed-tools: Agent, Bash(git:*)
description: 4 specialized reviewers examine changes simultaneously — security, perf, correctness, style
argument-hint: [branch|commit-range] - defaults to uncommitted changes
---

## Your Task

If the arguments contain "--help", show this help and exit:

**review-wave** - Parallel multi-perspective code review

**Usage:** `/review-wave [branch|commit-range]`

**Description:**
Fans out 4 specialist review agents in parallel, each focused on ONE dimension. Then merges their findings into a single unified review with deduplicated, severity-ranked issues.

**Arguments:**
- No args: Review uncommitted changes (staged + unstaged)
- `branch` : Review all commits on current branch vs the named base branch
- `commit-range` : Review a specific commit range (e.g., `HEAD~3..HEAD`)

**Examples:**
- `/review-wave` — Review current uncommitted changes
- `/review-wave main` — Review current branch vs main
- `/review-wave HEAD~5..HEAD` — Review last 5 commits

**Reviewers:**
1. Security — injection, auth bypass, data exposure, OWASP
2. Performance — N+1 queries, re-renders, memory leaks, bundle impact
3. Correctness — edge cases, race conditions, error handling
4. Style — naming, complexity, test coverage gaps

Then stop.

Otherwise, run the parallel review:

### Step 1: Get the diff

Determine the diff based on arguments:
- No args: `git diff HEAD` (all uncommitted changes)
- Branch name: `git diff <branch>...HEAD`
- Commit range: `git diff <range>`

Run the appropriate git diff command to get the full diff text. Also run `git diff --stat` for the file summary.

If the diff is empty, tell the user there are no changes to review and stop.

### Step 2: Fan out 4 specialist reviewers IN PARALLEL

Launch all 4 in a SINGLE message. Pass the diff context to each:

**Agent 1 — Security Review**
```
Agent(prompt: "You are a security specialist. Review this code diff for security issues ONLY.

DIFF STATS:
<paste --stat output>

INSTRUCTIONS:
- Read the changed files using the file list from the diff stats
- Focus exclusively on: injection vulnerabilities (SQL, XSS, command), authentication/authorization gaps, data exposure, OWASP Top 10, secrets in code, insecure dependencies
- Ignore style, performance, or correctness issues — other reviewers handle those
- For each finding: severity (CRITICAL/HIGH/MEDIUM/LOW), file:line, what's wrong, how to fix

Return findings as a numbered list sorted by severity. If no security issues found, say 'No security issues found' — do not invent issues.",
subagent_type: "general-purpose")
```

**Agent 2 — Performance Review**
```
Agent(prompt: "You are a performance specialist. Review this code diff for performance issues ONLY.

DIFF STATS:
<paste --stat output>

INSTRUCTIONS:
- Read the changed files using the file list from the diff stats
- Focus exclusively on: N+1 queries, unnecessary re-renders, memory leaks, expensive computations in hot paths, bundle size impact, missing memoization, inefficient data structures
- Ignore security, style, or correctness issues — other reviewers handle those
- For each finding: severity (CRITICAL/HIGH/MEDIUM/LOW), file:line, what's wrong, how to fix

Return findings as a numbered list sorted by severity. If no performance issues found, say 'No performance issues found' — do not invent issues.",
subagent_type: "general-purpose")
```

**Agent 3 — Correctness Review**
```
Agent(prompt: "You are a correctness specialist. Review this code diff for logic and correctness issues ONLY.

DIFF STATS:
<paste --stat output>

INSTRUCTIONS:
- Read the changed files using the file list from the diff stats
- Focus exclusively on: edge cases, off-by-one errors, race conditions, null/undefined handling, error propagation, type mismatches, broken invariants, missing validation at system boundaries
- Ignore security, performance, or style issues — other reviewers handle those
- For each finding: severity (CRITICAL/HIGH/MEDIUM/LOW), file:line, what's wrong, how to fix

Return findings as a numbered list sorted by severity. If no correctness issues found, say 'No correctness issues found' — do not invent issues.",
subagent_type: "general-purpose")
```

**Agent 4 — Style & Maintainability Review**
```
Agent(prompt: "You are a style and maintainability specialist. Review this code diff for code quality issues ONLY.

DIFF STATS:
<paste --stat output>

INSTRUCTIONS:
- Read the changed files using the file list from the diff stats
- Focus exclusively on: unclear naming, excessive complexity, missing or outdated tests for changed code, dead code, duplicated logic, poor abstractions, inconsistent patterns with the rest of the codebase
- Ignore security, performance, or correctness issues — other reviewers handle those
- For each finding: severity (HIGH/MEDIUM/LOW — no CRITICAL for style), file:line, what's wrong, how to fix

Return findings as a numbered list sorted by severity. If no style issues found, say 'No style issues found' — do not invent issues.",
subagent_type: "general-purpose")
```

### Step 3: Merge into unified review

After all 4 agents return, deduplicate and merge:

```
## Code Review: <branch/range description>

**Files changed:** <count from diff stat>
**Reviewers:** Security, Performance, Correctness, Style

### Issues (<total count>)

#### Critical / High
<Merged findings from all reviewers, deduplicated, sorted by severity>

#### Medium
<Merged medium-severity findings>

#### Low
<Merged low-severity findings>

### Clean Areas
<List dimensions with no findings — e.g., "Security: clean", "Performance: clean">

### Summary
<1-2 sentence overall assessment: Is this safe to merge? What must be fixed first?>
```

If all reviewers report clean, say so clearly — a clean review is a valid and valuable result.
