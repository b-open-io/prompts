---
name: hammertime
description: Create a HammerTime stop rule from a behavior description, or show full status dashboard when called with no arguments. See also /hammertime:manage for interactive rule management
allowed-tools: Read, Write, Bash, Agent
user-invocable: true
---

# HammerTime

You manage HammerTime rules — behavioral guardrails that run as a Stop hook to catch and correct bad model behaviors.

**Related command:** `/hammertime:manage` — Interactive management (enable, disable, remove, view, test rules)

## Interpret the User's Intent

The user's argument (after `/hammertime`) tells you what to do:

### No argument → Show full status dashboard

Delegate to a subagent to gather and format the dashboard. Use the Agent tool:

```
Agent(prompt: "Read the HammerTime state and return a formatted status dashboard.

1. BUILTIN RULES (always present, hardcoded in hook):
   - project-owner: 'Fix all errors instead of dismissing them as pre-existing.' (evaluate_full_turn: true, keywords: 15, patterns: 8, co-occurrence: yes, threshold: 5)

2. Read user rules from ~/.claude/hammertime/rules.json (may not exist — report 'No user rules configured' if missing).
   For each rule, count: keywords, intent_patterns, whether dismissal_verbs+qualifiers are set, confidence_threshold, evaluate_full_turn, skill.

3. Check ~/.claude/hammertime/debug.log — if exists, show last 20 lines. If not, say: 'Debug logging not enabled. Set HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log to enable.'

4. Check ~/.claude/settings.json for hooks.Stop entries referencing hammertime.py. Report if hook is registered there, or note it runs via the bopen-tools plugin.

Return a formatted response with:
- Rules table: | # | Rule | Status | Layers | Threshold | Full Turn | Skill |
- Debug log section
- Hook registration status
- Quick actions: /hammertime <desc>, /hammertime:manage, HAMMERTIME_DEBUG env var",
subagent_type: "general-purpose")
```

Print the subagent's response directly to the user.

### Description of a behavior → Create a rule

Example: `/hammertime always fix all pre-existing issues`
Example: `/hammertime when you find lint errors, invoke Skill(simplify) to clean them up`
Example: `/hammertime never say everything looks good when there are warnings`

Read `~/.claude/hammertime/rules.json` first (may not exist).

Generate:
- `name`: derive a kebab-case name from the description (short, descriptive)
- `rule`: use the user's description directly (clean it up minimally)
- `keywords`: extract 4-8 likely trigger words/phrases from the description
- `intent_patterns`: write 2-4 regex patterns matching structural dismissal for this rule. Use `\s+`, `(?:...|...)`, and `.*?` for flexible matching.
- `dismissal_verbs`: regex matching refusal verbs relevant to the rule (optional)
- `qualifiers`: regex matching attribution/deflection terms relevant to the rule (optional)
- `skill`: if the user mentions a Skill(), resolve informal names to fully-qualified IDs. If no skill mentioned, null.
- `enabled`: true
- `confidence_threshold`: 5

Do NOT ask clarifying questions if the description is clear. Just make the rule.

### "disable <name>" → Set enabled to false
### "enable <name>" → Set enabled to true
### "remove <name>" or "delete <name>" → Remove from array

For builtin rules, add an override entry with `enabled: false` to disable.

## After Any Change

1. Write the updated rules array to `~/.claude/hammertime/rules.json` (create `~/.claude/hammertime/` directory if needed)
2. Show the updated rule
3. Remind: **"Restart Claude Code for changes to take effect."**
