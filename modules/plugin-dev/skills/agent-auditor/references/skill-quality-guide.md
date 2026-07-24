# Skill Quality Guide

Distilled from Anthropic's "Complete Guide to Building Skills for Claude" (2026). Use this reference when writing, reviewing, or auditing skill quality.

## What Makes a Good Skill

A skill is a folder containing SKILL.md (required), plus optional scripts/, references/, and assets/ directories. Good skills share these properties:

### Progressive Disclosure

Skills use a three-level system:

1. **Frontmatter (always loaded):** Name and description appear in Claude's system prompt. This is how Claude decides whether to load the skill. Keep it minimal -- just enough to trigger correctly.

2. **SKILL.md body (loaded on invocation):** Full instructions and guidance. This is the working document Claude follows. Target 1,500-2,000 words maximum.

3. **Linked files (navigated as needed):** Additional documentation in references/, executable code in scripts/, templates in assets/. Claude discovers these when the SKILL.md body points to them.

**Why this matters:** Every word in SKILL.md costs tokens on every invocation. Move detailed API guides, long examples, and reference tables into references/ files. The SKILL.md body should contain decision logic and workflow steps, not encyclopedic content.

### Strong Triggering

The description field is the single most critical piece of a skill. It determines whether Claude loads the skill at all. A skill with great instructions but a weak description will never fire.

**Structure:** `[What it does] + [When to use it] + [Key capabilities]`

**Good descriptions:**
- Include specific phrases users would actually say
- Mention relevant file types, tool names, or domain terms
- Use third-person format ("This skill should be used when...")
- Stay under 1024 characters
- Include negative triggers when disambiguation is needed

**Bad descriptions:**
- Too vague: "Helps with projects"
- Missing triggers: "Creates sophisticated multi-page documentation systems"
- Too technical: "Implements the Project entity model with hierarchical relationships"
- Missing use cases: only says what it does, not when to use it

**Testing the description:** Ask Claude "When would you use the [skill name] skill?" If Claude can't articulate when to trigger it, the description needs work.

### Composability

Skills should work well alongside other skills. Assume yours is not the only capability available. Avoid:
- Claiming broad domains ("handles all file operations")
- Conflicting with known skills in the same plugin
- Making assumptions about what other skills do or don't exist

## Description Optimization

### Undertriggering Signals
- Skill doesn't load when it should
- Users manually enabling the skill
- Support questions about when to use it

**Fix:** Add more detail, nuance, and keywords to the description. Include trigger phrases for technical terms users might say.

### Overtriggering Signals
- Skill loads for irrelevant queries
- Users disabling the skill
- Confusion about the skill's purpose

**Fix:** Add negative triggers ("Do NOT use for..."), be more specific about scope, clarify boundaries with similar skills.

### Debugging Approach
Ask Claude: "When would you use the [skill name] skill?" Claude will quote the description back. Adjust based on what's missing or misleading.

## Bundled Resources

### When to Use scripts/
- Deterministic tasks that benefit from code over natural language
- Validation checks, data processing, file generation
- Tasks where "code is deterministic; language interpretation isn't"

### When to Use references/
- Detailed API documentation, long examples
- Domain-specific knowledge bases
- Style guides, compliance rules, configuration references
- Anything over ~500 words that supports but isn't core to the workflow

### When to Use assets/
- Templates, fonts, icons used in output
- Static files that scripts consume
- Report templates, email templates

## Common Mistakes

### 1. Everything in SKILL.md
Moving all content into SKILL.md bloats token usage on every invocation. If SKILL.md is over 2,000 words, extract detailed sections into references/.

### 2. Weak or Missing Triggers
The description doesn't include phrases users would actually say. Test by asking Claude when it would use the skill.

### 3. Vague Instructions
"Validate the data before proceeding" tells Claude nothing. Specify what to check:
```
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

### 4. Instructions Buried at Bottom
Claude attends more to content at the top. Put critical rules and warnings at the beginning of SKILL.md, not the end.

### 5. Ambiguous Language
"Make sure to validate things properly" vs "Run `python scripts/validate.py --input {filename}` to check data format." Be specific and actionable.

### 6. No Error Handling
Skills should include a "Common Issues" section covering likely failure modes and how to handle them.

### 7. Duplicate Content
The same information appears in SKILL.md body and a references/ file. Single source of truth -- put it in one place and link from the other.

## The Skill Lifecycle

1. **Create:** Define use cases, write frontmatter, draft instructions
2. **Test:** Run trigger tests (10 should-trigger, 10 should-not-trigger), functional tests
3. **Review:** Self-review against this guide, or have another agent audit it
4. **Improve:** Fix issues found in testing/review, iterate on description
5. **Publish:** Merge to default branch, bump plugin version
6. **Maintain:** Periodic re-audit, update for API changes, refine based on usage feedback

## Audit Criteria Summary

| Criterion | Pass | Warn | Fail |
|-----------|------|------|------|
| Description includes trigger phrases | Has 3+ specific triggers | Has 1-2 vague triggers | No triggers or too vague |
| SKILL.md word count | Under 1,500 words | 1,500-2,500 words | Over 2,500 words |
| Progressive disclosure | Details in references/ | Some inline detail | Everything in SKILL.md |
| Instructions actionable | Specific commands/steps | Mostly specific | Vague or ambiguous |
| Error handling present | Common issues section | Some error notes | No error guidance |
| Invocation fields correct | Matches classification | Minor mismatch | Wrong or missing |
| Directory naming | kebab-case, matches name | Minor inconsistency | Spaces, capitals, mismatch |
| Evals exist | evals.json with assertions | Partial evals | No evals |
