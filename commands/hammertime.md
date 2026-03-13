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

#### Step 1: Mine real examples from production logs

Before generating any keywords or patterns, search production conversation logs using the remind skill:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/remind/scripts/search.py" "<2-3 key terms from the user's description>" --limit 10 --no-recency
```

Scan the returned assistant messages for:
- **True positives** (3-5): Messages that demonstrate the exact bad behavior described. Extract the specific phrases the model used.
- **True negatives** (2-3): Messages using similar vocabulary that do NOT violate the rule. These guard against overfitting keywords.

If the remind search returns no results (Scribe DB unavailable, no matches, or the script doesn't exist), skip to Step 2 and generate from the description alone.

#### Step 2: Generate grounded fields from real examples

Use the phrases extracted from real log examples — not hypothetical guesses — to populate:

- `name`: derive a kebab-case name from the description (short, descriptive)
- `rule`: use the user's description directly (clean it up minimally)
- `keywords`: extract 4-8 trigger words/phrases that appear in the TRUE POSITIVE examples found. If no logs found, extract from the description.
- `intent_patterns`: write 2-4 regex patterns matching the structural patterns seen in real violating messages. Use `\s+`, `(?:...|...)`, and `.*?` for flexible matching.
- `dismissal_verbs`: regex matching refusal verbs that appeared in real examples (optional)
- `qualifiers`: regex matching attribution/deflection terms that appeared in real examples (optional)
- `skill`: if the user mentions a Skill(), resolve informal names to fully-qualified IDs. If no skill mentioned, null.
- `enabled`: true
- `confidence_threshold`: 5

#### Step 3: Output test cases

Show the user the test cases extracted from real logs, formatted as a table:

| Message (excerpt) | Should trigger | Category | Source |
|---|---|---|---|
| "these lint errors aren't critical..." | yes | true positive | session log |
| "I noticed some warnings but fixed..." | no | true negative | session log |

If no logs were found, skip this table.

Do NOT ask clarifying questions if the description is clear. Just make the rule.

### "disable <name>" → Set enabled to false
### "enable <name>" → Set enabled to true
### "remove <name>" or "delete <name>" → Remove from array

For builtin rules, add an override entry with `enabled: false` to disable.

## After Any Change

1. Write the updated rules array to `~/.claude/hammertime/rules.json` (create `~/.claude/hammertime/` directory if needed)
2. Show the updated rule
3. Remind: **"Restart Claude Code for changes to take effect."**
