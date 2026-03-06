---
name: runtime-context
description: Detects agent execution environment (Claude Code, Vercel Sandbox, or local dev) and adapts behavior accordingly. This skill should be used when an agent or bot needs to understand what runtime it is in, what tools are available, or how to adapt its behavior across different execution contexts. Use this skill when building agents that may run in Claude Code as subagents AND as hosted bots in Vercel Sandboxes, or when a SOUL.md/SKILL.md needs to work across runtimes.
user-invocable: false
---

# Runtime Context

Agents run in different environments with different capabilities. This skill
detects the current runtime so agents can use the right tools and fail clearly
when a required capability is missing.

## The Three Runtimes

| Runtime | How to detect | Tools available | Skills via |
|---------|--------------|-----------------|-----------|
| **Claude Code** | `CLAUDE_CODE=1` env var, or Skill()/Agent()/Read tools exist | Full suite: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebFetch, WebSearch | `Skill()` tool |
| **Vercel Sandbox** | `/vercel/sandbox/` paths exist, `VERCEL_SANDBOX_ID` env var set | bash-tool trio: `bash`, `readFile`, `writeFile`, plus `skill` if configured | `createSkillTool()` from `bash-tool` |
| **Local dev** | Neither of the above, `process.cwd()` is in user home or project dir | Whatever the app provides (usually just HTTP + AI SDK) | Direct file reads or none |

## Detection Script

Run `scripts/detect.sh` to get a JSON summary of the current environment:

```bash
bash skills/runtime-context/scripts/detect.sh
```

Returns:
```json
{
  "runtime": "sandbox",
  "has_bash": true,
  "has_skill_tool": true,
  "sandbox_id": "sbx_abc123",
  "working_dir": "/vercel/sandbox/bot",
  "node_version": "v22.x.x",
  "bun_version": "1.x.x"
}
```

## For SOUL.md / System Prompt Authors

When writing a system prompt that works across runtimes, structure it like this:

```markdown
## Environment Awareness

Before taking action, check your environment:
1. If you have `Skill()` and `Agent()` tools, you are in Claude Code
   - Use skills via `Skill(name)`, delegate via `Agent()`
   - Full file access via Read/Write/Edit
2. If you have `bash`, `readFile`, `writeFile` tools, you are in a Sandbox
   - Run scripts via `bash`, read context via `readFile`
   - Skills available via the `skill` tool if configured
3. If you have no tools, you are text-only
   - Answer from your training and system prompt context
   - Tell the user what you would do if you had tools

Do not guess which tools exist. If a tool call fails, state what tool
was missing and what capability it would have provided.
```

## For AI SDK Developers

When building a hosted agent that should leverage skills, use `bash-tool`:

```typescript
import {
  experimental_createSkillTool as createSkillTool,
  createBashTool,
} from "bash-tool";

// Skills directory lives alongside your bot code
const { skill, files, instructions } = await createSkillTool({
  skillsDirectory: "./skills",
});

const { tools } = await createBashTool({
  files,
  extraInstructions: instructions,
});

// Now your agent has bash + readFile + writeFile + skill tools
const result = streamText({
  model: gateway("anthropic/claude-sonnet-4.6"),
  tools: { skill, ...tools },
  system: soulPrompt,
  messages,
});
```

## Adapting Behavior

The goal is NOT fallbacks. The goal is clarity.

**Good:** "I'm in a Sandbox. I have bash and file tools but no Skill() tool.
I'll read the skill instructions directly from ./skills/clawnet/SKILL.md."

**Bad:** Silently trying Skill() first, catching the error, then trying
readFile, then trying fetch, then giving up without telling the user.

### Pattern: Capability Declaration

At the start of a conversation or task, state what you can do:

```
I'm running in a Vercel Sandbox with bash, file, and skill tools.
I can: run scripts, read/write files, look up skill instructions.
I cannot: spawn subagents, use Claude Code tools, access the host filesystem.
```

This sets expectations immediately. Users and orchestrators know what to ask for.

## bash-tool: Bridging Claude Code and Sandbox

The `bash-tool` npm package gives AI SDK agents the same capabilities Claude Code
provides natively. It creates `bash`, `readFile`, `writeFile`, and `skill` tools
that work inside Vercel Sandboxes.

### Tool Mapping

| Claude Code Tool | bash-tool Equivalent | Notes |
|-----------------|---------------------|-------|
| `Bash` | `bash` | Shell execution |
| `Read` | `readFile` | File reading |
| `Write` | `writeFile` | File writing |
| `Skill()` | `skill` | Skill discovery and use |
| `Grep`, `Glob` | `bash` with grep/find | No dedicated tools |
| `Agent()` | N/A | Sandboxes are single-agent |
| `WebFetch` | `bash` with curl | No dedicated tool |

### Skill Declaration Across Runtimes

Skills are declared differently depending on the runtime:

| Runtime | Declaration | How skills load |
|---------|------------|----------------|
| **Claude Code** | Agent frontmatter: `tools: Skill(clawnet-cli)` | Plugin system provides at runtime |
| **Vercel Sandbox** | `bot.json`: `"skills": ["clawnet-cli"]` | `createSkillTool()` reads `./skills/` dir |
| **Both** | Reference same `SKILL.md` files | Different loaders, same content |

The `bot.json` `skills` array is the deployed bot's skill manifest — the sandbox
equivalent of agent frontmatter's `Skill()` declarations.

### Integration Pattern

```typescript
import {
  experimental_createSkillTool as createSkillTool,
  createBashTool,
} from "bash-tool";
import { existsSync } from "node:fs";

let agentTools = {};
let skillInstructions = "";

if (existsSync("./skills")) {
  const { skill, files, instructions } = await createSkillTool({
    skillsDirectory: "./skills",
  });
  const { tools } = await createBashTool({
    files,
    extraInstructions: instructions,
  });
  agentTools = { skill, ...tools };
  skillInstructions = instructions;
}

// Pass to streamText
streamText({
  model: gateway(MODEL_ID),
  system: soulPrompt + skillInstructions,
  tools: agentTools,
  messages,
});
```

## When to Use Each Runtime's Strengths

| Task | Claude Code | Sandbox | Text-only |
|------|------------|---------|-----------|
| Search codebase | Grep, Glob | `bash` with grep/find | Cannot - ask user |
| Edit files | Edit tool | `writeFile` | Cannot - show diff |
| Run tests | Bash tool | `bash` tool | Cannot - show command |
| Install packages | Bash tool | `bash` tool | Cannot - show command |
| Delegate subtasks | Agent tool | Cannot - single agent | Cannot |
| Use skills | Skill() tool | `skill` tool or readFile | Cannot |
| Web research | WebFetch, WebSearch | `bash` with curl | Cannot |
