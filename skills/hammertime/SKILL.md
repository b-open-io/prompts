---
name: hammertime
version: 1.0.2
description: >-
  This skill should be used when the user mentions a behavioral rule they want
  enforced, says "always do X", "never do Y", "stop doing Z", "from now on",
  asks about HammerTime rules, wants to create a stop hook rule, mentions
  behavioral guardrails, or wants to understand how the HammerTime stop hook
  system works. Teaches how to write rules for the HammerTime stop hook system.
---

# HammerTime — Behavioral Rule System

Rules live under the shared HammerTime home. Resolution order is
`BOPEN_HAMMERTIME_HOME`, an existing legacy `~/.claude/hammertime`, then
`~/.bopen-tools/hammertime`. The hook and bundled scripts use the same resolver.
The hook registers as a Stop hook and fires on every assistant turn.

Two rule types:
- **Content rules** — scored detection against response text (three-layer scoring + optional Haiku verification)
- **Timer rules** — time-based blocking until a deadline passes (no scoring, no Haiku)

## When to Create a Rule

Recognize rule intent even when the user doesn't say "hammertime":

**Imperative patterns:**
- "Always fix lint errors before stopping"
- "Never say 'everything looks good' when there are warnings"
- "Stop summarizing what you did at the end"
- "Don't dismiss issues as pre-existing"

**Implicit patterns (user describes frustration or expectation):**
- "You keep forgetting to run the linter" → rule to always run linter
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

Timer rule schema: `name`, `rule` (block-message text), `enabled`, `deadline` (ISO 8601 datetime), `keywords: []`, `max_iterations`. See `examples/rules.json` for a complete timer rule.

Key behaviors: timer rules bypass the `stop_hook_active` guard (safe because the deadline guarantees termination) and are evaluated *before* content rules, so a timer block prevents content rule evaluation. `max_iterations: 0` means unlimited blocks until deadline. Once the deadline passes, the rule is **auto-deleted** from `rules.json`.

## Content Rule Schema

Content rules are JSON objects in an array with these fields:

**Required:** `name` (unique kebab-case ID), `rule` (natural language text — used in the block message and Haiku verification), `enabled` (boolean), `keywords` (4-8 trigger strings for Layer 1).

**Optional:**
- `intent_patterns` — regex strings for Layer 2 structural matching (compiled at load time)
- `dismissal_verbs` / `qualifiers` — single regex strings for Layer 3 same-sentence co-occurrence
- `confidence_threshold` — score at which to block without Haiku (default: 5)
- `skill` — fully-qualified skill ID to invoke when the rule fires (e.g., `gemskills:visual-planner`)
- `evaluate_full_turn` — `true` scores every assistant message since the user's last message; `false`/omitted scores only the final message (default: `false`)
- `max_iterations` — max blocks per session before auto-allowing exit (default: 3, `0` for unlimited)
- `check_git_state` — `true` makes the hook check `git status`/unpushed commits first and skip the rule entirely if the tree is clean and pushed (default: `false`)
- `cwd_prefix` — string or array of strings limiting the rule to project directories that start with an expanded prefix; omit for a global rule

**Timer-specific:** `deadline` — an ISO 8601 datetime string. Its presence turns a rule into a timer rule, bypassing content scoring entirely.

See `examples/rules.json` for worked rules covering every field, and `references/rule-design.md` for `check_git_state`/`evaluate_full_turn`/`max_iterations` internals.

## Three-Layer Scoring

| Layer | What it matches | Score | Purpose |
|-------|----------------|-------|---------|
| **1 — Keywords** | Case-insensitive substring match | +1 each | Broad signal detection |
| **2 — Intent Patterns** | Regex patterns on full text | +2 each | Structural paraphrase catching |
| **3 — Co-occurrence** | Dismissal verb + qualifier in same sentence | +3 | Highest-confidence signal |

Score thresholds: **0** exits immediately, **1–4** goes to Haiku verification (~500ms, ~$0.001), **5+** blocks directly. `confidence_threshold` controls the direct-block cutoff (default: 5). For scoring math, threshold-tuning guidance, and the full `project-owner` case study, see `references/rule-design.md`.

Before scoring, the hook removes complete single-quoted, double-quoted, and
backtick-delimited spans. This keeps quoted examples, documentation phrases,
and search terms from being mistaken for the assistant's own behavior while
preserving contractions such as `don't`.

## Creating a Rule — Workflow

