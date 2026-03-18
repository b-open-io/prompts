---
description: Interactive HammerTime rule management — enable, disable, remove, or edit rules with guided prompts
allowed-tools: Read, Write, Bash, Agent
user-invocable: true
---

# HammerTime Rule Manager (Interactive)

Guide the user through managing their HammerTime rules interactively.

## Step 1: Load current state via subagent

Delegate to a subagent to read and format the current rules. Do not read rule files in the main context.

```
Agent(prompt: "Read HammerTime rules and return a numbered list.

BUILTIN RULES (always present):
1. project-owner (builtin, enabled) — Fix all errors instead of dismissing them as pre-existing. (evaluate_full_turn: true)

Read ~/.claude/hammertime/rules.json (may not exist — that means no user rules).
For each user rule, show: number, name, enabled/disabled status, one-line rule text.
For timer rules (rules with a 'deadline' field), also show the deadline and remaining time (or 'EXPIRED').

Return ONLY the numbered list, nothing else.",
subagent_type: "general-purpose")
```

## Step 2: Present options

Show the subagent's numbered list, then present:

```
## What would you like to do?

  [A] Add a new rule
  [E] Enable a rule
  [D] Disable a rule
  [R] Remove a rule
  [V] View rule details (show keywords, patterns, full config)
  [T] Test a rule against sample text
  [Q] Done — exit

Pick a letter, or type a rule number to view its details:
```

Wait for the user to respond. Do NOT proceed until they choose.

## Step 3: Execute the chosen action

### [A] Add a new rule
Ask: "Describe the behavior you want to enforce (e.g., 'always run tests before committing'):"

Then generate the rule:
- Derive `name`, `rule`, `keywords` (4-8), `intent_patterns` (2-4 regex), optional `dismissal_verbs`, `qualifiers`
- Set `enabled: true`, `confidence_threshold: 5`
- Show the generated rule and ask the user to confirm before saving

### [E] Enable a rule
Ask which rule (by number or name). Set `enabled: true`. For builtin rules, add/update an override entry in the user rules file.

### [D] Disable a rule
Ask which rule (by number or name). Set `enabled: false`. For builtin rules, add an override entry with `enabled: false`.

### [R] Remove a rule
Ask which rule (by number or name). Cannot remove builtin rules — tell the user to disable instead. Remove the rule from the array. Confirm before deleting.

### [V] View rule details
Delegate to a subagent to read and format the full rule config:

```
Agent(prompt: "Read ~/.claude/hammertime/rules.json and return the full config for rule '<name>'.
Show: name, rule text, enabled, keywords (numbered), intent_patterns (with explanation of what each catches), dismissal_verbs, qualifiers, confidence_threshold, evaluate_full_turn, skill.
If it's the builtin 'project-owner' rule, use the hardcoded values: 15 keywords, 8 intent patterns, co-occurrence configured, threshold 5, evaluate_full_turn true.",
subagent_type: "general-purpose")
```

### [T] Test a rule against sample text
Ask: "Paste a sample assistant message to test against:"

Then run the three-layer scoring manually:
1. Check each keyword against the text
2. Check each intent pattern
3. Check co-occurrence

Show the score breakdown and what decision the hook would make.

### [Q] Done
Say goodbye and exit.

## Step 4: After any change

1. Write updated rules to `~/.claude/hammertime/rules.json` (create `~/.claude/hammertime/` if needed)
2. Show the change
3. Check if HammerTime is paused: `test -f ~/.claude/hammertime/disabled && echo "PAUSED"`. If paused, warn: **"Note: HammerTime is currently paused. This change has been saved but won't take effect until you run `/hammertime:start`."**
4. Ask: "Want to do anything else?" — if yes, return to Step 2
5. Remind: **"Restart Claude Code for changes to take effect."**

## Important

- Always read the current rules file before making changes (it may have been edited externally)
- Never modify builtin rules in the hook source — only add user overrides
- When showing rules, clearly distinguish builtin from user rules
- Create `~/.claude/hammertime/` directory if it doesn't exist when writing
