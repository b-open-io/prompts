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
- **Effect:** When `true`, prevents Claude from auto-loading/invoking the skill. The user must explicitly type `/skill-name` to use it.
- **Use case:** Skills requiring user interaction (OTP codes, confirmations), publishing workflows, skills with irreversible side effects (sending money, broadcasting transactions).

## Decision Framework

```
Does the skill require user interaction (OTP, confirmation, subjective input)?
  → YES: disable-model-invocation: true

Does the skill have irreversible side effects (sends money, publishes, deploys)?
  → YES: disable-model-invocation: true

Would a user ever type /skill-name to use this directly?
  → NO: user-invocable: false

Is this purely internal agent plumbing or reference knowledge?
  → YES: user-invocable: false

None of the above?
  → Leave defaults (both user and Claude can invoke)
```

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

### User-only skill (Claude cannot auto-invoke)
```yaml
---
name: npm-publish
description: Publish npm packages with OTP verification.
disable-model-invocation: true
---
```

### Default (both user and Claude can invoke)
```yaml
---
name: critique
description: Review git diffs with beautiful terminal UI.
---
```
No additional fields needed — defaults are correct.
