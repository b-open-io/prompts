---
name: manage
description: Interactive HammerTime rule management — enable, disable, remove, or edit rules with guided prompts
allowed-tools: Read, Write, Bash
user-invocable: true
---

# HammerTime Rule Manager (Interactive)

Guide the user through managing their HammerTime rules interactively.

## Step 1: Load current state

Read user rules from `~/.claude/hammertime/rules.json` (may not exist — that's fine).

**Builtin rules** (always present):
- **project-owner** — "Fix all errors instead of dismissing them as pre-existing."

## Step 2: Show rules and present options

Display all rules with numbered indices:

```
## Your HammerTime Rules

1. **project-owner** (builtin, enabled) — Fix all errors instead of dismissing them as pre-existing.
2. **fix-lint-errors** (enabled) — Fix all lint errors and warnings before stopping.
3. **no-trailing-summaries** (disabled) — Do not add summaries at the end of responses.
```

Then present the action menu:

```
## What would you like to do?

  [A] Add a new rule
  [E] Enable a rule
  [D] Disable a rule
  [R] Remove a rule
  [V] View rule details (show keywords, patterns, full config)
  [T] Test a rule against sample text
  [S] Status — show full dashboard (same as `/hammertime` with no args)
  [Q] Done — exit

Pick a letter, or type a rule number to view its details:
```

Wait for the user to respond. Do NOT proceed until they choose.

## Step 3: Execute the chosen action

### [A] Add a new rule
Ask: "Describe the behavior you want to enforce (e.g., 'always run tests before committing'):"

Then generate the rule using the same logic as `/hammertime`:
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
Show the full JSON for the selected rule, formatted nicely:
- Name, rule text, enabled status
- Keywords (numbered list)
- Intent patterns (with explanation of what each catches)
- Co-occurrence config (dismissal verbs + qualifiers)
- Threshold, skill, evaluate_full_turn

### [T] Test a rule
Ask: "Paste a sample assistant message to test against:"

Then run the three-layer scoring manually:
1. Check each keyword against the text
2. Check each intent pattern
3. Check co-occurrence

Show the score breakdown and what decision the hook would make.

### [Q] Done
Say goodbye and exit.

## Step 4: After any change

1. Write updated rules to `~/.claude/hammertime/rules.json`
2. Show the change
3. Ask: "Want to do anything else?" — if yes, return to Step 2
4. Remind: **"Restart Claude Code for changes to take effect."**

## Important

- Always read the current rules file before making changes (it may have been edited externally)
- Never modify builtin rules in the hook source — only add user overrides
- When showing rules, clearly distinguish builtin from user rules
- Create `~/.claude/hammertime/` directory if it doesn't exist when writing
