---
description: Show HammerTime status dashboard — rules, debug log, hook health
allowed-tools: Agent
user-invocable: true
---

# HammerTime Status

Delegate ALL data gathering to a subagent. Do not read files in the main context.

Use the Agent tool with this prompt:

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
