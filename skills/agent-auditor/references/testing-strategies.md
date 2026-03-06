# Testing Strategies for Skills

Methodology for testing skill quality, distilled from Anthropic's skill-creator blog post and our benchmark-skills harness. Use this reference when creating evals, running benchmarks, or measuring skill effectiveness.

## Trigger Testing

The most fundamental test: does the skill load when it should, and stay quiet when it shouldn't?

### Writing Trigger Tests

Create 20 test queries:
- **10 should-trigger:** Realistic prompts that should activate the skill
- **10 should-not-trigger:** Prompts that are adjacent but should NOT activate the skill

**Rules for good trigger tests:**
- Use language real users would type, not skill jargon
- Include paraphrased versions of the same intent
- Include edge cases (partial matches, ambiguous requests)
- Should-not-trigger tests should be plausible near-misses, not obviously unrelated

**Example for a deployment skill:**
```
Should trigger:
- "Deploy my app to production"
- "Push this to staging"
- "I need to ship this update"
- "How do I set up CI/CD for this project?"
- "Can you deploy the latest changes?"

Should NOT trigger:
- "What's the weather in San Francisco?"
- "Write a Python function to sort a list"
- "Help me design a database schema"
- "Create a new React component"
- "What does this error message mean?"
```

### Measuring Trigger Rate

Run each test query through Claude with the skill installed. Track:
- **True positive rate:** % of should-trigger queries that load the skill
- **False positive rate:** % of should-not-trigger queries that load the skill
- **Target:** >90% true positive, <10% false positive

If true positive rate is low, the description needs more trigger phrases.
If false positive rate is high, the description needs narrowing or negative triggers.

## Functional Testing with evals.json

Every skill that wants quality measurement needs an `evals/evals.json` file.

### Structure

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic user request that should benefit from the skill",
      "expected_output": "Description of what a correct response contains",
      "files": [],
      "assertions": [
        {
          "id": "unique-id",
          "text": "Specific, verifiable claim about the output",
          "type": "qualitative"
        }
      ]
    }
  ]
}
```

### Writing Good Assertions

**3-5 assertions per eval.** Each assertion should:
1. Be answerable yes/no by an LLM-as-judge
2. Target knowledge or patterns the skill uniquely provides
3. Not test generic model capability (any model would do this without the skill)
4. Cover different aspects: structural checks + content checks

**Good assertions:**
- "The response includes a mermaid diagram showing the workflow"
- "The response distinguishes between rendering crawlers and non-rendering crawlers"
- "The response uses proper heading hierarchy without skipping levels"

**Bad assertions:**
- "The response is helpful" (too vague)
- "The response is correct" (not verifiable)
- "The response uses proper grammar" (not skill-specific)

### Running the Benchmark

```bash
# Run all skills with evals
bun run benchmark

# Run a specific skill
bun run benchmark --skill my-skill

# Change model
bun run benchmark --model claude-sonnet-4-6

# Increase parallelism
bun run benchmark --concurrency 4
```

The harness runs each eval prompt twice:
1. **With skill:** Prompt sent with skill injected via `--append-system-prompt`
2. **Without skill (baseline):** Same prompt, no skill injection

Both outputs are graded by LLM-as-judge against the assertions.

## Performance Comparison

### Key Metrics

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| `pass_rate` | Assertion pass rate with skill active | >0.8 |
| `baseline_pass_rate` | Assertion pass rate without skill | Lower than pass_rate |
| **Delta** (`pass_rate - baseline_pass_rate`) | Skill's added value | Positive |

**Interpreting results:**
- **Positive delta:** Skill helps -- it provides knowledge the model doesn't have natively
- **Zero delta:** Skill provides no added value for these prompts (model already knows this)
- **Negative delta:** Skill hurts -- it's confusing the model or providing wrong guidance

### What to Do with Results

| Result | Action |
|--------|--------|
| Delta > 0.3 | Skill is highly effective, publish with confidence |
| Delta 0.1-0.3 | Skill helps, but could be improved |
| Delta 0-0.1 | Skill may not be necessary -- model already handles this |
| Delta < 0 | Skill is actively harmful, needs major revision or deletion |

**If delta is zero or negative:**
1. Check if assertions target skill-specific content (not generic model knowledge)
2. Check if the skill duplicates information the model already knows well (Markdown, JSON, YAML)
3. Check if the skill content is contradicting or confusing the model
4. Consider whether the skill should exist at all

## Quantitative Metrics

Track these across benchmark runs:

- **Trigger rate:** What % of target prompts activate the skill?
- **Token usage:** How many tokens does the skill add per invocation?
- **Tool call count:** With-skill vs without-skill tool call comparison
- **Failed API calls:** Monitor MCP server logs during test runs for retry rates and error codes

## Qualitative Metrics

Assess through manual testing or user feedback:

- **User correction frequency:** How often does the user need to redirect Claude after the skill loads?
- **Workflow completion rate:** Does the skill complete the full workflow without stalling?
- **Consistency:** Run the same request 3-5 times -- are outputs structurally consistent?
- **First-try success:** Can a new user accomplish the task on first try with minimal guidance?

## Description Optimization Loop

When trigger testing reveals issues, use this iterative process:

1. Write initial description
2. Run 20 trigger tests, record true positive and false positive rates
3. Identify missed triggers (false negatives) and over-triggers (false positives)
4. Revise description: add phrases for missed triggers, add negative triggers for over-triggers
5. Re-run trigger tests
6. Repeat until >90% true positive and <10% false positive

**Automated version:** The benchmark harness can run this loop automatically:
```bash
bun run benchmark --skill my-skill --optimize-description
```

## When to Write Evals

- **After creating a new skill:** Validate it actually helps before publishing
- **Before publishing updates:** Ensure changes didn't regress quality
- **After major skill rewrites:** Confirm the rewrite maintained or improved effectiveness
- **When debugging skill quality:** Evals provide reproducible measurement
- **During periodic audits:** Re-run evals to catch drift

## Starting Small

Start with 2-3 evals per skill. Make prompts realistic -- they should look like what a user would actually ask. You can always add more evals after the first round of results reveals gaps.

Run benchmarks on different models to check if the skill generalizes. If a skill helps on one model but not another, it may be over-fitted to one model's style.
