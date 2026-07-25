---
name: benchmark-skills
version: 2.0.1
description: >-
  Run skill benchmarks and write evals that score a skill against a no-skill baseline. Use for
  "benchmark this skill", "run the skill evals", "write an eval for this skill", or "did this
  skill actually help?".
---

# Benchmark Skills

Write evals for skills and run the benchmark harness to measure whether a skill actually helps compared to baseline (no skill).

## The Core Principle

**Only two types of skills produce measurable benchmark delta:**

1. **Behavioral suppression** — The skill suppresses patterns the model naturally produces. The baseline consistently exhibits the bad behavior; the skill stops it. This is the highest-signal category.
2. **Genuinely novel knowledge** — The skill injects domain knowledge NOT in the model's training data. If a knowledgeable human would need to look it up, the model probably doesn't know it either.

**What does NOT produce delta (don't waste time benchmarking these):**
- Knowledge the model already has (common frameworks, well-known patterns)
- General quality improvement without a specific behavioral target
- Skills requiring real system access (filesystem, APIs, browsers)
- Skills requiring multi-turn interaction

## Pre-Flight Checklist

Before writing evals for a skill, verify ALL of these:

- [ ] The skill changes default model behavior OR injects genuinely novel knowledge
- [ ] The skill works in single-prompt-in/single-response-out mode (no interactivity)
- [ ] The skill doesn't require real system access to demonstrate value
- [ ] The skill is ours (not copied from another publisher)
- [ ] You can design at least 2 trap prompts that reliably elicit baseline failure
- [ ] Assertions are concrete and binary (not vague quality judgments)

If any box fails, the skill is not a good benchmark candidate.

## Eval File Format

Every skill that wants benchmarking needs an `evals/evals.json` file:

```
skills/
  my-skill/
    SKILL.md
    evals/
      evals.json
```

### evals.json Structure

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "The exact prompt to send to the model",
      "expected_output": "Description of what a good response looks like",
      "files": [],
      "assertions": [
        {
          "id": "unique-assertion-id",
          "text": "Specific, verifiable claim about the output",
          "type": "qualitative"
        }
      ]
    }
  ]
}
```

## Trap Input Design

**Every eval prompt must be a trap** — a prompt that reliably elicits the bad behavior the skill suppresses. If the baseline model passes your assertions without the skill, your test case is useless.

### How to design traps

1. Identify what the skill changes (what patterns it suppresses or what knowledge it injects)
2. Write a prompt that naturally invites those patterns
3. Verify the baseline model actually falls into the trap (run without the skill first)
4. If the baseline passes, redesign the prompt or drop the test case

### Examples of good traps

| Skill | Trap prompt | What baseline does wrong |
|-------|------------|------------------------|
| humanize | "Write 4 company values with descriptions" | Produces tricolons, binary contrasts, punchline endings |
| humanize | "Explain the pros and cons of X" | Uses "not X — it's Y" pattern |
| geo-optimizer | "Generate an AgentFacts schema following NANDA" | Doesn't know NANDA protocol, hallucinates |
| geo-optimizer | "Audit this site for AI search visibility" | Doesn't know hedge density, 1MB threshold |

### Contrastive validation

A proper eval checks BOTH directions:
1. **Baseline DOES exhibit** the bad pattern (trap works)
2. **Skill output does NOT exhibit** the bad pattern (skill works)

If baseline passes an assertion, that assertion is not measuring delta.

## Writing Assertions

### Assertion types by reliability

| Type | Reliability | Cost | Best for |
|------|-------------|------|----------|
| `not-contains` / regex | Highest | Free | Banned phrases, specific patterns |
| Binary LLM judge | High | 1 API call | Presence/absence of behavior |
| G-Eval rubric (CoT) | Medium | 1 API call | Multi-dimensional quality |

**Default to negative assertions for suppression skills.** "Output does NOT contain tricolons" is more reliable than "output sounds natural."

### Good vs bad assertions

**Bad assertions (will show 0% delta):**
- "The response is helpful" — too vague, baseline passes
- "The response is correct" — not specific to skill
- "The response describes three phases" — model already knows this

**Good assertions (will show real delta):**
- "The output does NOT use binary contrast patterns such as 'not X — it's Y'" — specific, testable, baseline fails
- "The response includes the @context field pointing to nanda.dev namespace" — genuinely novel knowledge
- "Processes are categorized into safety levels rather than a flat list" — specific format the skill teaches

### Rules

1. **Be specific**: test for exact patterns, not vibes
2. **Be binary**: the judge must answer yes/no unambiguously
3. **Target what the skill uniquely provides**: if the baseline would pass anyway, the assertion is worthless
4. **3-5 assertions per eval**: enough to measure, not so many that noise accumulates
5. **Mix negative and positive**: "does NOT contain X" AND "DOES contain Y"

## Assertion Discovery (VibeCheck Method)

If you're unsure what assertions to write for a new skill:

1. Generate 10-20 paired outputs (with skill vs. without) on diverse prompts
2. Have a model compare the two sets and propose behavioral differences
3. Check which differences appear consistently
4. Those consistent patterns become your formal assertions

This prevents guessing at assertions that don't actually differentiate.

## Running the Benchmark

```bash
bun run scripts/benchmark.tsx                                    # All skills with evals
bun run scripts/benchmark.tsx --skill geo-optimizer              # Single skill
bun run scripts/benchmark.tsx --model "$BENCHMARK_MODEL_ID"       # Override model (default: haiku)
bun run scripts/benchmark.tsx --concurrency 4                    # Parallel workers
```

From within Claude Code, prefix with `CLAUDECODE=` to avoid nested session errors.

The harness runs each eval prompt twice: once with the skill injected via `--append-system-prompt`, once without. Both outputs are graded by LLM-as-judge.

## Reading Results

Results go to `benchmarks/latest.json` and per-skill `evals/benchmark.json`:

### Key Metrics

- **pass_rate**: Assertion pass rate with skill active
- **baseline_pass_rate**: Assertion pass rate without skill
- **Delta** (pass_rate - baseline_pass_rate): The signal

| Delta | Meaning | Action |
|-------|---------|--------|
| > +20% | Strong skill | Publish |
| +1% to +20% | Weak signal | Improve evals or skill |
| 0% | No effect | Skill is redundant OR evals test wrong thing |
| Negative | Skill hurts | Skill confuses model or evals are bad |

## Publishing Policy

- Only publish skills with **positive delta**
- Zero or negative = don't publish, refine skill or evals
- `latest.json` merges per-skill results when using `--skill` flag

## Judge Quality

The LLM-as-judge has known failure modes. When results seem wrong:

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Everything passes | Assertions too vague | Make assertions more specific and binary |
| Inconsistent across runs | Judge non-deterministic | Need temperature=0, CoT before verdict |
| Skill and baseline score the same | Testing knowledge model already has | Redesign as behavioral suppression test |
| Skill scores lower than baseline | Skill constraining model too much | Check if skill instructions conflict with prompt |

## Routing evals with `claude plugin eval`

The benchmark above measures output quality. It cannot tell you whether the
model reaches for your skill in the first place. Claude Code ships a separate
runner for that, added in 2.1.198 and absent from the public changelog.

### Unlocking it

```bash
export CLAUDE_CODE_WALNUT_SPIRE=1
claude plugin eval .
```

Before 2.1.207 the gate was a server-side flag with no local override, so on an
older CLI the command refuses regardless of environment.

### Case layout

A case is a directory under `evals/` holding a prompt and at least one grader.
`claude plugin eval init --bare <name>` scaffolds the pair.

```
evals/routes-to-code-auditor/
  prompt.md
  graders/expected-agent.md
