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
  "intent_patterns": ["regex\\s+patterns?\\s+for\\s+structural\\s+matching"],
  "dismissal_verbs": "\\b(?:dismiss|skip|ignore)\\b",
  "qualifiers": "\\b(?:pre-?existing|scope|unrelated)\\b",
  "confidence_threshold": 5,
  "skill": null
}
```

The file is a JSON array of rule objects.

### Three-Layer Scoring

Rules are evaluated with three detection layers that produce a score:

- **Layer 1 — Keywords** (+1 each): Case-insensitive substring matches
- **Layer 2 — Intent Patterns** (+2 each): Regex patterns matching structural dismissal
- **Layer 3 — Sentence Co-occurrence** (+3): Dismissal verb + qualifier in the same sentence

**Score → Decision:**
- **0**: Exit immediately (no match)
- **1–4**: Haiku verification (ambiguous signal)
- **5+**: Block directly (obvious violation, skips Haiku)

The `confidence_threshold` field (default: 5) controls the direct-block cutoff.

### Optional Fields

- `intent_patterns`: Array of regex strings for structural pattern matching. Compiled at load time.
- `dismissal_verbs`: Regex string matching verbs that signal refusal to act.
- `qualifiers`: Regex string matching terms that signal attribution/deflection.
- `confidence_threshold`: Score at which to block without Haiku verification (default: 5).

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
