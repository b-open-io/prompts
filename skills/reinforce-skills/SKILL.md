---
name: reinforce-skills
version: 1.0.4
description: "Invoke this skill when: modifying any CLAUDE.md file, adding a new skill or agent to a plugin, user says 'update the skill map', 'add this to the map', 'register this agent', 'skills keep getting forgotten', 'I keep forgetting which skill to use', 'agents keep getting forgotten', 'add skill map', 'update agent map', 'sync skills to CLAUDE.md', or when setting up a new project. This skill injects compressed SKILL-MAP and AGENT-MAP directive blocks into CLAUDE.md so skill names and agent IDs persist across the session without fading from context. Skipping this means agents will forget skill names mid-session, fail to invoke the right skill, and guess at agent IDs — causing silent capability loss that is hard to diagnose."
user-invocable: false
---

# Reinforce Skills & Agents

Inject compressed skill-mapping and agent-mapping directives into a project's CLAUDE.md file so skill names, agent IDs, and invocation triggers persist across the entire session without being lost to context drift.

## Problem

LLMs lose track of skill names, agent IDs, and invocation details as conversation context grows. Skills and agents load at session start but fade from working memory mid-session, causing the agent to guess names, skip invocations, or fail to delegate to the right specialist.

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

## Compressed Directive Formats

Two separate single-line blocks — one for skills, one for agents. Both use the same pipe-delimited format wrapped in HTML comments.

### Skill Map

```
<!-- SKILL-MAP-START -->STOP. You WILL forget skill names mid-session. Check this map before ANY task.|task-trigger→Skill(exact-skill-name)|another-trigger→Skill(another-skill)<!-- SKILL-MAP-END -->
```

### Agent Map

```
<!-- AGENT-MAP-START -->STOP. You WILL forget agent IDs mid-session. Check this map before delegating any complex task.|task-trigger→Agent(plugin:agent-id)|another-trigger→Agent(plugin:agent-id)<!-- AGENT-MAP-END -->
```

Agent IDs use `plugin:agent-name` format matching the `subagent_type` parameter of the Agent tool (e.g., `bopen-tools:code-auditor`, `bopen-tools:designer`, `gemskills:content`).

### Format Rules (both blocks)

- Single line — no line breaks within the block
- Pipe `|` separates each entry
- Arrow `→` maps trigger to invocation
- HTML comment markers enable programmatic updates
- Opening directive must be forceful and imperative
- Use exact names/IDs as listed in the Skill tool's system-reminder or Agent tool's available agents
- Wildcard syntax `Skill(namespace:*)` for skill families (e.g., `bsv-skills:*`)

## Workflow

### Step 1: Inventory available skills and agents (via subagent)

Delegate the inventory gathering to a subagent to keep the main context window clean:

```
Agent(prompt: "Gather skill and agent inventories from all available sources.

SKILLS — check two sources:
1. The system-reminder skill list (from the Skill tool's available skills in system-reminder messages)
2. ls ~/.claude/skills/ for user-installed skills

AGENTS — check two sources:
1. The system-reminder agent list (Agent tool's available subagent types)
2. ls ~/.claude/plugins/cache/*/agents/ for plugin agents

Cross-reference both sources for each category.

Return two lists:
- SKILLS: name, plugin (if any), one-line description
- AGENTS: plugin:agent-id, one-line description",
subagent_type: "general-purpose")
```

### Step 2: Identify project-relevant skills and agents (via subagent)

Delegate project analysis to a subagent:

```
Agent(prompt: "Analyze this project and identify which skills and agents are relevant.

1. Read CLAUDE.md — identify tech stack, frameworks, tools
2. Check package.json / go.mod / Cargo.toml — map dependencies to skills
3. Scan recent git history (git log --oneline -20) — identify recurring work patterns
4. Check for past Skill() and Agent() invocations if conversation history is available

Consult references/common-mappings.md for the trigger-to-skill and trigger-to-agent mapping table.

Return two structured lists:
- RELEVANT SKILLS: trigger phrase → Skill(exact-name)
- RELEVANT AGENTS: trigger phrase → Agent(plugin:agent-id)",
subagent_type: "general-purpose")
```

