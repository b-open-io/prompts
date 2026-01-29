# Vercel AGENTS.md Research Summary

Source: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals

## What They Tested

Vercel evaluated three approaches for giving AI coding agents access to Next.js framework knowledge:

1. **Skills (active retrieval)** — Agent must decide to invoke a skill, which loads docs on demand
2. **Skills + explicit instructions** — Same as above but AGENTS.md tells the agent to use the skill first
3. **AGENTS.md with compressed docs index (passive context)** — Docs index embedded directly in the project file, always available

## Results

| Approach | Pass Rate |
|----------|-----------|
| Skills (default) | 53% |
| Skills + explicit instructions | 79% |
| AGENTS.md compressed index | **100%** |

## Why Passive Context Wins

Three factors identified:

### 1. No decision point
With AGENTS.md, there is no moment where the agent must decide "should I look this up?" The information is already present in context.

### 2. Consistent availability
Skills load asynchronously and only when invoked. AGENTS.md content is in the system prompt for every turn, every time.

### 3. No ordering issues
Skills create sequencing decisions — should the agent read docs first or explore the project first? Passive context eliminates this entirely.

## The Compression Technique

### Problem
Full Next.js docs are ~40KB — too large for persistent context.

### Solution
Compress to an 8KB index (80% reduction) that maps to retrievable files on disk. The agent knows where to find docs without having full content in context. When specific information is needed, the agent reads the relevant file from `.next-docs/`.

### Format
Pipe-delimited, single-line block:

```
[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,...}
```

Key elements:
- **Title** in brackets: `[Next.js Docs Index]`
- **Root path**: Where full docs live on disk
- **Forceful directive**: "STOP. What you remember is WRONG" — imperative language that forces retrieval behavior
- **Directory tree**: Compressed `path:{file,file,...}` entries separated by pipes

### Why It Works
The agent knows where to find docs without full content in context. When specific information is needed, read the relevant file from the docs directory.

## Where Skills Still Win

Skills work better for **specific, action-oriented workflows** that users explicitly trigger:
- "Upgrade my Next.js version"
- "Migrate to the App Router"
- Applying framework best practices as a deliberate action

For **general framework knowledge** (API syntax, config options, component usage), passive context outperforms on-demand retrieval.

## File Naming by Tool

- **Claude Code** reads `CLAUDE.md` (NOT AGENTS.md)
- **Cursor** reads `AGENTS.md`
- **Other AI coding tools** typically read `AGENTS.md`

Both files go in the **project root directory**.

## Application to Skill Reinforcement

The same passive context pattern applies beyond framework docs. Any information the agent needs reliably mid-session benefits from embedding:

- Skill name → invocation mappings
- Project-specific conventions
- Tool preferences and constraints
- Workflow triggers

The key insight: if the agent must decide to look something up, it sometimes won't. If the information is already present, it always uses it.

## The Codemod

```bash
npx @next/codemod@canary agents-md
```

Detects Next.js version, downloads matching docs to `.next-docs/`, injects compressed index into AGENTS.md. Only applicable to Next.js projects — the directive pattern itself is framework-agnostic.
