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

HammerTime is a stop hook that catches bad model behaviors before they reach the user. It runs on every assistant response. Detection is two-phase: fast local scoring (free, <1ms) followed by optional Haiku verification (cheap, ~500ms) for ambiguous signals.

Rules live at `~/.claude/hammertime/rules.json`. The hook is implemented in `hooks/hammertime.py` and distributed via the bopen-tools plugin.

## When to Create a Rule

Recognize user intent even when they don't say "hammertime". These natural language patterns all signal "create a behavioral rule":

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

**Key insight:** If the user describes a behavioral expectation for future responses — not just this conversation — that's a rule. The distinction: "fix this lint error" is a one-time request. "Always fix lint errors" is a rule.

**When NOT to create a rule:**
- One-time instructions for the current task
- Preferences already handled by CLAUDE.md or settings
- Rules that would fire on nearly every response (too broad)

## Rule Schema

Rules are JSON objects in an array. Required and optional fields:

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
  "skill": null
}
```

**Required fields:**
- `name` — Unique kebab-case identifier
- `rule` — Natural language rule text (used in Haiku verification and the block message)
- `enabled` — Boolean toggle
- `keywords` — Array of 4-8 trigger strings for Layer 1 scoring

**Optional fields:**
- `intent_patterns` — Array of regex strings for Layer 2 structural matching (compiled at load time)
- `dismissal_verbs` — Single regex string matching refusal/avoidance verbs for Layer 3
- `qualifiers` — Single regex string matching attribution/deflection terms for Layer 3
- `confidence_threshold` — Score at which to block without Haiku (default: 5)
- `skill` — Fully-qualified skill ID to invoke when rule fires (e.g., `gemskills:visual-planner`)

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

The `rule` field is natural language that describes the expected behavior. It's shown to Haiku for verification and included in the block message. Be specific and actionable.

Good: "Fix all lint errors before stopping. Do not report them without fixing."
Bad: "Be better at linting."

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

### Step 8: Write the rules file

Read the existing `~/.claude/hammertime/rules.json` (or start with `[]` if it doesn't exist). Append the new rule and write the file. Create the `~/.claude/hammertime/` directory if needed.

```bash
mkdir -p ~/.claude/hammertime
```

### Step 9: Remind about restart

Rules are loaded at hook registration time. Tell the user: **"Restart Claude Code for the new rule to take effect."**

## Skill Invocation in Rules

The `skill` field triggers automatic skill invocation when a rule fires. The block message appends `Invoke Skill(<id>) to address this.`

This is powerful for corrective workflows: a rule detects bad behavior, and the skill provides the structured fix.

**Examples of rule → skill pairings:**

| Rule detects | Skill invoked | Effect |
|-------------|---------------|--------|
| Model skips tests | `superpowers:test-driven-development` | Redirects to TDD workflow |
| Model ignores lint | `bopen-tools:simplify` | Runs code simplification |
| Model skips architecture planning | `gemskills:visual-planner` | Forces visual planning step |
| Model writes insecure code | `bopen-tools:code-audit-scripts` | Runs security audit |

**Resolving skill names:** Users often reference skills informally. Use `Skill(find-skills)` to resolve informal names to fully-qualified IDs. For example:
- "visual planner" → `gemskills:visual-planner`
- "TDD" → `superpowers:test-driven-development`
- "simplify" → `bopen-tools:simplify` (prefix with plugin name if ambiguous)

## Mode Inference

The hook infers whether to auto-fix or ask the user based on the rule text:

- **Fix mode**: Rule contains "fix all", "always fix", "fix any", "fix every" → block message says "Fix these issues NOW"
- **Ask mode**: Everything else → block message says "Ask the user whether to fix"

Write rule text accordingly to control the behavior.

## Debug Logging

Set the environment variable to enable score breakdowns:

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
```

Log entries show elapsed time, score breakdowns, and phase decisions:

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

## Reference

- `references/rule-design.md` — Deep guide on designing each scoring layer with annotated examples
- `examples/rules.json` — Complete example rules showing full v2 schema
