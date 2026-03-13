# Runtime Context Skill

Detects which execution environment an agent is running in and provides the system prompt template and behavior rules for adapting across runtimes. Not user-invocable — this skill is consumed by other agents and system prompts.

## The Three Runtimes

| Runtime | How to detect | Tools available | Skills via |
|---------|--------------|-----------------|-----------|
| **Claude Code** | `CLAUDE_CODE=1` env var; or `Skill()`, `Agent()`, `Read` tools exist | Full suite: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebFetch, WebSearch | `Skill()` tool |
| **Vercel Sandbox** | `/vercel/sandbox/` paths exist; `VERCEL_SANDBOX_ID` env var set | bash-tool trio: `bash`, `readFile`, `writeFile`, plus `skill` if configured | `createSkillTool()` from `bash-tool` |
| **Local dev** | Neither of the above; `process.cwd()` in user home or project dir | Whatever the app provides (usually HTTP + AI SDK only) | Direct file reads or none |

## Capability Matrix

| Task | Claude Code | Sandbox | Text-only |
|------|------------|---------|-----------|
| Search codebase | Grep, Glob | `bash` with grep/find | Cannot — ask user |
| Edit files | Edit tool | `writeFile` | Cannot — show diff |
| Run tests | Bash tool | `bash` tool | Cannot — show command |
| Install packages | Bash tool | `bash` tool | Cannot — show command |
| Delegate subtasks | Agent tool | Cannot — single agent | Cannot |
| Use skills | Skill() tool | `skill` tool or readFile | Cannot |
| Web research | WebFetch, WebSearch | `bash` with curl | Cannot |

## bash-tool: Bridging Claude Code and Sandbox

The `bash-tool` npm package gives AI SDK agents the same capabilities Claude Code provides natively. It creates `bash`, `readFile`, `writeFile`, and `skill` tools that work inside Vercel Sandboxes.

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

The `bot.json` `skills` array is the deployed bot's skill manifest — the sandbox equivalent of agent frontmatter's `Skill()` declarations.

### Integration Guide for AI SDK Developers

When building a hosted agent that should leverage skills, use `bash-tool`:

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

This pattern conditionally activates the skill and bash tools only when a `./skills` directory is present, so the same code works in both sandbox and local environments.