### Step 3: Next.js codemod (conditional)

If the project uses Next.js, run the official codemod for framework docs:

```bash
npx @next/codemod@canary agents-md --version <version-from-package.json> --output AGENTS.md
```

This creates a separate compressed Next.js docs index in AGENTS.md. The skill map is independent and goes in CLAUDE.md.

If the project does not use Next.js, skip this step entirely.

### Step 4: Build the skill map

Construct the compressed skill directive. Only include skills relevant to the project's stack. Refer to **`references/common-mappings.md`** for the full trigger-to-skill reference table.

### Step 5: Build the agent map

Construct the compressed agent directive. Only include agents relevant to the types of tasks that commonly arise in this project. Use the `plugin:agent-name` format exactly. Refer to **`references/common-mappings.md`** for the trigger-to-agent table.

### Step 6: Inject into CLAUDE.md

Place both maps near the top of CLAUDE.md, one after the other. If the file has YAML frontmatter (`---` delimiters), place both blocks **after** the closing `---` but before the first heading or content.

```markdown
---
description: Project description
globs: "*.ts"
---

<!-- SKILL-MAP-START -->STOP. You WILL forget skill names mid-session. Check this map before ANY task.|trigger→Skill(name)|...<!-- SKILL-MAP-END -->
<!-- AGENT-MAP-START -->STOP. You WILL forget agent IDs mid-session. Check this map before delegating any complex task.|trigger→Agent(plugin:agent-id)|...<!-- AGENT-MAP-END -->

## Project Overview
...
```

Or without frontmatter:

```markdown
# CLAUDE.md

<!-- SKILL-MAP-START -->STOP. You WILL forget skill names mid-session. Check this map before ANY task.|trigger→Skill(name)|...<!-- SKILL-MAP-END -->
<!-- AGENT-MAP-START -->STOP. You WILL forget agent IDs mid-session. Check this map before delegating any complex task.|trigger→Agent(plugin:agent-id)|...<!-- AGENT-MAP-END -->

## Project Overview
...
```

If the user only wants one block (e.g., only agents, not skills), inject only the relevant block.

### Step 7: Verify

1. Each block is a single line (no breaks between START and END markers)
2. All skill names are exact (match the Skill tool's available skills list)
3. All agent IDs are exact `plugin:agent-name` format (match the Agent tool's available subagent types)
4. Each directive opens with a forceful imperative
5. CLAUDE.md still reads cleanly for humans
6. If frontmatter exists, both blocks are outside the `---` delimiters

## Updating an Existing Map

1. Read the existing `<!-- SKILL-MAP-START -->...<!-- SKILL-MAP-END -->` and/or `<!-- AGENT-MAP-START -->...<!-- AGENT-MAP-END -->` blocks
2. Parse current mappings
3. Add, remove, or update entries
4. Replace the entire block with the updated single-line version

## Key Principles

1. **Passive over active** — Embedding beats on-demand retrieval for consistent invocation
2. **Forceful directives** — Polite suggestions get ignored mid-session. Imperative commands persist.
3. **Exact names** — Never abbreviate or guess. Use the exact registered skill name or agent ID.
4. **Project-specific** — Only include skills and agents relevant to the project's actual work
5. **Single line** — The compressed format must stay on one line to match the proven pattern
6. **Separate blocks** — Keep SKILL-MAP and AGENT-MAP in distinct blocks for independent updates

## Additional Resources

### Reference Files

- **`references/vercel-research.md`** — Detailed summary of Vercel's AGENTS.md research: methodology, eval results, three factors for passive context superiority, and compression technique details
- **`references/common-mappings.md`** — Comprehensive trigger-to-skill mapping table organized by category (workflow, quality, frontend, video, marketing, auth, infrastructure, desktop)
