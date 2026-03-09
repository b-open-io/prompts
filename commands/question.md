---
allowed-tools: Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git ls-files:*), Bash(git branch:*), Bash(ls:*), Bash(wc:*), Read, Grep, Glob
description: Read-only Q&A mode — answers questions about the codebase without making any changes
argument-hint: <question>
---

## Your Task

Answer this question about the codebase: $ARGUMENTS

Rules:
- Use only the read-only tools available to you. Do not write, edit, or delete anything.
- Do not suggest making changes. Your job is to explain what exists, not propose improvements.
- Cite precise `file:line` references when describing code behavior.
- Use `git ls-files` to map project structure before diving into files.
- Read the relevant files directly — do not guess at implementation details.
- If the question cannot be answered from the codebase alone, say so clearly.
