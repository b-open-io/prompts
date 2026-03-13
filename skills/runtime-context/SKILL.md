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

## Adapting Behavior

The goal is NOT fallbacks. The goal is clarity.

**Correct:** "I'm in a Sandbox. I have bash and file tools but no Skill() tool.
I'll read the skill instructions directly from ./skills/clawnet/SKILL.md."

**Incorrect:** Silently trying Skill() first, catching the error, then trying
readFile, then trying fetch, then giving up without telling the user.

### Capability Declaration Pattern

At the start of a conversation or task, state what tools are available:

```
I'm running in a Vercel Sandbox with bash, file, and skill tools.
I can: run scripts, read/write files, look up skill instructions.
I cannot: spawn subagents, use Claude Code tools, access the host filesystem.
```

This sets expectations immediately so users and orchestrators know what to ask for.

## Reference Files

- `README.md` — Three runtimes explained, capability matrix, bash-tool integration guide for SDK developers, skill declaration across runtimes
