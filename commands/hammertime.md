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

### Duration prefix → Create a timer rule

If the argument starts with a duration like `30m`, `1h`, `45m`, `2h`, `90m`:

Example: `/hammertime 30m deep focus on this refactoring`
Example: `/hammertime 1h thorough security review`
Example: `/hammertime 45m finish this feature completely`

**IMPORTANT:** Use the `create-timer.py` script to compute the deadline. Do NOT compute the deadline yourself — the model clock is unreliable.

Run:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/hammertime/scripts/create-timer.py" "<duration>" "<description>"
```

The script:
- Computes the correct deadline using the system clock
- Writes the rule directly to `~/.claude/hammertime/rules.json`
- Prints JSON with the timer details: `{"name": "...", "duration": "...", "deadline": "...", "rule": "..."}`

If the user provides no description after the duration, omit the description argument (the script defaults to a generic focus message).

After the script runs, show:
1. "Timer set for **{duration}** — expires at **{deadline}**"
2. The rule text that will be injected on each block
3. **"Timer is active immediately — no restart needed."**

### No argument → Show full status dashboard

Run the status script and print its output directly:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/hammertime/scripts/status.py"
```

Print the output as-is. Do not add commentary or reformat.

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
- `max_iterations`: 3

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
2. Show the **complete rules table** — all rules, not just the one that changed. Use sequential numbering starting from 1 (matching array order). Include the builtin `project-owner` rule as #0.

   | # | Rule | Status | Threshold | Full Turn |
   |---|---|---|---|---|
   | 0 | `project-owner` (builtin) | enabled | 5 | yes |
   | 1 | `rule-name` | enabled/disabled | N | yes/no |
   | ... | ... | ... | ... | ... |

3. Remind: **"Restart Claude Code for changes to take effect."**
