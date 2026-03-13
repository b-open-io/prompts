# Corpus-Driven Testing for Stop Hooks

This reference documents a general methodology for testing any scored detection engine against production data. The approach is not HammerTime-specific — it applies to any stop hook that uses keyword scoring, regex patterns, or threshold-based detection.

## Why Corpus Testing

Synthetic test cases miss how models actually phrase violations. When a rule designer writes test cases from memory, they produce the phrasings they imagined the model would use. The model uses different ones.

The gap between imagined behavior and real behavior is the primary cause of low recall. A rule that performs well on hand-written examples may score F1=0.14 on production data. The only way to close this gap is to test against real assistant messages from real sessions.

Secondary benefit: production data surfaces true negatives. It's easy to predict that "I found and fixed this bug" should not trigger. It's harder to predict that "The remaining unstaged changes are your pre-existing work from before this session" should also not trigger — but only production logs can confirm how often the model uses that framing innocuously.

## The Five-Step Process

### 1. Mine Production Logs

Pull assistant messages from real session history using the `remind` skill's search function. Run multiple search passes with different terms — one pass per major keyword cluster in your rule.

Collect raw assistant turn text. Do not pre-filter aggressively; borderline cases are valuable for the corpus. Aim for at least 20–30 candidate messages per search term.

### 2. Build the Test Corpus

Structure each corpus entry as a four-tuple:

```python
(message, should_trigger, category, source_note)
```

- `message` — full assistant turn text, unmodified
- `should_trigger` — `True` for violations, `False` for acceptable behavior
- `category` — short label grouping similar entries (`"dismissal"`, `"fixing"`, `"documentation"`)
- `source_note` — provenance: project, session context, what the model was doing

Target composition for a well-balanced corpus:

| Component | Count | Purpose |
|-----------|-------|---------|
| Real true positives | 10–15 | Ground truth for recall |
| Real true negatives | 8–12 | Ground truth for precision |
| Synthetic positives | 3–5 | Cover cases not yet seen in logs |
| Edge cases | 3–5 | Tricky borderline decisions |

### 3. Run the Test Scorer

For HammerTime rules, the scorer is at `skills/hammertime/evals/test_scorer.py`:

```bash
python3 skills/hammertime/evals/test_scorer.py
python3 skills/hammertime/evals/test_scorer.py -v
python3 skills/hammertime/evals/test_scorer.py --threshold 3
```

For other hooks, `test_scorer.py` serves as a template. The core structure is:
1. Import `score_message()` from the hook
2. Iterate corpus entries, calling `score_message()` on each
3. Compare `score >= threshold` against `should_trigger`
4. Accumulate TP, TN, FP, FN and compute precision, recall, F1

### 4. Threshold Sweep

Run the scorer across all thresholds 1–10 and record the metrics table. Identify where F1 peaks. When F1 is flat across a range, prefer the higher threshold — fewer interruptions to the user.

Example sweep table format:

```
Thr |  TP  FP  FN  TN | Prec   Rec    F1  |   Acc
----+-----------------+-------------------+------
  3 |  13   3   0  11 | 0.81  1.00  0.90  |  89%
  5 |  13   3   0  11 | 0.80  1.00  0.89  |  89%  <-- current
  6 |  12   2   1  12 | 0.86  0.92  0.89  |  89%
  7 |  10   0   3  14 | 1.00  0.77  0.87  |  89%
```

The optimal threshold is where F1 is highest without sacrificing recall below an acceptable floor. For behavioral guardrail hooks, recall matters more than precision — a missed violation is usually worse than a false block.

### 5. Iterative Tuning

Read every failure:

- **False negatives** — rule missed a real violation. Extract the exact phrasing from the source log. Identify the keyword or pattern that would have caught it. Add it. Re-run.
- **False positives** — rule flagged acceptable behavior. Identify which signal was the cause (keyword, pattern, or co-occurrence). Tighten it. Re-run.

Iterate until F1 stabilizes. Document remaining failures with rationale for accepting them.

## Applying This to New Hooks

Any scored detection hook can use this pattern:

1. Write the hook with a `score_message(text, rules)` function that returns a numeric score
2. Copy `test_scorer.py` and adapt it to import your hook's scorer
3. Mine logs, build corpus, run scorer, sweep, tune
4. Commit the corpus alongside the hook — it is the test suite

The corpus is not just a one-time artifact. It accumulates over time as new violation patterns are discovered. Add entries whenever a false negative or false positive is caught in production. Re-run the scorer after any rule change.

## Tools

| Tool | Purpose |
|------|---------|
| `remind` skill | Search production conversation logs by keyword |
| `skills/hammertime/evals/test_scorer.py` | Reference scorer harness — copy and adapt |
| `HAMMERTIME_DEBUG` env var | Enable live diagnostic logging during real sessions |
| `--threshold N` flag | Test scorer at a specific threshold without editing the rule |

Enable live diagnostics:

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
# Use Claude Code normally, check the log after sessions
cat ~/.claude/hammertime/debug.log
```

The debug log shows per-rule scores, signal breakdowns (`kw=N intent=N cluster=N`), and whether Phase 2 (Haiku) ran.

## Metrics Reference

| Metric | Formula | What it measures |
|--------|---------|-----------------|
| Precision | TP / (TP + FP) | How often a trigger is a real violation |
| Recall | TP / (TP + FN) | How often real violations are caught |
| F1 | 2·P·R / (P+R) | Harmonic mean — primary optimization target |

Track these alongside corpus metadata in the rule's test file header:

```python
# Corpus: 27 entries (13 TP, 14 TN)
# Last updated: 2026-03-13
# Optimal threshold: 5  F1=0.89  Recall=1.00  Precision=0.80
# Remaining FPs: 3 (all meta-discussion — accepted, see rule-design.md)
```

## Why This File Exists

The `hook-development` skill from the `plugin-dev` plugin covers hook schema, event types, and JSON structure. It does not cover detection engine evaluation — there is no corpus-based testing methodology in that skill.

This file is the bopen-tools extension of that methodology. It documents the empirical process that produces hooks with measured performance rather than untested keyword lists. When creating a new behavioral hook, treat this process as mandatory for any rule that needs reliable production recall.
