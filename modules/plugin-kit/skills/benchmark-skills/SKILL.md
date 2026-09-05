---
name: benchmark-skills
version: 2.0.2
description: >-
  Run skill benchmarks and write evals that score a skill against a no-skill baseline. Use for
  "benchmark this skill", "run the skill evals", "write an eval for this skill", or "did this
  skill actually help?".
---

# Benchmark Skills

Write evals for skills and run the benchmark harness to measure whether a skill actually helps compared to baseline (no skill).

## The Core Principle

Benchmark the behavior the skill is meant to change, and keep the evaluation mode explicit. Three related questions need different evidence:

1. **Text-output ablation** — Does the injected skill text improve correctness, coverage, or a defined behavior for a fixed prompt? The harness runs a baseline and a with-skill arm in the same empty, tool-free environment. This is an ablation of the text body, not an installed workflow invocation.
2. **Routing** — Does the host select the right skill or agent for a request? Use the host's routing evaluator and its exact qualified resource identifiers. A routing result does not measure the quality of the eventual answer.
3. **Tool or artifact integration** — Does the skill complete a workflow involving files, tools, or artifacts? Use an integration fixture with explicit tool permissions and inspect the resulting artifact. A text-only ablation cannot establish this.

Skills may provide measurable value through suppression, new knowledge, reliable structure, or general quality improvement. Do not discard a benchmark because a baseline succeeds: retain representative baseline successes and negatives, and keep adversarial cases in a separately labeled set so the suite measures both capability and failure modes.

## Pre-Flight Checklist

Before writing evals for a skill, record the following:

- [ ] The intended evaluation mode is text ablation, routing, or integration
- [ ] The task contract and the success criteria are observable
- [ ] The skill is ours (not copied from another publisher), or its provenance is recorded
- [ ] The suite includes ordinary held-out prompts, baseline successes, negative cases, and separately labeled adversarial cases where relevant
- [ ] Assertions are concrete enough to judge consistently, with a deterministic check preferred when one exists

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

## Prompt and sample design

Use a mixture of representative held-out prompts and adversarial cases. A trap is useful when it tests a known failure mode, but it is one part of the suite rather than a requirement for every eval. Label adversarial cases so they can be read separately from ordinary capability and regression results.

### Examples of targeted cases

These are development prompts and behavior hypotheses. Freeze the assertion
contract before scoring held-out cases; the examples do not establish what a
baseline will do.

| Skill | Development prompt | Behavior hypothesis to verify on held-out cases |
|-------|------------|------------------------|
| humanize | "Write 4 company values with descriptions" | Check punctuation, contrast, and ending patterns against the frozen contract |
| humanize | "Explain the pros and cons of X" | Check for the specified contrast pattern on untouched prompts |
| geo-optimizer | "Generate an AgentFacts schema following NANDA" | Check protocol fields and unsupported claims against the task contract |
| geo-optimizer | "Audit this site for AI search visibility" | Check the specified visibility criteria against held-out audits |

### Contrastive validation

Compare paired outputs, while retaining cases where both arms pass and cases where both arms fail. A baseline success is evidence about the task's difficulty and guards against publishing a skill that only appears useful on selected failures. Report uncertainty from the paired sample instead of treating a small difference as proof.

## Writing Assertions

### Assertion types by reliability

| Type | Reliability | Cost | Best for |
|------|-------------|------|----------|
| `not-contains` / regex | Highest | Free | Banned phrases, specific patterns |
| Binary LLM judge | High | 1 API call | Presence/absence of behavior |
| Rubric judge | Medium | 1 API call | Multi-dimensional quality |

Prefer deterministic negative or positive assertions when the behavior has a clear marker. Use a rubric or pairwise judge when correctness or quality cannot be reduced to a reliable string check.

### Good vs bad assertions

**Weak assertions:**
- "The response is helpful" — too vague, baseline passes
- "The response is correct" — not specific to skill
- "The response describes three phases" — model already knows this

**Strong assertions:**
- "The output does NOT use binary contrast patterns such as 'not X — it's Y'" — specific, testable, baseline fails
- "The response includes the @context field pointing to nanda.dev namespace" — genuinely novel knowledge
- "Processes are categorized into safety levels rather than a flat list" — specific format the skill teaches

### Rules

1. **Be specific**: test for exact patterns, not vibes
2. **Be binary**: the judge must answer yes/no unambiguously
3. **Target the task contract**: a baseline pass remains a useful result
4. **Use enough assertions to cover the contract**: avoid arbitrary counts that inflate judge noise
5. **State the minimum acceptable quality and no-regression boundary** before looking at delta
6. **Treat equal correctness with lower cost, token use, or latency as useful evidence**

## Assertion Discovery (VibeCheck Method)

If you're unsure what assertions to write for a new skill:

1. Generate development paired outputs (with skill vs. without) on diverse prompts
2. Have a model compare the two sets and propose behavioral hypotheses
3. Freeze the eval contract and assertion wording before inspecting held-out results
4. Check the frozen assertions on untouched held-out prompts and retain the full failure split

