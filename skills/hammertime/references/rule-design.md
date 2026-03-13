# Rule Design Guide

This reference covers how to design effective HammerTime rules across all three scoring layers. It includes the builtin `project-owner` rule as an annotated case study, common regex patterns, and threshold tuning guidance.

## Anatomy of a Well-Designed Rule

A strong rule has:
1. **Clear rule text** — specific, actionable, describes the violation
2. **Targeted keywords** — terms the model uses *when violating*, not terms describing the rule
3. **Structural intent patterns** — regex that catches paraphrases keywords miss
4. **Co-occurrence pairs** — dismissal + qualifier for same-sentence detection
5. **Appropriate threshold** — balances false positives vs missed violations

## Layer 1: Keywords

Keywords are case-insensitive substring matches against the full response text. They're the broadest, cheapest signal.

### Choosing Good Keywords

**Target violation language, not rule description language.**

If the rule is "always run tests before committing":
- Bad keywords: `["test", "commit", "run"]` — too common, will match innocent responses
- Good keywords: `["skipping tests", "without testing", "skip the tests", "no tests needed", "tests aren't necessary", "don't need tests"]`

**Think about what the model says when it violates the rule**, not what the rule is about.

### Keyword Count

| Count | Risk | Best for |
|-------|------|----------|
| 2-3 | Many false negatives | Simple, clear-cut rules |
| 4-8 | Balanced | Most rules (recommended) |
| 9+ | False positives | Avoid unless patterns are very specific |

### Multi-Word Keywords

Multi-word keywords reduce false positives dramatically. `"pre-existing"` is better than `"pre"` + `"existing"` separately.

Prefer phrases: `"I'll leave these"` over `"leave"`. The substring match checks if the keyword appears anywhere in the text, so `"I'll leave these"` only matches that exact sequence.

### Keyword Variants

Include common variants:
- Hyphenation: `"pre-existing"`, `"preexisting"`, `"pre existing"`
- Tense: `"existed before"`, `"exists before"`
- Negation forms: `"not caused by"`, `"wasn't caused by"`

## Layer 2: Intent Patterns

Intent patterns are Python regex strings compiled with `re.IGNORECASE`. They match against the full response text and score +2 each — twice the weight of keywords.

### Why Patterns Matter More Than Keywords

Keywords catch exact phrases. Patterns catch *structural paraphrases*:

| Keyword misses | Pattern catches |
|---------------|----------------|
| "not our problem" | `not\s+(?:our|my|this)\s+(?:problem\|issue\|concern)` |
| "this was here already" | `(?:was\|were\|been)\s+(?:here\|there\|present)\s+(?:already\|before)` |
| "you should handle this separately" | `(?:you\|user)\s+(?:should\|could\|might)\s+(?:handle\|address\|fix)\s+.*?(?:separate\|later\|yourself)` |

### Regex Building Blocks

**Flexible whitespace:** Always use `\s+` between words, never literal spaces. Responses may have newlines, tabs, or multiple spaces.

```
Good: r"not\s+(?:our|my)\s+problem"
Bad:  r"not our problem"
```

**Alternation groups:** Use `(?:...|...)` for word variants. Non-capturing groups are cleaner.

```python
r"(?:skip|ignore|dismiss|defer|leave)\s+(?:this|these|them|it)"
```

**Flexible gaps:** Use `.*?` (non-greedy) for variable-length gaps between structural elements.

```python
# Catches "these errors appear to have been there for a while"
r"(?:errors?|issues?|warnings?)\s+(?:appear|seem).*?(?:been|existed)\s+.*?(?:while|before|previously)"
```

**Word boundaries:** Use `\b` to prevent partial word matches.

```python
r"\b(?:skip|ignore)\b"  # Won't match "skipping" or "ignored"
r"(?:skip|ignore)"       # Will match "skipping" and "ignored"
```

Choose based on whether you want inflected forms.

**Optional words:** Use `(?:\s+\w+)?` for optional modifiers.

```python
# Matches "not going to fix" and "not fix"
r"not\s+(?:going\s+to\s+)?fix"
```

### Common Pattern Templates

**Refusal to act:**
```python
r"(?:won't|will\s+not|cannot|can't|not\s+going\s+to)\s+(?:fix|address|resolve|handle|change)"
```

**Deflection to user:**
```python
r"(?:you|user)\s+(?:can|could|should|may\s+want\s+to)\s+(?:fix|address|handle|resolve)"
```

**Minimizing severity:**
```python
r"(?:just|only|merely|simply)\s+(?:a\s+)?(?:minor|small|cosmetic|style|trivial)"
```

