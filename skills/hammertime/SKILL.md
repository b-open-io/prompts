---
name: hammertime
description: >-
  This skill should be used when the user mentions a behavioral rule they want
  enforced, says "always do X", "never do Y", "stop doing Z", "from now on",
  asks about HammerTime rules, wants to create a stop hook rule, mentions
  behavioral guardrails, or wants to understand how the HammerTime stop hook
  system works. Teaches how to write rules for the HammerTime stop hook system.
---

# HammerTime — Behavioral Rule System

Rules live at `~/.claude/hammertime/rules.json`. The hook registers as a Stop hook and fires on every assistant turn.

Two rule types:
- **Content rules** — scored detection against response text (three-layer scoring + optional Haiku verification)
- **Timer rules** — time-based blocking until a deadline passes (no scoring, no Haiku)

## When to Create a Rule

Recognize rule intent even when the user doesn't say "hammertime":

**Imperative patterns:**
- "Always fix lint errors before stopping"
- "Never say 'everything looks good' when there are warnings"
- "Stop summarizing what you did at the end"
- "From now on, run tests before committing"
- "I want you to use the visual planner for architecture decisions"
- "Don't dismiss issues as pre-existing"

**Implicit patterns (user describes frustration or expectation):**
- "You keep forgetting to run the linter" → rule to always run linter
- "I've told you three times to check types" → rule to verify types
- "Why do you always skip the tests?" → rule to never skip tests

**Rule vs one-time request:** "Fix this lint error" is a task. "Always fix lint errors" is a rule. Future behavioral expectations → rule.

**When NOT to create a rule:**
- One-time instructions for the current task
- Preferences already handled by CLAUDE.md or settings
- Rules that would fire on nearly every response (too broad)

## Timer Rules

Timer rules block all stop attempts until a deadline. No keywords, no scoring — purely time-based. Use them for deep focus sessions where you want the agent to keep iterating.

```
/hammertime 30m deep focus on this refactoring
/hammertime 1h thorough security review of the codebase
/hammertime 45m finish this feature completely
```

Timer rule schema:
```json
{
  "name": "timer-1742054400",
  "rule": "Deep focus on this refactoring task.",
  "enabled": true,
  "deadline": "2026-03-15T14:30:00",
  "keywords": [],
  "max_iterations": 0
}
```

Key behaviors:
- Timer rules bypass the `stop_hook_active` guard (safe because deadline provides termination)
- `max_iterations: 0` means unlimited blocks until deadline (the deadline IS the guard)
- When deadline passes, the rule is **auto-deleted** from `rules.json`
- Block message includes remaining time and motivational prompt
- Timer rules are evaluated before content rules — a timer block prevents content rule evaluation

## Content Rule Schema

Content rules are JSON objects in an array. Required and optional fields:

```json
{
  "name": "kebab-case-name",
  "rule": "Natural language description of what the agent should or shouldn't do",
  "enabled": true,
  "keywords": ["trigger", "words", "4-8", "terms"],

  "intent_patterns": ["regex\\s+patterns?\\s+for\\s+structural\\s+matching"],
  "dismissal_verbs": "\\b(?:skip|ignore|dismiss)\\b",
  "qualifiers": "\\b(?:pre-?existing|scope|unrelated)\\b",
  "confidence_threshold": 5,
  "skill": null,
  "evaluate_full_turn": true,
  "max_iterations": 3
}
```

**Required fields:**
- `name` — Unique kebab-case identifier
- `rule` — Natural language rule text (used in Haiku verification and the block message)
- `enabled` — Boolean toggle
- `keywords` — Array of 4-8 trigger strings for Layer 1 scoring

**Optional fields (content rules):**
- `intent_patterns` — Array of regex strings for Layer 2 structural matching (compiled at load time)
- `dismissal_verbs` — Single regex string matching refusal/avoidance verbs for Layer 3
- `qualifiers` — Single regex string matching attribution/deflection terms for Layer 3
- `confidence_threshold` — Score at which to block without Haiku (default: 5)
- `skill` — Fully-qualified skill ID to invoke when rule fires (e.g., `gemskills:visual-planner`)
- `evaluate_full_turn` — Boolean. When `true`, scores ALL assistant messages since the user's last message (reads session transcript). When `false` or omitted, scores only the final assistant message. Default: `false`.
- `max_iterations` — Maximum times this rule can block per session before auto-allowing exit (default: 3, set 0 for unlimited). Prevents infinite loops when a rule is too broad or can't be satisfied.
- `check_git_state` — Boolean. When `true`, the hook runs `git status --porcelain`, `git log @{u}..HEAD`, and `git ls-files --others --exclude-standard` before blocking. If the working tree is clean and all commits are pushed, the rule is skipped entirely (both the direct-block and Haiku phase paths). Useful for rules about pushing or committing work, so they don't fire when there is genuinely nothing to push. Default: `false`.

**Timer-specific field:**
- `deadline` — ISO 8601 datetime string (e.g., `"2026-03-15T14:30:00"`). When present, the rule becomes a timer rule — it blocks all stop attempts until the deadline passes, bypassing content scoring entirely. Auto-deleted from `rules.json` when expired.