### Step 1: Derive the name

Short kebab-case name: `fix-lint-errors`, `no-trailing-summaries`, `use-visual-planner`.

### Step 2: Write the rule text

The `rule` field is natural language describing expected behavior. **This text IS the error message the agent sees when the rule fires** — its only context for what went wrong. It's also sent to Haiku for verification. Write it as if explaining the problem to an agent that has never heard of this rule before.

Include what to do (action-first), what not to do (the specific violation), and why (helps the agent and Haiku judge edge cases).

Good: "Fix all lint errors before stopping. Do not report them without fixing. The user expects all errors to be resolved, not catalogued."
Bad: "Be better at linting." / "Don't do that." — agent has no idea what "that" is (`references/rule-design.md` has a third failure mode: being too terse).

**Minimum 15 words** — shorter text won't give the agent enough context to act.

If the description names a specific repository or path, set `cwd_prefix` to
that path. Use an array when the same rule applies to multiple repository
prefixes. Preserve `~` when convenient; the hook expands it before matching.
Omit `cwd_prefix` when the description is not project-specific so the rule
remains global. At evaluation time, the project directory is exactly
`CLAUDE_PROJECT_DIR` when that environment variable is set, otherwise
`os.getcwd()`; matching uses string-prefix semantics.

### Step 3: Extract keywords (4-8)

Pick words/phrases the model uses *when breaking the rule*, not terms describing the rule itself. Multi-word keywords are preferred — they match as substrings, so `"lint error"` matches "there are 3 lint errors remaining" while staying precise.

For "fix lint errors": `["lint warning", "lint error", "linting issue", "eslint", "biome", "I'll leave", "you can fix", "not critical"]`. See `examples/rules.json` for more keyword sets and `references/rule-design.md` for count guidance and common mistakes.

### Step 4: Write intent patterns (2-4 regex)

Regex patterns matched against the full response text with `re.IGNORECASE`, catching structural dismissal even when exact keywords aren't used:

```python
# Catches: "these lint issues aren't critical", "the warnings don't need fixing"
r"(?:lint|warning|error)s?\s+(?:aren't|are\s+not|don't|do\s+not)\s+(?:critical|important|blocking)"
```

Use `\s+` for flexible whitespace, `(?:...|...)` for alternatives, `.*?` for gaps. `references/rule-design.md` has the full building-block reference and a library of common templates.

### Step 5: Add co-occurrence terms (optional)

For Layer 3, define `dismissal_verbs` and `qualifiers` as regex strings. These fire only when both appear in the same sentence — the highest-confidence signal:

```json
"dismissal_verbs": "\\b(?:skip|ignore|leave|defer|won't\\s+fix)\\b",
"qualifiers": "\\b(?:non-?critical|cosmetic|minor|style|optional)\\b"
```

### Step 6: Set confidence threshold

Default is 5 (conservative). Raise to 7 where false positives are costly; lower to 3 where catching violations matters more.

### Step 7: Resolve skill names (if applicable)

If the rule should invoke a skill when it fires, resolve the informal name with `Skill(find-skills)` (e.g., "visual planner" → `gemskills:visual-planner`) — or prefix a known plugin name directly (`references/rule-design.md`). Set `skill` to the resolved ID, or `null`.

### Step 8: Validate the error message

Before writing the rule, preview what the agent will see. The block message follows this format:

```
[HammerTime] Rule '{name}' triggered.
RULE: {rule text}
TRIGGERED BY: {matched keywords and intent phrases}
ACTION: Fix these issues NOW / Ask the user whether to fix...
```

Would an agent seeing this message for the first time understand what's expected, what it did wrong, and what to do next? If not, rewrite the `rule` text — it's the agent's only lifeline when the hook blocks it.

### Step 9: Write the rules file

Resolve the active home with the bundled helper, then read its `rules.json` (or start with `[]` if it does not exist). Append the new rule and write atomically.

```bash
HAMMERTIME_HOME=$(python3 "${SKILL_DIR}/scripts/hammertime_paths.py")
mkdir -p "$HAMMERTIME_HOME"
```

### Step 10: Check if HammerTime is paused

```bash
test -f "$HAMMERTIME_HOME/disabled" && echo "PAUSED"
```

If paused, warn: **"Note: HammerTime is currently paused. This rule has been saved but won't fire until you run `/hammertime:start`."**

### Step 11: Remind about restart