```

```markdown
<!-- prompt.md -->
---
max_turns: 1
allowed_tools: [Skill]
runs: 3
---
Audit this diff for injection risks. Reply with only the skill you would invoke.
```

```markdown
<!-- graders/expected-agent.md -->
---
type: regex
weight: 1
pattern: '^\s*(review:)?(code-auditor)\s*$'
---
```

A single `case.yaml` is the alternative form. It requires `schema_version`,
`name`, and an `execution` block, and every grader needs `name` and `type`.

### Grader types

| `type` | Required fields | Scores by |
|---|---|---|
| `regex` | `pattern` | matching the final message |
| `tool_used` | `tool` | whether a tool was called |
| `tool_order` | `before`, `after` | relative order of two calls |
| `file_exists` | `path` | a file present after the run |
| `llm` | `criteria` | a judge model's verdict |
| `baseline` | `baseline_file`, `criteria` | comparison with a recorded answer |

The first four cost nothing to score. For "which skill did it pick", `regex` is
exact and free, and a judge has nothing to weigh.

### Ablation

`--ablation with-without` runs every case twice, with the plugin loaded and
without it, and reports the delta. It answers whether the plugin causes the
behaviour or the model would have got there anyway.

```bash
claude plugin eval . --runs 3 --ablation with-without --report report.html
```

Include negative cases that expect no skill. They are the only thing that
catches a catalog claiming requests it should decline, and they should pass in
both arms.

### Failures that are not routing failures

Three setups produce red results indistinguishable from a genuine miss.

`allowed_tools: []` removes the Skill tool and the entire catalog with it, so
the model correctly answers that nothing applies. Skill-selection cases need
`allowed_tools: [Skill]`.

A grader pattern must allow the prefix the model returns; asking for
`visual-review` and receiving `review:visual-review` scores as a miss
unless the prefix is optional.

A case can name a resource its target plugin does not contain, which happens
whenever resources move between distributions. Audit expected names against the
plugin's real inventory before trusting any failure.

On the CLI itself, repeated `--case` flags do not accumulate. The last glob
wins, so a run that looks like ten cases may have been two.

### Sampling

Use `--runs 3` or higher. On a thirty-case suite a single sample per arm swings
by one to two cases on its own, which is enough to invent a difference between
two versions that does not exist.

## Lessons Learned

These patterns have been confirmed through multiple benchmark runs:

- **Behavioral suppression skills are easiest to benchmark** (humanize: +53%)
- **Novel knowledge injection works if truly novel** (geo-optimizer: +50%, NANDA protocol)
- **Common knowledge injection shows 0% delta** (charting, prd-creator, hunter-skeptic-referee)
- **Skills needing system access can't be benchmarked this way** (process-cleanup: -5%)
- **Long, expensive prompts waste money without improving signal** (saas-launch-audit)
- **2-3 well-designed evals beat 10 mediocre ones**
