# Agent Skills Specification Reference

Summary of the agentskills.io specification for standalone Agent Skills.

Source: https://agentskills.io/specification

## Directory Structure

A skill is a directory containing at minimum a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation loaded on demand
└── assets/           # Optional: static resources (templates, images, data)
```

## SKILL.md Format

Must contain YAML frontmatter followed by Markdown content.

### Required Frontmatter

```yaml
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

### Full Frontmatter Example

```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF documents.
license: Apache-2.0
compatibility: Requires Python 3.10+
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(python:*) Read
---
```

## Field Constraints

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase letters, numbers, hyphens only. No leading/trailing/consecutive hyphens. Must match directory name. |
| `description` | Yes | Max 1024 chars. Non-empty. Describes what and when. |
| `license` | No | License name or reference to bundled license file. |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `metadata` | No | Arbitrary string key-value pairs. |
| `allowed-tools` | No | Space-delimited tool list (experimental). |

## Name Validation Rules

- 1-64 characters
- Only lowercase alphanumeric characters and hyphens (`a-z`, `0-9`, `-`)
- Must not start or end with `-`
- Must not contain consecutive hyphens (`--`)
- Must match the parent directory name

Valid: `pdf-processing`, `data-analysis`, `code-review`
Invalid: `PDF-Processing`, `-pdf`, `pdf--processing`

## Description Best Practices

Good:
```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

Poor:
```yaml
description: Helps with PDFs.
```

Include:
- What the skill does (capabilities)
- When to use it (trigger conditions)
- Specific keywords that help agents identify relevant tasks

## Progressive Disclosure

Structure skills for efficient context usage:

1. **Metadata** (~100 tokens): `name` + `description` loaded at startup for all skills
2. **Instructions** (< 5000 tokens recommended): Full `SKILL.md` body loaded on activation
3. **Resources** (as needed): Files in scripts/, references/, assets/ loaded only when required

Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

## File References

Reference other files using relative paths from the skill root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.
Run the extraction script: scripts/extract.py
```

Keep file references one level deep from `SKILL.md`. Avoid deeply nested reference chains.

## Validation

Use the skills-ref reference library to validate:

```bash
npx skills-ref validate ./my-skill
```

Or via the GitHub repository: https://github.com/agentskills/agentskills/tree/main/skills-ref

## Adoption

Agent Skills are supported by: Claude, Claude Code, VS Code, Cursor, Gemini CLI, GitHub, Roo Code, OpenAI Codex, and many other agent products.
