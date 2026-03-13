---
name: hammertime
description: Create a HammerTime stop rule from a behavior description, or show full status dashboard when called with no arguments. See also /hammertime:manage for interactive rule management
allowed-tools: Read, Write, Bash
user-invocable: true
---

# HammerTime

You manage HammerTime rules — behavioral guardrails that run as a Stop hook to catch and correct bad model behaviors.

**Related command:** `/hammertime:manage` — Interactive management (enable, disable, remove, view, test rules)

## Rules File

User rules are stored at: `~/.claude/hammertime/rules.json`

Read this file first. If it doesn't exist, that's fine — it gets created on first rule add.

## Built-in Rules (hardcoded in hook, not in the JSON file)

- **project-owner**: "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing." (`evaluate_full_turn: true`)

Built-in rules can be overridden by adding a user rule with the same name.

## Interpret the User's Intent

The user's argument (after `/hammertime`) tells you what to do:

### No argument → Show full status dashboard

Show the complete state of HammerTime:

**1. Rules table** — Read builtin rules and user rules from `~/.claude/hammertime/rules.json`, then present ALL rules:

```
## HammerTime Rules

| # | Rule | Status | Layers | Threshold | Full Turn | Skill |
|---|------|--------|--------|-----------|-----------|-------|
| 1 | project-owner (builtin) | enabled | kw:15 pat:8 co:yes | 5 | yes | - |
| 2 | fix-lint-errors | enabled | kw:7 pat:2 co:yes | 5 | yes | - |
```

Where Layers = keyword count, pattern count, co-occurrence configured.

**2. Debug log** — If `~/.claude/hammertime/debug.log` exists, show last 20 lines. Otherwise show: "Debug logging not enabled. Set `HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log` to enable."

**3. Hook registration** — Check `~/.claude/settings.json` for `hooks.Stop` entries referencing `hammertime.py`. Report whether the hook is registered.

**4. Quick actions:**
```
- `/hammertime <description>` — Create a new rule
- `/hammertime:manage` — Interactive rule management
- `export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log` — Enable debug logging
```

### Description of a behavior → Create a rule
Example: `/hammertime always fix all pre-existing issues`
Example: `/hammertime when you find lint errors, invoke Skill(simplify) to clean them up`
Example: `/hammertime never say everything looks good when there are warnings`

Generate:
- `name`: derive a kebab-case name from the description (short, descriptive)
- `rule`: use the user's description directly (clean it up minimally)
- `keywords`: extract 4-8 likely trigger words/phrases from the description
- `intent_patterns`: write 2-4 regex patterns matching structural dismissal for this rule. These catch paraphrases that keywords miss. Use `\s+`, `(?:...|...)`, and `.*?` for flexible matching.
- `dismissal_verbs`: regex matching refusal verbs relevant to the rule (optional)
- `qualifiers`: regex matching attribution/deflection terms relevant to the rule (optional)
- `skill`: if the user mentions a Skill(), resolve informal names to fully-qualified IDs by reading the skills directory or using `find-skills`. E.g., "visual planner" → `gemskills:visual-planner`. If no skill mentioned, null.
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
