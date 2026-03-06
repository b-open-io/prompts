---
name: agent-auditor
version: 0.1.0
description: >-
  Comprehensive audit skill for agents and skills across the plugin ecosystem.
  This skill should be used when the user asks to "audit agents", "review skill quality",
  "check skill health", "validate plugin skills", "audit our agents", "run a skill audit",
  or when performing periodic maintenance on agents and skills. Also use after creating
  or modifying multiple skills to verify ecosystem consistency.
user-invocable: false
---

# Agent Auditor

Systematic audit methodology for evaluating the health, quality, and consistency of agents and skills across the plugin ecosystem. Produces actionable findings with severity ratings and recommended fixes.

## Audit Checklist

Every audit evaluates skills across six dimensions. For each skill, score pass/warn/fail per dimension.

### 1. Scope & Invocation

Verify the invocation control fields are set correctly.

**Check against the invocation matrix:**

| Scenario | `user-invocable` | `disable-model-invocation` |
|----------|-----------------|---------------------------|
| Default (user + Claude can invoke) | omit (default true) | omit (default false) |
| Agent-only (hidden from `/` menu) | `false` | omit |
| User-only (Claude cannot auto-invoke) | omit | `true` |
| Agent-only + no auto-invoke | `false` | `true` |

**Checks:**
- Does the skill require user interaction (OTP, confirmation, subjective input)? If yes, needs `disable-model-invocation: true`
- Does the skill have irreversible side effects (sends money, publishes, deploys)? If yes, needs `disable-model-invocation: true`
- Would a user ever type `/skill-name` directly? If no, needs `user-invocable: false`
- Is this purely internal agent plumbing? If yes, needs `user-invocable: false`
- Cross-reference: which agents list this skill in their `tools:` frontmatter? Does that match the intended audience?

**Common failure:** Skills that are agent-internal but missing `user-invocable: false`, cluttering the user's `/` menu.

### 2. Location & Cross-Client

- Skill lives in the correct plugin repo (bopen-tools, bsv-skills, gemskills, 1sat-skills, product-skills, etc.)
- Directory name matches the `name` field in frontmatter exactly
- No spaces, underscores, or capitals in directory name (kebab-case only)
- File is named exactly `SKILL.md` (case-sensitive)
- No README.md inside the skill folder (all docs go in SKILL.md or references/)

### 3. Description Quality

The description is the single most important field -- it determines whether Claude loads the skill.

**Structure:** `[What it does] + [When to use it] + [Key capabilities]`

**Checks:**
- Uses third-person format ("This skill should be used when..." not "Use when...")
- Includes specific trigger phrases users would actually say
- Under 1024 characters
- No XML angle brackets (`<` or `>`)
- Not too vague ("Helps with projects" = fail)
- Not too technical ("Implements the X entity model" = fail)
- Includes negative triggers if the skill is easily confused with similar skills
- Mentions relevant file types if applicable

**Test the description:** Ask Claude "When would you use the [skill name] skill?" -- Claude should quote the description back accurately. If it can't, the triggers are weak.

### 4. Structure & Progressive Disclosure

Skills use a three-level system to minimize token usage:
1. **First level (frontmatter):** Always in system prompt. Just enough to decide relevance.
2. **Second level (SKILL.md body):** Loaded when skill is invoked. Core instructions.
3. **Third level (references/):** Additional detail Claude navigates to as needed.

**Checks:**
- SKILL.md body is under 2,000 words (ideally 1,500). Run `wc -w` to verify.
- Detailed documentation lives in `references/`, not inline
- No duplication between SKILL.md body and reference files
- Scripts for deterministic tasks live in `scripts/`
- Instructions are specific and actionable, not vague ("validate the data before proceeding" = fail)
- Critical instructions appear at the top, not buried at the bottom
- Uses bullet points and numbered lists over long prose paragraphs

### 5. Testing & Benchmarks

**Checks:**
- Has `evals/evals.json` with trigger and functional test cases
- Trigger tests: 10 should-trigger prompts + 10 should-not-trigger prompts (realistic, not contrived)
- Functional assertions: 3-5 per eval, specific and verifiable
- Assertions target skill-specific knowledge, not generic model capability
- Has baseline comparison data (pass_rate vs baseline_pass_rate)
- Delta is positive (skill helps vs hurts)

Consult `references/testing-strategies.md` for the full testing methodology.

### 6. Agent Equipment

Agents that create or modify skills should have access to the right toolkit:

| Required Skill | Purpose |
|---------------|---------|
| `Skill(skill-creator:skill-creator)` | Interactive skill creation workflow |
| `Skill(plugin-dev:skill-development)` | Skill writing best practices |
| `Skill(bopen-tools:benchmark-skills)` | Eval/benchmark harness |
| `Skill(bopen-tools:agent-auditor)` | This audit skill |

Check the agent's `tools:` frontmatter to verify these are listed.

## Audit Workflow

### Step 1: Enumerate

```bash
# List all skills in target plugin
ls skills/*/SKILL.md

# Count total
ls skills/*/SKILL.md | wc -l
```

### Step 2: Read & Classify

For each skill, read the frontmatter and classify:
- What type: agent-only, user-only, or default?
- What plugin does it belong in?
- What agents reference it?

### Step 3: Run Dimension Checks

For each skill, evaluate all six dimensions. Record:
- **Pass**: Meets criteria
- **Warn**: Minor issue, non-blocking
- **Fail**: Must fix before publishing

### Step 4: Generate Report

Format findings as:

```
## Audit Report: [plugin-name]

### Summary
- Total skills: N
- Pass: N | Warn: N | Fail: N

### Findings

#### [skill-name]
| Dimension | Status | Notes |
|-----------|--------|-------|
| Scope & Invocation | pass/warn/fail | details |
| Location & Cross-Client | pass/warn/fail | details |
| Description Quality | pass/warn/fail | details |
| Structure | pass/warn/fail | details |
| Testing | pass/warn/fail | details |
| Agent Equipment | pass/warn/fail | details |

**Recommended fixes:**
1. [specific, actionable fix]
```

### Step 5: Fix & Re-audit

Apply fixes, then re-run the audit on changed skills only. Use the evaluator-optimizer loop from `references/workflow-patterns.md` for iterative improvement.

## Workflow Patterns

For multi-plugin audits, use parallelization -- dispatch one subagent per plugin. See `references/workflow-patterns.md` for:
- Sequential audit pipeline (single plugin)
- Parallel dispatch (multiple plugins)
- Evaluator-optimizer loop (iterative fixes)

## Testing Strategy

See `references/testing-strategies.md` for:
- Trigger testing methodology (should-trigger / should-not-trigger)
- Functional testing with evals.json assertions
- Performance comparison (with-skill vs without-skill baselines)
- Quantitative and qualitative metrics
- Description optimization loops

## Reference Files

| File | When to Consult |
|------|----------------|
| `references/skill-quality-guide.md` | Writing or reviewing description, structure, and instructions |
| `references/workflow-patterns.md` | Planning multi-plugin audits or iterative fix cycles |
| `references/testing-strategies.md` | Creating evals, running benchmarks, measuring effectiveness |