Observed development differences are hypotheses, not proof that an assertion
will differentiate. Do not derive an assertion from the same held-out outputs
used to report its result.

## Running the Benchmark

```bash
bun run scripts/benchmark.tsx                                    # All skills with evals
bun run scripts/benchmark.tsx --skill geo-optimizer              # Single skill
bun run scripts/benchmark.tsx --skill collections --skill-root /path/to/1sat-sdk # Skill from another plugin repo
bun run scripts/benchmark.tsx --model "$BENCHMARK_MODEL_ID"       # Override model (default: haiku)
bun run scripts/benchmark.tsx --concurrency 4                    # Parallel workers
```

From within Claude Code, prefix with `CLAUDECODE=` to avoid nested session errors.

Use `--skill-root` when the skill is published from another plugin repository.
The harness discovers root `skills/<name>/` entries and module entries under
`modules/<plugin>/skills/<name>/` when they contain `evals/evals.json`. A unique
bare `--skill <name>` remains supported; when names collide, select the exact
qualified id such as `review:code-auditor`. Vendored symlinks are followed only
when their resolved target stays inside the supplied repository.

The aggregate report is still written to `benchmarks/latest.json` in the
prompts repository, and the per-skill result is written beside the source
skill's `evals/benchmark.json`.

The text-output harness runs each eval prompt twice: once with the skill body
injected via `--append-system-prompt`, once without. Both arms use the same
fresh empty working directory, bare mode, disabled tools, disabled slash
commands, and empty strict MCP configuration. Both outputs are graded by
LLM-as-judge. This measures text-body ablation; it does not invoke the skill's
installed workflow, scripts, tools, or artifacts.

Its cache includes the complete eval contract, qualified skill identity,
injected `SKILL.md` content, and the current isolation namespace, so changing
guidance, assertions, identity, or arm semantics cannot silently reuse an
older score. Missing or errored JSON is retained as an infrastructure failure,
not counted as a successful raw stdout response.

## Reading Results

Results go to `benchmarks/latest.json` and per-skill `evals/benchmark.json`:

### Key Metrics

- **pass_rate**: Assertion pass rate with skill active
- **baseline_pass_rate**: Assertion pass rate without skill
- **Delta** (pass_rate - baseline_pass_rate): A paired comparison signal, interpreted with the sample size and uncertainty
- **Cost and latency**: Useful secondary evidence when correctness is equal
- **Token telemetry**: Complete usage includes input, output, and Claude cache read/creation tokens; `null` means usage was missing or corrupt and is not a zero-token measurement

| Result | Meaning | Action |
|-------|---------|--------|
| Meets minimum quality with no regression | The skill clears the absolute acceptance bar | Consider adoption; lower cost/token/latency strengthens the case |
| Small paired difference | Evidence is inconclusive at this sample size | Collect more held-out cases or inspect the failure split |
| Below minimum quality or regresses baseline | The skill is not ready for that task | Fix the skill, prompt, or workflow before adoption |

## Adoption policy

Use the minimum absolute quality and no-regression boundary as the first gate.
A positive delta is useful evidence, but it is not required when the skill
meets that boundary and provides equal correctness at lower cost, token use, or
latency. Keep routing and integration evidence separate from this text-output
decision. `latest.json` merges per-skill results when using `--skill`.

## Judge Quality

The LLM-as-judge has known failure modes. When results seem wrong:

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Everything passes | Assertions too vague | Make assertions more specific and binary |
| Inconsistent across runs | Judge non-deterministic | Use temperature=0, schema-constrained output, and repeated held-out samples |
| Skill and baseline score the same | The task may be easy, the effect may be small, or the mode may be wrong | Inspect held-out cases, uncertainty, and whether routing or integration evidence is needed |
| Skill scores lower than baseline | Skill constraining model too much | Check if skill instructions conflict with prompt |

## Routing evals

The text-body benchmark cannot establish whether the host selects a specialist.
Use the shipped `scripts/run-agent-routing.py` probe and score its JSONL with
`scripts/evaluate-skill-routing.py`. The probe asks for the selected
`subagent_type` as text; it records a selection measurement and does not invoke
the selected agent or measure the agent's eventual work.

Write routing prompts against the actual agent catalog. `review:code-auditor`
is an agent resource, so a selection case should request that exact qualified
agent id (or the exact `subagent_type` returned by the catalog), rather than
asking the model to call a `Skill` with that name. Keep `selected_agent`
separate from the scorer's legacy `invoked_skills` compatibility field. Before
using a probe command, run `claude --help` and verify each flag against the
installed CLI; do not rely on undocumented gates or environment variables.

### Sampling

Use repeated runs when the model is stochastic, and report the run count with
the result. Interpret small paired differences cautiously; add held-out cases
or repeat the run before treating them as a durable effect.

## Practical principles

- Keep task correctness and regression checks ahead of a delta threshold.
- Use deterministic assertions where the contract has a clear observable marker.
- Record errors, incomplete runs, and sampling details alongside successful grades.
- Do not invent benchmark results or improvement percentages; publish only data
  produced by the current, inspectable run.
