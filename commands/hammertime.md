---
name: hammertime
description: Manage HammerTime stop rules — add, list, enable, disable, or remove rules that catch bad model behaviors at stop time
allowed-tools: Read, Write, Bash
user-invocable: true
---

# HammerTime Rule Manager

You manage HammerTime rules — behavioral guardrails that run as a Stop hook to catch and correct bad model behaviors.

## Rules File

User rules are stored at: `~/.claude/hammertime/rules.json`

Read this file first. If it doesn't exist, that's fine — it gets created on first rule add.

## Rule Format

```json
{
  "name": "kebab-case-name",
  "rule": "Natural language description of the rule",
  "enabled": true,
  "keywords": ["trigger", "words", "for", "fast", "scan"],
  "skill": null
}
```

The file is a JSON array of rule objects.

## Built-in Rules (hardcoded in hook, not in the JSON file)

- **project-owner**: "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing."

Built-in rules can be overridden by adding a user rule with the same name.

## Interpret the User's Intent

The user's argument (after `/hammertime`) tells you what to do:

### No argument → List all rules
Show builtin rules and user rules with their enabled status.

### Description of a behavior → Create a rule
Example: `/hammertime always fix all pre-existing issues`
Example: `/hammertime when you find lint errors, invoke Skill(simplify) to clean them up`
Example: `/hammertime never say everything looks good when there are warnings`

Generate:
- `name`: derive a kebab-case name from the description (short, descriptive)
- `rule`: use the user's description directly (clean it up minimally)
- `keywords`: extract 4-8 likely trigger words/phrases from the description
- `skill`: if the user mentions a Skill(), extract it; otherwise null
- `enabled`: true

Do NOT ask clarifying questions if the description is clear. Just make the rule.

### "disable <name>" → Set enabled to false
### "enable <name>" → Set enabled to true
### "remove <name>" or "delete <name>" → Remove from array

For builtin rules, add an override entry with `enabled: false` to disable.

## After Any Change

1. Write the updated rules array to `~/.claude/hammertime/rules.json` (create `~/.claude/hammertime/` directory if needed)
2. Show the updated rule
3. Remind: **"Restart Claude Code for changes to take effect."**