## Three-Layer Scoring

Every assistant response is scored against all enabled rules:

| Layer | What it matches | Score | Purpose |
|-------|----------------|-------|---------|
| **1 — Keywords** | Case-insensitive substring match | +1 each | Broad signal detection |
| **2 — Intent Patterns** | Regex patterns on full text | +2 each | Structural paraphrase catching |
| **3 — Co-occurrence** | Dismissal verb + qualifier in same sentence | +3 | Highest-confidence signal |

**Score thresholds:**
- **0** — No match. Exit immediately.
- **1–4** — Ambiguous. Haiku verification decides (costs ~500ms, ~$0.001).
- **5+** — Obvious violation. Block directly, skip Haiku.

The `confidence_threshold` field controls the direct-block cutoff (default: 5). Lower it for stricter enforcement; raise it to rely more on Haiku verification.

## Creating a Rule — Workflow

### Step 1: Derive the name

Use a short kebab-case name: `fix-lint-errors`, `no-trailing-summaries`, `use-visual-planner`.

### Step 2: Write the rule text

The `rule` field is natural language that describes the expected behavior. **This text IS the error message the agent sees when the rule fires.** It's the only context the agent has to understand what went wrong and what to do. It also gets sent to Haiku for verification.

**Write the rule text as if you're explaining the problem to an agent that has never heard of this rule.** Include:
1. **What to do** — the expected behavior (action-first)
2. **What not to do** — the specific violation being caught
3. **Why** — reasoning helps the agent (and Haiku) judge edge cases

Good: "Fix all lint errors before stopping. Do not report them without fixing. The user expects all errors to be resolved, not catalogued."
Bad: "Be better at linting."
Bad: "Don't do that." (agent has no idea what "that" is)
Bad: "Lint rule." (too terse — the error message would be useless)

**Minimum 15 words.** If the rule text is shorter, the error message won't give the agent enough context to act.

### Step 3: Extract keywords (4-8)

Pick words/phrases that would appear in a violating response. Focus on terms the model would use when breaking the rule, not terms describing the rule itself.

For "fix lint errors": `["lint warning", "lint error", "linting issue", "eslint", "biome", "I'll leave", "you can fix", "not critical"]`

For "run tests before committing": `["skipping tests", "without testing", "skip the tests", "no tests needed", "tests aren't necessary", "commit without running"]`

**Guideline:** 4-8 keywords. Fewer = more false negatives. More = more false positives. Intent patterns are better for catching paraphrases than adding more keywords.

**Important:** Keywords match as substrings, so `"lint error"` matches "there are 3 lint errors remaining". Multi-word keywords are strongly preferred over single words to reduce false positive rates.

### Step 4: Write intent patterns (2-4 regex)

Regex patterns that catch structural dismissal even when exact keywords aren't used. These match on the full response text with `re.IGNORECASE`.

```python
# Catches: "these lint issues aren't critical", "the warnings don't need fixing"
r"(?:lint|warning|error)s?\s+(?:aren't|are\s+not|don't|do\s+not)\s+(?:critical|important|blocking)"

# Catches: "I'll leave these for you to fix", "you may want to address these"
r"(?:leave|defer|skip)\s+(?:these|them|this)\s+(?:for|to)\s+(?:you|the\s+user)"
```

Use `\s+` for flexible whitespace, `(?:...|...)` for alternatives, `.*?` for gaps. See `references/rule-design.md` for comprehensive regex guidance.

### Step 5: Add co-occurrence terms (optional)

For Layer 3, define `dismissal_verbs` and `qualifiers` as regex strings. These fire only when both appear in the same sentence — the highest-confidence signal.

```json
"dismissal_verbs": "\\b(?:skip|ignore|leave|defer|won't\\s+fix)\\b",
"qualifiers": "\\b(?:non-?critical|cosmetic|minor|style|optional)\\b"
```

### Step 6: Set confidence threshold

Default is 5 (conservative). For rules where false positives are costly, raise to 7. For rules where catching violations matters more, lower to 3.

### Step 7: Resolve skill names (if applicable)

If the rule should invoke a skill when it fires, resolve the informal name to a fully-qualified ID:

- Use `Skill(find-skills)` to search: "visual planner" → `gemskills:visual-planner`
- Use `Skill(simplify)` → `bopen-tools:simplify` (prefix with plugin name)

Set the `skill` field to the resolved ID, or `null` if no skill is needed.

### Step 8: Validate the error message

Before writing the rule, preview what the agent will see when the rule fires. The block message follows this format:

```
[HammerTime] Rule '{name}' triggered.
RULE: {rule text}
TRIGGERED BY: {matched keywords and intent phrases}
ACTION: Fix these issues NOW / Ask the user whether to fix...
```

**Checklist — would an agent seeing this message for the first time understand:**
- [ ] What behavior is expected?
- [ ] What it did wrong?
- [ ] What action to take?

If any answer is "no", rewrite the `rule` text. The rule text is the agent's only lifeline when the hook blocks it.

### Step 9: Write the rules file

