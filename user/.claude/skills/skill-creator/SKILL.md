---
name: skill-creator
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
---

# Skill Creator

Create effective skills that extend Claude's capabilities through organized folders containing instructions, scripts, and resources.

## Core Principles

**Conciseness**: Only include information Claude doesn't already possess. The context window is shared with conversation history and other skills.

**Progressive Disclosure**: Skills use three-level loading:
1. Metadata (name + description) - Always loaded (~100 words)
2. SKILL.md body - When skill triggers (<500 lines)
3. Bundled resources - As needed

**Appropriate Freedom**: Match instruction specificity to task fragility:
- High-level guidance for flexible tasks
- Exact scripts for fragile, deterministic operations

## Skill Structure

```
skill-name/
├── SKILL.md           (required - main instructions)
├── scripts/           (optional - executable code)
├── references/        (optional - docs loaded on demand)
└── assets/            (optional - templates, images for output)
```

### SKILL.md Requirements

**YAML Frontmatter** (required):
```yaml
---
name: my-skill-name    # lowercase, hyphens, max 64 chars
description: Brief description of what this skill does and when to use it.
---
```

**Naming**: Use gerund form: `processing-pdfs`, `analyzing-spreadsheets`

**Description**: Write in third person. Include both WHAT and WHEN:
```yaml
# Good
description: Extract text from PDF files. Use when working with PDFs or document extraction.

# Bad
description: Helps with documents
```

**Size**: Keep under 500 lines. Move detailed content to `references/`.

### Bundled Resources

**scripts/**: Executable code for deterministic tasks
- Token efficient - executed without loading into context
- Use when same code would be rewritten repeatedly

**references/**: Documentation loaded as needed
- Database schemas, API docs, domain knowledge
- Keep SKILL.md lean by offloading details here
- For large files (>10k words), include grep patterns in SKILL.md

**assets/**: Files used in output (templates, images)
- Not loaded into context, used in final output

## Creating a Skill

### Step 1: Understand the Use Cases

Ask clarifying questions:
- "What functionality should this skill support?"
- "Can you give examples of how it would be used?"
- "What would trigger this skill?"

### Step 2: Plan Reusable Contents

For each use case, identify what scripts, references, or assets would help:
- Repetitive code → `scripts/`
- Reference documentation → `references/`
- Templates or boilerplate → `assets/`

### Step 3: Initialize

```bash
python scripts/init_skill.py <skill-name> --path <output-directory>
```

Creates template with SKILL.md and example directories.

### Step 4: Edit the Skill

Write for another Claude instance. Focus on non-obvious procedural knowledge.

**Writing Style**: Use imperative form ("To accomplish X, do Y"), not second person.

Delete unused example directories. Update SKILL.md with:
1. Purpose (few sentences)
2. When to use
3. How to use (reference all bundled resources)

### Step 5: Package (Optional)

```bash
python scripts/package_skill.py <path/to/skill-folder>
```

Validates and creates distributable zip.

### Step 6: Iterate

Test with real tasks, observe struggles, refine instructions.

## Tool Permissions

Use `allowed-tools` to restrict tool access:
```yaml
---
name: safe-reader
description: Read files without modification.
allowed-tools: Read, Grep, Glob
---
```

## Anti-Patterns

- Offering excessive options instead of defaults
- Assuming packages are pre-installed
- Magic numbers without justification
- Deeply nested file references (keep one level deep)
- Duplicating info between SKILL.md and references
- Backslashes in paths (use forward slashes)
- Time-sensitive information
