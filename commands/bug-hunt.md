---
allowed-tools: Agent, Read, Glob, Grep, Skill
description: Adversarial bug hunt with three isolated agents (Hunter/Skeptic/Referee)
argument-hint: [path] - File or directory to audit (defaults to entire project)
---

## Your Task

If the arguments contain "--help", show this help:
**bug-hunt** - Adversarial bug hunt using three isolated agents

**Usage:** `/bug-hunt [path]`

**Description:**
Runs a three-phase adversarial code review that neutralizes sycophancy bias. Three agents operate in isolated contexts so no agent can anchor on another's judgment.

**Arguments:**
- `[path]`  : File or directory to audit (e.g., `src/`, `lib/auth.ts`)
- No args   : Audits the entire project
- `--help`  : Show this help message

**Examples:**
- `/bug-hunt`              : Hunt bugs across the entire project
- `/bug-hunt src/`         : Focus on the src directory
- `/bug-hunt lib/auth.ts`  : Audit a specific file

**How it works:**
1. Hunter (Nyx) - Aggressively finds every possible bug (+1/+5/+10 scoring)
2. Skeptic (Kayle) - Challenges each finding, 2x penalty for wrong dismissals
3. Referee (Iris) - Independent final verdict with symmetric +/-1 scoring

Then stop.

Otherwise, run the adversarial bug hunt:

1. Determine the target scope from the user's arguments. If no path was provided, use the current project root.
2. Invoke `Skill(hunter-skeptic-referee)` and follow its orchestration protocol exactly.
3. Pass the target scope as the codebase for the Hunter phase.
4. After all three phases complete, present the Referee's final ranked bug report to the user.
