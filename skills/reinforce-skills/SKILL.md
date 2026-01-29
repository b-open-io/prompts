---
name: reinforce-skills
description: "This skill should be used when the user asks to 'reinforce skills', 'add skill map', 'update skill map', 'sync skills to CLAUDE.md', 'I keep forgetting skills', 'embed skills', or when setting up a new project where installed skills should be persisted as context. Generates a compressed skill-mapping directive in CLAUDE.md following the Vercel AGENTS.md research pattern."
---

# Reinforce Skills

Inject a compressed skill-mapping directive into a project's CLAUDE.md file so skill names and invocation triggers persist across the entire session without being lost to context drift.

## Problem

LLMs lose track of skill names and invocation details as conversation context grows. Skills load at session start but fade from working memory mid-session, causing the agent to guess names, skip invocations, or fail to call skills the user explicitly requested.

## Solution

Vercel's research found that **passive context embedded in project files outperforms active skill retrieval** — 100% vs 79% pass rate in agent evals. Embed a compressed skill map directly in CLAUDE.md using the same directive pattern.

Reference: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals

For detailed research findings, consult **`references/vercel-research.md`**.

## File Placement

| Tool | File |
|------|------|
| Claude Code | `CLAUDE.md` |
| Cursor | `AGENTS.md` |
| Other agents | `AGENTS.md` |

For Claude Code projects, inject into **CLAUDE.md**. For multi-tool projects, consider both files.

## Compressed Directive Format

Single-line, pipe-delimited block wrapped in HTML comments. Opens with a forceful imperative directive, followed by task-to-skill mappings:

```
<!-- SKILL-MAP-START -->STOP. You WILL forget skill names mid-session. Check this map before ANY task.|task-trigger→Skill(exact-skill-name)|another-trigger→Skill(another-skill)<!-- SKILL-MAP-END -->
```

### Format Rules

- Single line — no line breaks within the block
- Pipe `|` separates each entry
- Arrow `→` maps trigger to skill invocation
- HTML comment markers `SKILL-MAP-START` / `SKILL-MAP-END` enable programmatic updates
- Opening directive must be forceful and imperative
- Use exact skill names from `npx skills list` or the Skill tool's available list
- Wildcard syntax `Skill(namespace:*)` for skill families (e.g., `bsv-skills:*`)

## Workflow

### Step 1: Inventory available skills

```bash
# User-installed skills (global)
ls ~/.claude/skills/

# All skills including plugin skills
# Check the Skill tool's available skills list in the system prompt
# Both sources may contain relevant skills
```

### Step 2: Identify project-relevant skills

1. **Read CLAUDE.md** — Identify tech stack, frameworks, tools
2. **Check package.json** — Map dependencies to skills (e.g., `better-auth` → `better-auth-best-practices`, `ai` → `ai-sdk`, `tauri` → `tauri-v2`)
3. **Scan recent git history** — Identify recurring work patterns
4. **Check conversation history** — Look for past `Skill()` invocations if available

### Step 3: Next.js codemod (conditional)

If the project uses Next.js, run the official codemod for framework docs:

```bash
npx @next/codemod@canary agents-md --version <version-from-package.json> --output AGENTS.md
```

This creates a separate compressed Next.js docs index in AGENTS.md. The skill map is independent and goes in CLAUDE.md.

If the project does not use Next.js, skip this step. The skill map technique works identically without the codemod — the codemod only handles Next.js framework documentation.

### Step 4: Build the skill map

Construct the compressed directive. Only include skills relevant to the project's stack.

Common mappings reference table:

| Trigger | Skill |
|---------|-------|
| dependency-updates | find-skills |
| ai-sdk-work | ai-sdk |
| code-cleanup | code-simplifier |
| post-implementation | confess |
| debugging | superpowers:systematic-debugging |
| planning | superpowers:writing-plans |
| execution | superpowers:executing-plans |
| parallel-work | superpowers:dispatching-parallel-agents |
| npm-publish | npm-publish |
| react-patterns | vercel-react-best-practices |
| composition | vercel-composition-patterns |
| frontend-ui | frontend-design |
| web-design | web-design-guidelines |
| brainstorming | superpowers:brainstorming |
| code-review | superpowers:requesting-code-review |
| auth-setup | sigma-auth:setup |
| better-auth | better-auth-best-practices |
| bitcoin-auth | bitcoin-auth-diagnostics |
| bsv-work | bsv-skills:* |
| tauri-desktop | tauri-v2 |
| tauri-events | tauri-event-system |
| tauri-testing | testing-tauri-apps |
| resend-email | resend-integration |

### Step 5: Inject into CLAUDE.md

Place the skill map near the top of CLAUDE.md, after the title but before project content:

```markdown
# CLAUDE.md

<!-- SKILL-MAP-START -->STOP. You WILL forget skill names mid-session. Check this map before ANY task.|trigger→Skill(name)|...<!-- SKILL-MAP-END -->

## Project Overview
...
```

### Step 6: Verify

1. Block is a single line (no breaks between START and END markers)
2. All skill names are exact (match `npx skills list` output)
3. Directive opens with a forceful imperative
4. CLAUDE.md still reads cleanly for humans

## Updating an Existing Map

1. Read the existing `<!-- SKILL-MAP-START -->...<!-- SKILL-MAP-END -->` block
2. Parse current mappings
3. Add, remove, or update entries
4. Replace the entire block with the updated single-line version

## Key Principles

1. **Passive over active** — Embedding beats on-demand retrieval for consistent invocation
2. **Forceful directives** — Polite suggestions get ignored mid-session. Imperative commands persist.
3. **Exact names** — Never abbreviate or guess. Use the exact registered skill name.
4. **Project-specific** — Only include skills relevant to the project's actual stack
5. **Single line** — The compressed format must stay on one line to match the proven pattern

## Additional Resources

### Reference Files

- **`references/vercel-research.md`** — Detailed summary of Vercel's AGENTS.md research: methodology, eval results, three factors for passive context superiority, and compression technique details
