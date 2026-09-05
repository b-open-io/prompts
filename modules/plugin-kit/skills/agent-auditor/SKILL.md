---
name: agent-auditor
version: 0.1.2
description: >-
  Audit agents and skills across the plugin ecosystem for triggering, structure,
  progressive disclosure, permissions, and benchmark readiness. Apply for requests
  to audit agents, review skill quality, check skill health, validate plugin skills,
  or run periodic authoring maintenance.
user-invocable: false
---

# Agent Auditor

Systematic audit methodology for evaluating the health, quality, and consistency of agents and skills across the plugin ecosystem. Produces actionable findings with severity ratings and recommended fixes.

## Audit Checklist

Every audit evaluates skills across seven dimensions. For each skill, score pass/warn/fail per dimension.

### 0. Startup Weight

Run this first. It is the only dimension measured in tokens the user pays on
every request, and the results reorder the rest of the audit.

```bash
python3 scripts/plugin-weight.py --format markdown
```

Report four numbers and act on them:

| Signal | Budget | Why |
|---|---|---|
| Agent description chars | ≤ 600 each | Anthropic's guidance is 200–1,000; catalogs drift well past it |
| `<example>` blocks per agent | 0 | Examples constrain model matching and cost bytes on every request |
| Aggregate startup tokens | project ceiling | The number a session pays before doing any work |
| Agent share of always-on cost | report it | Agents are frequently the larger half and are easy to overlook |

Gate a catalog in CI with:

```bash
python3 scripts/plugin-weight.py \
  --max-agent-description-chars 600 \
  --max-agent-examples 0 \
  --max-startup-tokens 16000
```

Two failure modes to name explicitly in the report. A weight report that shows
agents as a bare count lets the agent half of a catalog grow past any gate built
on it, so confirm the report measures agent description and `tools:` bytes.
If an agent has a broad `Skill` grant, treat that as valid access and do not
require it to enumerate `Skill(a), Skill(b), …`. If its access is deliberately
restricted, preserve that boundary and assess only whether the listed entries
meet the task; never widen the list merely to reduce startup bytes.

Any compression here changes routing behaviour, so pair it with a routing eval
from `plugin-kit:benchmark-skills` before shipping.

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
- Read these fields using the target host's current invocation semantics; defaults and discovery behavior can differ by host.
- Distinguish discovery from the mutation boundary. Do not disable model discovery automatically because a workflow includes interaction or approval; preserve the user's discovery policy and require approval immediately before an irreversible mutation.
- Set `disable-model-invocation: true` when the repository policy requires explicit user invocation or when host behavior would otherwise cross that approval boundary.
- Set `user-invocable: false` for internal plumbing that should stay out of the user's command menu.
- Cross-reference which agents list this skill in their `tools:` frontmatter and whether that matches the intended audience.

**Common failure:** Treating a host's default discovery policy as a universal safety control instead of enforcing approval at the mutation boundary.

### 2. Location & Cross-Client

- Skill lives in the correct plugin repo (core, bsv-skills, gemskills, 1sat-skills, product-skills, etc.)
- Directory name matches the `name` field in frontmatter exactly
- No spaces, underscores, or capitals in directory name (kebab-case only)
- File is named exactly `SKILL.md` (case-sensitive)
- No README.md inside the skill folder (all docs go in SKILL.md or references/)

### 3. Description Quality

The description is the single most important field -- it determines whether Claude loads the skill.

**Structure:** `[What it does] + [When to use it] + [Key capabilities]`

**Checks:**
- States the capability and real trigger phrases users would use; no fixed lead-in sentence is required.
- Under 1024 characters
- No XML angle brackets (`<` or `>`)
- Not too vague ("Helps with projects" = fail)
- Not too technical ("Implements the X entity model" = fail)
- Includes negative triggers if the skill is easily confused with similar skills
- Mentions relevant file types if applicable

**Test the description:** Exercise it with representative should-trigger and should-not-trigger requests on the target host. Judge whether the skill activates for the right work and stays quiet for nearby work; do not use the model's ability to quote the description as the test.

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
| `Skill(plugin-kit:benchmark-skills)` | Eval/benchmark harness |
| `Skill(plugin-kit:agent-auditor)` | This audit skill |

Check the agent's `tools:` frontmatter to verify the required access. A bare
`Skill` grant is valid when the host grants broad skill access; do not demand
explicit `Skill(...)` entries. When a list is intentionally restricted, do not
widen it just to satisfy a size target; report a missing capability only when
the requested audit genuinely needs it.

### 7. Generative UI Awareness

If the agent's domain involves UI generation, rendering, or cross-platform output, check for generative UI readiness.

**Checks:**
- Does the agent have `Skill(web-dev:generative-ui)` in tools?
- If the agent works with React/Next.js, does it know about json-render?
- If the agent works with React Native, does it know about `@json-render/react-native`?
- If the agent produces visual assets, does it have relevant gemskills?
- Does the agent understand when to use generative UI vs static components?

**Applicable agents:** designer, agent-builder, nextjs, mobile, integration-expert

**Not applicable (skip this dimension):** code-auditor, documentation-writer, researcher, devops, database, payments

## Audit Workflow

### Step 1: Enumerate & Classify (via subagent)

Resolve the owning plugin root before enumerating. Scan the root and module
trees that belong to that plugin; do not assume the repository's root roster is
the complete catalog. Delegate enumeration and classification when the host
supports it to keep the main context clean:

```
Agent(prompt: "Enumerate and classify all skills in the target plugin.

1. Use the host's file-search or glob tool for `skills/*/SKILL.md` and
   `modules/*/skills/*/SKILL.md`, skipping absent directories, and count the
   returned files
2. For each skill, read the YAML frontmatter and classify:
   - Type: agent-only (user-invocable: false), user-only (disable-model-invocation: true), or default
   - Plugin it belongs in
   - Which agents reference it (search `agents/*.md` and
     `modules/*/agents/*.md` for `Skill(name)`)
3. Return a table: | Skill | Type | Referenced By | Notes |

Target plugin root and its `modules/*` children:",
subagent_type: "general-purpose")
```

### Step 2: Run Dimension Checks (via parallel subagents)

For multi-plugin audits, dispatch one subagent per plugin in parallel. For single-plugin audits, dispatch one subagent per batch of 5-10 skills:

```
Agent(prompt: "Audit these skills against the seven-dimension checklist:
<list of skills from Step 1>

For each skill, evaluate: Scope & Invocation, Location & Cross-Client, Description Quality, Structure, Testing, Agent Equipment, Generative UI.

Score each dimension as pass/warn/fail. Return findings in the report format.",
subagent_type: "general-purpose")
```

The main context receives only the formatted audit report, not raw skill file contents.

Record per dimension:
- **Pass**: Meets criteria
- **Warn**: Minor issue, non-blocking
- **Fail**: Must fix before publishing

Cost or model choice alone is not a failure. Mark a less expensive skill or
implementation as pass when it meets the same observable quality criteria;
record any measured tradeoff separately from the quality status.

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
| Generative UI | pass/warn/fail/skip | details |

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
