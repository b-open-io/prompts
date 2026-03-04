---
name: benchmark-skills
version: 1.0.0
description: "Use this skill when creating evals or assertions for a skill, running the skill benchmark harness, measuring skill effectiveness vs baseline, or writing evals.json files alongside skills. Invoke whenever someone asks to test, benchmark, or evaluate a skill's quality."
---

# Benchmark Skills

Write evals for skills and run the benchmark harness to measure whether a skill actually helps compared to baseline (no skill).

## Eval File Format

Every skill that wants benchmarking needs an `evals/evals.json` file inside its skill directory:

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
      "expected_output": "Human-readable description of what a good response looks like",
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

**Fields:**
- **skill_name**: Must match the skill directory name
- **evals[].id**: Unique integer per eval within the file
- **evals[].prompt**: The exact prompt sent to `claude -p`. Write it as a realistic user request that should benefit from the skill.
- **evals[].expected_output**: Description for the LLM-as-judge grader. Not the literal expected text -- describe what a correct response contains.
- **evals[].files**: Array of file paths to include as context (usually empty for prompt-only evals)
- **evals[].assertions**: Array of assertions the judge grades against

## Assertion Types

### Qualitative (type: "qualitative")
Graded by an LLM-as-judge. The judge reads the actual output and decides if the assertion holds.

```json
{
  "id": "geo-1-hedge-density",
  "text": "The response explains hedge density scoring and identifies hedge words that reduce AI search ranking confidence.",
  "type": "qualitative"
}
```

### Writing Good Assertions

1. **Be specific**: "The response includes a mermaid diagram" not "The response is good"
2. **Be verifiable**: The judge must be able to answer yes/no
3. **Target what the skill uniquely provides**: Assertions should test knowledge or patterns that come from the skill, not generic model capability
4. **3-5 assertions per eval**: Enough to measure quality without over-testing
5. **Cover different aspects**: Mix structural checks (format, sections) with content checks (specific knowledge, techniques)

Bad assertions:
- "The response is helpful" (too vague)
- "The response is correct" (not specific)

Good assertions:
- "The response uses proper heading hierarchy (h1 for title, h2 for sections) without skipping levels"
- "The response distinguishes between rendering crawlers and non-rendering crawlers"
- "The response includes a comparison table with old vs new technologies"

## Running the Benchmark

```bash
# Run all skills that have evals
bun run benchmark

# Run a specific skill
bun run benchmark --skill geo-optimizer

# Change model
bun run benchmark --model claude-sonnet-4-6

# Increase parallelism (default: 2)
bun run benchmark --concurrency 4
```

The harness runs each eval prompt twice: once with the skill injected via `--append-system-prompt`, once without (baseline). Both outputs are graded by LLM-as-judge against the assertions.

## Reading Results

Results are written to `benchmarks/latest.json`:

```json
{
  "generated_at": "2026-03-04T...",
  "model": "claude-sonnet-4-6",
  "total_skills": 2,
  "total_evals": 4,
  "overall_pass_rate": 0.833,
  "overall_baseline_pass_rate": 0.5,
  "skills": [
    {
      "skill_name": "geo-optimizer",
      "pass_rate": 0.889,
      "baseline_pass_rate": 0.444,
      "evals": [...]
    }
  ]
}
```

### Key Metrics

- **pass_rate**: Assertion pass rate when the skill is active
- **baseline_pass_rate**: Assertion pass rate without the skill
- **Delta** (pass_rate - baseline_pass_rate): Positive means the skill helps. Negative means the skill hurts. Zero means no effect.

A well-written skill should have a positive delta. If the delta is zero or negative, either:
1. The skill does not add useful knowledge for these prompts
2. The assertions do not target skill-specific content
3. The skill content is confusing the model

## When to Write Evals

- **After creating a new skill**: Validate it actually helps before publishing
- **Before publishing updates**: Ensure changes did not regress quality
- **After major skill rewrites**: Confirm the rewrite maintained or improved effectiveness
- **When debugging skill quality**: Evals provide reproducible measurement

## Example: evals.json for a Fictional Skill

For a skill called `api-docs-writer` that helps write API documentation:

```json
{
  "skill_name": "api-docs-writer",
  "evals": [
    {
      "id": 1,
      "prompt": "Write API documentation for a REST endpoint POST /api/users that creates a new user. The endpoint accepts name (string, required), email (string, required), and role (enum: admin, user, viewer, optional, defaults to user). Returns 201 with the created user object or 400/409 for validation errors.",
      "expected_output": "Complete API documentation with endpoint description, request/response schemas, status codes, and examples for both success and error cases.",
      "files": [],
      "assertions": [
        {
          "id": "api-1-method-path",
          "text": "The documentation clearly states the HTTP method (POST) and path (/api/users) in a prominent heading or first line.",
          "type": "qualitative"
        },
        {
          "id": "api-1-request-schema",
          "text": "The documentation includes a request body schema showing name (required string), email (required string), and role (optional enum with default).",
          "type": "qualitative"
        },
        {
          "id": "api-1-status-codes",
          "text": "The documentation lists at least 201, 400, and 409 status codes with descriptions of when each occurs.",
          "type": "qualitative"
        },
        {
          "id": "api-1-examples",
          "text": "The documentation includes at least one curl or HTTP request example and a JSON response example.",
          "type": "qualitative"
        }
      ]
    },
    {
      "id": 2,
      "prompt": "Write API documentation for a paginated GET /api/products endpoint that supports query parameters: page (int, default 1), limit (int, default 20, max 100), sort (string: price, name, created_at), and filter[category] (string). Returns a paginated response with items array and pagination metadata.",
      "expected_output": "API docs covering query parameters with types/defaults, pagination response structure, and example requests showing filtering and sorting.",
      "files": [],
      "assertions": [
        {
          "id": "api-2-query-params",
          "text": "The documentation lists all four query parameters with their types, defaults, and constraints (especially limit max 100).",
          "type": "qualitative"
        },
        {
          "id": "api-2-pagination-meta",
          "text": "The documentation describes the pagination metadata structure (total, page, limit, or equivalent fields).",
          "type": "qualitative"
        },
        {
          "id": "api-2-filter-example",
          "text": "The documentation includes an example showing how to use the filter[category] query parameter.",
          "type": "qualitative"
        }
      ]
    }
  ]
}
```

## Tips

- Start with 2-3 evals per skill. You can always add more.
- Make prompts realistic -- they should look like what a user would actually ask.
- Run the benchmark on different models to see if the skill generalizes.
- If a skill helps on one model but not another, the skill may be over-fitted to one model's style.
- Keep assertions focused on what the SKILL uniquely provides, not what any model would do well anyway.