**Attribution to external cause:**
```python
r"(?:caused|introduced|created)\s+(?:by|from)\s+(?:a\s+)?(?:different|another|separate|external|upstream)"
```

**Temporal distancing:**
```python
r"(?:already|previously|originally)\s+(?:there|present|existing|existed)\s+(?:before|prior|when)"
```

**Scope limitation:**
```python
r"(?:outside|beyond|not\s+within|exceeds)\s+(?:the\s+)?(?:scope|bounds|purview)"
```

### Pattern Count

2-4 patterns per rule is the sweet spot. Each pattern should catch a distinct structural paraphrase. More patterns increase both true positives and maintenance burden.

## Layer 3: Sentence Co-occurrence

The highest-confidence signal. A dismissal verb and a qualifier appearing in the same sentence is almost always a violation. Scores +3.

### How It Works

The hook splits the response into sentences (on `.!?\n`), then checks each sentence for both:
1. A match from `dismissal_verbs` regex
2. A match from `qualifiers` regex

If both match in any single sentence → +3 to the score.

### Designing Dismissal Verbs

These are verbs/phrases that signal the model is refusing to act:

```json
"dismissal_verbs": "\\b(?:dismiss|skip|ignore|leave|defer|punt|won't\\s+fix|not\\s+(?:going\\s+to\\s+)?(?:fix|address|resolve)|no\\s+need\\s+to\\s+(?:fix|address))\\b"
```

**Key principle:** These should be verbs of avoidance, not just any verb.

Good: `skip`, `ignore`, `defer`, `won't fix`
Bad: `is`, `has`, `shows`, `appears` (too generic)

### Designing Qualifiers

These are terms that signal attribution or deflection — the *reason* for dismissal:

```json
"qualifiers": "\\b(?:pre-?existing|scope|before\\s+(?:our|my|this)|unrelated|legacy|already\\s+(?:there|present))\\b"
```

**Key principle:** These are the justification words, not the action words.

Good: `pre-existing`, `out of scope`, `unrelated`, `legacy`
Bad: `error`, `issue`, `problem` (describes what, not why)

### When to Use Layer 3

Layer 3 is optional. Use it when:
- The violation involves a specific *pattern* of language (dismissal + justification)
- You need high-confidence detection without Haiku
- Keywords alone would be too noisy