Read the existing `~/.claude/hammertime/rules.json` (or start with `[]` if it doesn't exist). Append the new rule and write the file. Create the `~/.claude/hammertime/` directory if needed.

```bash
mkdir -p ~/.claude/hammertime
```

### Step 10: Check if HammerTime is paused

After writing the rule, check for the disabled sentinel:

```bash
test -f ~/.claude/hammertime/disabled && echo "PAUSED"
```

If paused, warn: **"Note: HammerTime is currently paused. This rule has been saved but won't fire until you run `/hammertime:start`."**

### Step 11: Remind about restart

Rules are loaded at hook registration time. Tell the user: **"Restart Claude Code for the new rule to take effect."**

## Skill Invocation in Rules

The `skill` field triggers automatic skill invocation when a rule fires. The block message appends `Invoke Skill(<id>) to address this.`

| Rule detects | Skill invoked | Effect |
|-------------|---------------|--------|
| Model skips tests | `superpowers:test-driven-development` | Redirects to TDD workflow |
| Model ignores lint | `bopen-tools:simplify` | Runs code simplification |
| Model skips architecture planning | `gemskills:visual-planner` | Forces visual planning step |
| Model writes insecure code | `bopen-tools:code-audit-scripts` | Runs security audit |

Resolve informal skill names with `Skill(find-skills)` before setting the `skill` field.

## Mode Inference

The hook infers whether to auto-fix or ask the user based on the rule text:

- **Fix mode**: Rule contains "fix all", "always fix", "fix any", "fix every" → block message says "Fix these issues NOW"
- **Ask mode**: Everything else → block message says "Ask the user whether to fix"

Write rule text accordingly to control the behavior.

## Full-Turn vs Last-Message Evaluation

By default, HammerTime scores only the final assistant message. Set `"evaluate_full_turn": true` to score ALL assistant text since the user's last message — necessary for violations that occur in intermediate messages (dismissing an error in message 3, then finishing with "Done." in message 5).

Use full-turn for rules about dismissing work, skipping process steps, or any violation that happens during execution rather than in the final summary. Last-message scoring is sufficient for format rules and output style rules.

## Debug Logging

Set the environment variable to enable score breakdowns:

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
```

```
[   2ms] SCORE: rule 'fix-lint-errors' score=4 (kw=2, intent=1, cluster=0)
[   3ms] PHASE2: score 4 < 5, verifying with Haiku
[ 487ms] PHASE2: rule 'fix-lint-errors' violated=true
```

## Key Principles

1. **Intent patterns > more keywords.** Two good patterns catch more than ten mediocre keywords. Patterns match structure; keywords match vocabulary.
2. **Co-occurrence is highest signal.** A dismissal verb + qualifier in the same sentence is almost always a violation. Use Layer 3 for your most confident detection.
3. **Don't over-keyword.** Too many keywords cause false positives on innocent responses. If you find yourself adding 10+ keywords, the rule is probably too broad — split it or use patterns instead.
4. **Default threshold of 5 is conservative.** Most rules work well at 5. Only adjust if you see specific problems in the debug log.
5. **Test with real examples.** Before writing patterns, look at actual model responses that violate the rule. Write keywords and patterns that match those real responses, not hypothetical ones.
6. **Rules stack.** Multiple rules can match the same response. The first confirmed violation triggers a block.
7. **Minimal viable rule.** Not every rule needs all three layers. A simple rule with good keywords and 2 intent patterns is often sufficient. Add co-occurrence only when you need high-confidence same-sentence detection.
8. **Rule text matters for Haiku.** When a score falls in the 1-4 range, Haiku reads the `rule` text to decide. A clear, specific rule text helps Haiku make better decisions. Include the "why" in the rule text, not just the "what".

## Built-in Rules

The hook ships with one hardcoded rule:

- **project-owner** — "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing."

This rule can be overridden by adding a user rule with `"name": "project-owner"` to the JSON file.

## Corpus-Driven Rule Creation

Always prefer keywords and patterns derived from real session logs over synthetic guesses. Real dismissal language (`"this appears to be pre-existing"`) rarely matches what a human would guess (`"pre-existing issue"`).

### The workflow

1. Extract 2-3 key terms from the user's behavior description.
2. Call the remind search script with those terms and `--no-recency` to search the full corpus:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/remind/scripts/search.py" "TERMS" --limit 10 --no-recency
   ```
3. Scan returned assistant messages. Classify each as:
   - **True positive** — message demonstrating the bad behavior. Extract the exact phrases used.
   - **True negative** — message using similar vocabulary but NOT violating. These prevent keyword overfitting.
4. Derive keywords and intent_patterns from the true positive phrases. Use true negative phrases to rule out overly broad matches.
5. Present extracted test cases to the user as a table: message excerpt, should_trigger, category, source note.

### Fallback

If the remind script is absent, the Scribe DB is unavailable, or the search returns zero results, fall back to generating keywords and patterns from the description alone (the pre-corpus workflow). Note the fallback in the output so the user knows the rule is synthetic and may need tuning.

## Reference

- `references/rule-design.md` — Deep guide on designing each scoring layer with annotated examples
- `examples/rules.json` — Complete example rules showing full v2 schema
