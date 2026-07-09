# Skill Invocation Control Fields

Official Claude Code SKILL.md frontmatter fields for controlling skill invocation behavior.

## Fields

### `user-invocable`
- **Type:** boolean
- **Default:** `true`
- **Effect:** When `false`, hides the skill from the user's `/` slash command menu. The skill can only be invoked by Claude/agents via `Skill()` tool calls.
- **Use case:** Agent-internal skills, background knowledge bases, plumbing skills consumed by other skills.

### `disable-model-invocation`
- **Type:** boolean
- **Default:** `false`
- **Effect:** When `true`, prevents Claude from auto-loading/invoking the skill via the `Skill()` tool. The user must explicitly type `/skill-name` to use it.
- **Use case:** Reserved for skills where even user-directed invocation through Claude is dangerous — e.g., skills that bypass normal approval flows or where the Bash approval step is insufficient as a safety net.

## Decision Framework

```
Is this purely internal agent plumbing or reference knowledge?
  → YES: user-invocable: false

Would a user ever type /skill-name to use this directly?
  → NO: user-invocable: false

Does the skill bypass Bash approval or operate outside the normal
tool-approval flow in a way that can't be intercepted?
  → YES: disable-model-invocation: true

Does the skill have irreversible side effects (publishes, deploys, sends money)
but all actions go through Bash commands the user can approve/deny?
  → Leave default. Bash approval is the safety net.
  → Strong description guardrails ("Do not trigger for...") prevent
    accidental auto-triggering.

None of the above?
  → Leave defaults (both user and Claude can invoke)
```

### Why Most Skills Should NOT Use `disable-model-invocation`

The flag blocks ALL `Skill()` invocation — including when the user explicitly tells Claude to use a skill. This creates unnecessary friction:

1. User says "use the npm-publish skill" → Claude tries `Skill("npm-publish")` → blocked
2. Claude routes through a subagent that has it in its tool list → works but is indirect
3. User has to type `/npm-publish` themselves → works but defeats the purpose of asking Claude

For skills with irreversible side effects (publishing, deploying), the Bash tool approval already provides a human-in-the-loop checkpoint. The user sees the exact command and approves or denies it. This is sufficient for most cases.

Reserve `disable-model-invocation: true` for skills that genuinely cannot be safely invoked even with Bash approval — e.g., skills that send external API calls without going through Bash, or skills that require interactive terminal sessions.

## Benchmarkability Signal

Skills WITHOUT `disable-model-invocation: true` are agent-automatable and suitable for automated benchmarking. Skills WITH it require human-in-the-loop and must be benchmarked manually or with mocked interactions.

## Source

These fields are part of the official Claude Code skills schema, documented at `code.claude.com/docs/en/skills`.

## Examples

### Agent-only skill (hidden from user menu)
```yaml
---
name: reinforce-skills
description: Injects skill map into CLAUDE.md for agent routing.
user-invocable: false
---
```

### Default (both user and Claude can invoke)
```yaml
---
name: npm-publish
description: This skill should be used when the user wants to publish a package to npm... Do not trigger for unrelated uses of "release".
---
```
Description guardrails + Bash approval prevent accidental publishes.

### Restricted skill (Claude cannot invoke, even when asked)
```yaml
---
name: dangerous-broadcast
description: Broadcasts irreversible on-chain transactions without Bash approval.
disable-model-invocation: true
---
```
Only use this when the skill bypasses normal approval flows.