Skip it when:
- The violation is about *absence* of behavior (didn't run tests) rather than *presence* of dismissal
- The rule is simple enough that keywords + patterns suffice

## Case Study: The `project-owner` Rule

This is the builtin rule that ships with HammerTime. Let's annotate each design decision.

### Rule Text

```
"Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing."
```

Why it works:
- Starts with the desired action ("Fix all errors")
- Describes the specific violation ("dismissing as pre-existing")
- Explains the reasoning ("no session history") — this helps Haiku make better decisions

### Keywords (14)

```json
["pre-existing", "preexisting", "pre existing", "predate", "predates",
 "unrelated to our", "existed before", "not introduced by",
 "outside the scope", "nothing to do with our", "not caused by",
 "were already there", "were already present", "already there before",
 "these errors appear to"]
```

Design notes:
- Three variants of "pre-existing" (hyphenated, joined, spaced)
- Multi-word phrases to reduce false positives (`"outside the scope"` not `"scope"`)
- Each keyword is something the model would actually say when dismissing errors

### Intent Patterns (8)

```python
r"not\s+(?:caused|introduced|created|related|due).*?(?:by|to)\s+(?:us|our|this|these|my)"
r"(?:appear|seem|look)s?\s+to\s+(?:predate|pre-?date|have\s+existed)"
r"(?:already|previously)\s+(?:there|present|existing|existed)\s+(?:before|prior|when)"
r"(?:outside|beyond|not\s+within)\s+(?:the\s+)?scope"
r"(?:did(?:n.t| not)|don.t|do not)\s+(?:believe\s+)?(?:I\s+)?(?:introduc|caus)"
r"(?:won't|will not|cannot|can't|not going to)\s+(?:fix|address|resolve|handle)"
r"(?:present|existing|there)\s+in\s+the\s+(?:codebase|project|repo).*?before"
r"(?:separate|different|another)\s+(?:issue|task|ticket|PR|pull request)"
```

Design notes:
- Pattern 1: Attribution denial ("not caused by us")
- Pattern 2: Temporal distancing ("appears to predate")
- Pattern 3: Prior existence claims ("already there before")
- Pattern 4: Scope limitation ("outside the scope")
- Pattern 5: Causation denial ("didn't introduce")
- Pattern 6: Refusal to act ("won't fix")
- Pattern 7: Codebase attribution ("present in the codebase before")
- Pattern 8: Task deflection ("separate issue")

Each pattern catches a *distinct structural paraphrase* of the violation.

### Co-occurrence

**Dismissal verbs:**
```
\b(?:dismiss|skip|ignore|leave|defer|punt|won't\s+fix|not\s+(?:going\s+to\s+)?(?:fix|address|resolve)|no\s+need\s+to\s+(?:fix|address))\b
```

**Qualifiers:**
```
\b(?:pre-?existing|scope|before\s+(?:our|my|this)|unrelated|legacy|already\s+(?:there|present))\b
```

When "skip" and "pre-existing" appear in the same sentence, it's almost certainly a violation. This is why Layer 3 scores +3.

### Full-Turn Evaluation

The project-owner rule sets `"evaluate_full_turn": true` because dismissal typically happens mid-turn. The model encounters an error during tool use, says "this appears to predate our changes" in message 3, then the final message just summarizes what was done. Scoring only the final message would miss the violation entirely.

## Threshold Tuning

| Threshold | Behavior | Use when |
|-----------|----------|----------|
| 3 | Strict — blocks on 1 keyword + 1 intent | Rule violations are costly, false positives are tolerable |
| 5 | Balanced (default) — needs multiple signals | Most rules |
| 7 | Relaxed — needs strong evidence | False positives are costly, some violations are acceptable |

### How to Choose

Start at 5. Enable debug logging. Run for a day. Check the log:
- If you see false blocks (score 5+ but no real violation) → raise threshold
- If you see missed violations (score 3-4, Haiku says no) → lower threshold or improve patterns

### Score Arithmetic Examples

Understanding how scores accumulate helps you set the right threshold:

| Signal combination | Score | At threshold 5 |
|-------------------|-------|-----------------|
| 2 keywords | 2 | Haiku decides |
| 1 keyword + 1 intent pattern | 3 | Haiku decides |
| 2 keywords + 1 intent pattern | 4 | Haiku decides |
| 3 keywords + 1 intent pattern | 5 | Direct block |
| 1 keyword + co-occurrence | 4 | Haiku decides |
| 2 keywords + co-occurrence | 5 | Direct block |
| 1 intent pattern + co-occurrence | 5 | Direct block |
| 5 keywords | 5 | Direct block |

The math: `score = (keyword_hits × 1) + (intent_hits × 2) + (co_occurrence × 3)`

### When Haiku Phase 2 Helps

Haiku verification runs on scores 1-4 (below threshold). It's good at:
- Distinguishing factual mentions from actual dismissal
- Catching edge cases your patterns miss
- Providing a safety net for ambiguous signals

It costs ~$0.001 per check and adds ~500ms. For most rules, letting Haiku handle the gray zone is the right tradeoff.

### Phase 2 Prompt Design

The Haiku prompt is hardcoded in the hook. It asks Haiku specifically whether the model *refused to act* or *dismissed* issues — not whether keywords appeared. This means Haiku correctly passes responses that mention trigger words in a factual context (e.g., "I found a pre-existing bug and fixed it" is not a violation).

## Common Mistakes

### 1. Keywords that are too generic

```json
// Bad — "error" appears in almost every coding response
"keywords": ["error", "issue", "problem"]

// Good — specific violation phrases
"keywords": ["not my error", "existing error", "errors were already"]
```

### 2. Patterns that are too broad

```python
# Bad — matches any negation followed by any verb
r"not\s+\w+"

# Good — matches specific refusal patterns
r"not\s+(?:going\s+to\s+)?(?:fix|address|resolve)\b"
```

### 3. Missing alternation variants

```python
# Bad — misses "won't", "cannot"
r"will\s+not\s+fix"

# Good — catches all forms
r"(?:won't|will\s+not|cannot|can't|not\s+going\s+to)\s+(?:fix|address)"
```

### 4. Forgetting `re.IGNORECASE`

You don't need to worry about this — the hook compiles all patterns with `re.IGNORECASE`. But do avoid `[A-Z]` character classes in your patterns; use `[a-z]` or `\w` instead.

### 5. Over-engineering Layer 3

Not every rule needs co-occurrence pairs. If the violation isn't a "dismissal + justification" pattern, skip Layer 3 and rely on keywords + intent patterns.

## Testing Your Rules

### Manual Testing Workflow

1. **Write example violating responses** — 3-5 realistic model outputs that break the rule
2. **Check keyword coverage** — does at least one keyword match each example?
3. **Check pattern coverage** — do intent patterns catch paraphrases keywords miss?
4. **Check co-occurrence** — do dismissal verbs + qualifiers appear in the same sentence in your examples?
5. **Enable debug logging** — run with `HAMMERTIME_DEBUG` set and verify scores

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
# Use Claude Code normally, check the log
cat ~/.claude/hammertime/debug.log
```

### Reading Debug Output

A typical debug session looks like this:

```
[   0ms] --- HammerTime run ---
[   0ms] INPUT keys: ['last_assistant_message', 'stop_hook_active']
[   0ms] MESSAGE length: 2847 chars
[   1ms] SCORED: 1 rules with score > 0
[   1ms] SCORE: rule 'project-owner' score=7 (kw=3, intent=1, cluster=1)
[   1ms] BLOCK: score 7 >= 5, skipping Phase 2
```

Breakdown:
- `kw=3` — Three keywords matched (3 × 1 = 3 points)
- `intent=1` — One intent pattern matched (1 × 2 = 2 points)
- `cluster=1` — Co-occurrence found (1 × 3 = 3 points)
- Total: 3 + 2 + 3 = 8, but the log says 7 because... wait, it says 7? Check your regex. The debug log is your best friend for catching scoring bugs.

When Phase 2 fires:

```
[   1ms] SCORE: rule 'fix-lint-errors' score=3 (kw=1, intent=1, cluster=0)
[   1ms] PHASE2: score 3 < 5, verifying with Haiku
[ 523ms] PHASE2: rule 'fix-lint-errors' violated=true
```

This shows a low-confidence match (score 3) where Haiku confirmed the violation. The 523ms delay is the Haiku API call.

### False Positive Investigation

If a rule triggers incorrectly:

1. Check the debug log to see which keywords/patterns matched
2. Determine which signal was the false positive:
   - **Keyword false positive** → make the keyword more specific (add context words)
   - **Pattern false positive** → add negative lookahead or tighten alternations
   - **Co-occurrence false positive** → rare, but check if your qualifier terms are too broad
3. Adjust and test again

### Rule Interaction

Multiple rules can score on the same response. The hook evaluates all rules and blocks on the first confirmed violation. If you have overlapping rules (e.g., both checking for dismissal), the more specific rule should have a lower threshold so it fires first with a more targeted block message.

## Complete Rule Walkthrough: "No Trailing Summaries"

Let's design a rule from scratch for "stop summarizing what you did at the end of every response."

### Step 1: Identify violation patterns

What does the model say when it violates this? Trailing summaries typically look like:

- "In summary, I've made the following changes: ..."
- "To recap what was done: ..."
- "Here's a summary of the changes: ..."
- "The key changes made were: ..."

### Step 2: Extract keywords

```json
"keywords": [
  "in summary",
  "to summarize",
  "to recap",
  "here's a summary",
  "summary of changes",
  "key changes made"
]
```

### Step 3: Write intent patterns

```python
# Catches transition-to-summary phrases
r"(?:in\s+summary|to\s+(?:summarize|recap)|here(?:'s|\s+is)\s+(?:a\s+)?(?:summary|recap|overview))"

# Catches list-of-changes patterns
r"(?:changes?\s+(?:I\s+)?(?:made|implemented|applied)|(?:I\s+)?(?:made|applied)\s+the\s+following)"
```

### Step 4: Skip Layer 3

This rule isn't about "dismissal + justification" — it's about unwanted summarization. Layer 3 doesn't apply. Keywords + patterns are sufficient.

### Step 5: Set threshold

These patterns are fairly specific and unlikely to false-positive. Threshold 5 is fine.

### Final rule

```json
{
  "name": "no-trailing-summaries",
  "rule": "Do not add summaries, recaps, or 'here's what I did' sections at the end of responses. The user can read the diff.",
  "enabled": true,
  "keywords": [
    "in summary",
    "to summarize",
    "to recap",
    "here's a summary",
    "summary of changes",
    "key changes made"
  ],
  "intent_patterns": [
    "(?:in\\s+summary|to\\s+(?:summarize|recap)|here(?:'s|\\s+is)\\s+(?:a\\s+)?(?:summary|recap|overview))",
    "(?:changes?\\s+(?:I\\s+)?(?:made|implemented|applied)|(?:I\\s+)?(?:made|applied)\\s+the\\s+following)"
  ],
  "confidence_threshold": 5,
  "skill": null
}
```

Clean, focused, no unnecessary layers. This is a minimal viable rule that works.