Rules are loaded at hook registration time. Tell the user: **"Start a new Claude Code or Codex session for the new rule to take effect."**

## Skill Invocation, Mode Inference, and Full-Turn Evaluation

The `skill` field (Step 7) triggers automatic skill invocation when a rule fires — the block message appends `Invoke Skill(<id>) to address this.` The hook also infers fix-vs-ask mode from the rule text: "fix all"/"always fix"/"fix any"/"fix every" produces "Fix these issues NOW"; anything else produces "Ask the user whether to fix." And `evaluate_full_turn: true` (from the schema above) scores every assistant message since the user's last message rather than just the final one — needed for violations that happen mid-turn (dismissed in message 3, summarized as "Done." in message 5). See `references/rule-design.md` for the skill-invocation table and guidance on when full-turn evaluation is worth the extra scoring cost.

## Debug Logging

```bash
export HAMMERTIME_DEBUG="$(python3 "${SKILL_DIR}/scripts/hammertime_paths.py")/debug.log"
```

Enables per-rule score breakdowns and Haiku verdicts in the log. See `references/rule-design.md` for reading debug output and diagnosing false positives.

## Key Principles

1. **Intent patterns > more keywords.** Patterns match structure; keywords match vocabulary. Two good patterns catch more than ten mediocre keywords.
2. **Co-occurrence is highest signal.** Dismissal verb + qualifier in one sentence is almost always a violation — use Layer 3 for your most confident detection.
3. **Don't over-keyword.** 10+ keywords means the rule is too broad — split it or lean on patterns instead.
4. **Default threshold of 5 is conservative.** Only adjust after seeing specific problems in the debug log.
5. **Test with real examples**, not hypothetical ones — see Corpus-Driven Rule Creation below.
6. **Rules stack.** Multiple rules can match one response; the first confirmed violation blocks.
7. **Minimal viable rule.** Not every rule needs all three layers — good keywords plus 2 intent patterns is often enough.
8. **Rule text matters for Haiku.** Scores 1-4 route to Haiku, which reads the `rule` text to decide — include the "why," not just the "what."

## Built-in Rules

The hook ships with one hardcoded rule:

- **project-owner** — "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing."

This rule can be overridden by adding a user rule with `"name": "project-owner"` to the JSON file.

## Corpus-Driven Rule Creation

Always prefer keywords and patterns derived from real session logs over synthetic guesses. Real dismissal language (`"this appears to be pre-existing"`) rarely matches what a human would guess (`"pre-existing issue"`).

1. Extract 2-3 key terms from the user's behavior description.
2. Search the full corpus: `python3 "${CLAUDE_PLUGIN_ROOT}/skills/remind/scripts/search.py" "TERMS" --limit 10 --no-recency`
3. Classify returned assistant messages as **true positive** (demonstrates the bad behavior — extract the exact phrases) or **true negative** (similar vocabulary but not a violation — prevents keyword overfitting).
4. Derive keywords/intent_patterns from the true positives; use true negatives to rule out overly broad matches.
5. Present the extracted test cases to the user as a table: message excerpt, should_trigger, category, source note.

If the remind script is absent, the Scribe DB is unavailable, or the search returns zero results, fall back to generating keywords and patterns from the description alone — note the fallback so the user knows the rule is synthetic and may need tuning.

For the full methodology — corpus composition targets, the test-scorer harness, threshold sweeps, iterative tuning, and the `project-owner` F1 0.14→0.89 case study — see `references/corpus-testing-methodology.md` and `references/rule-design.md`.

## Additional Resources

### Reference Files

- **`references/rule-design.md`** — Deep guide to each scoring layer: pattern building blocks and templates, co-occurrence design, skill invocation and mode inference, the annotated `project-owner` case study, threshold tuning, score arithmetic, a full rule-from-scratch walkthrough, reading debug output, common mistakes, and the production corpus-testing process (F1 0.14→0.89 case study). Read before writing intent patterns or co-occurrence pairs, or when tuning a threshold.
- **`references/corpus-testing-methodology.md`** — General corpus-driven testing methodology for any scored detection hook: mine logs, build corpus, run scorer, sweep thresholds, iterate. Read before mining production logs or building a test corpus.

### Example Files

- **`examples/rules.json`** — Three complete content rules (`project-owner`, `fix-lint-errors`, `use-tdd-for-testing`) plus a timer rule, showing every schema field in context. Read instead of reasoning about the schema from scratch.
