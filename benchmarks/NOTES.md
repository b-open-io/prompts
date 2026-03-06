# Benchmark Notes

## How It Works

- `scripts/benchmark.tsx` runs each skill's evals with and without the skill injected via `claude -p --append-system-prompt`
- An LLM-as-judge grades assertions per eval
- Results written to `benchmarks/latest.json` (published to bopen.ai/benchmarks) and per-skill `evals/benchmark.json`
- Cache in `benchmarks/cache/` keyed by model+skill+eval+variant — clear cache when changing eval content

## Running

```bash
bun run benchmark                                    # All skills
bun run benchmark --skill geo-optimizer              # Single skill
bun run benchmark --model claude-sonnet-4-6          # Override model (default: haiku)
bun run benchmark --concurrency 4                    # Parallel workers
BENCHMARK_MODEL=claude-sonnet-4-6 bun run benchmark  # Env var override
```

From within Claude Code, prefix with `CLAUDECODE=` to avoid nested session errors.

## Publishing Policy

- Only publish skills with **positive delta** (skill > baseline)
- Zero or negative delta means the skill needs refinement, not publishing
- The `latest.json` merges per-skill results when `--skill` is used — won't clobber other skills

## No CI

Benchmarks are run manually, not in CI. The automated workflow was removed because:
- Too expensive to run on every push
- CI runs were overwriting good results with broken partial data
- Skills don't change frequently enough to justify automated re-runs

## Eval Design Principles

Good evals test for things the **baseline model can't do without the skill**:
- Behavioral changes (humanize: avoid specific AI patterns)
- Niche knowledge injection (geo-optimizer: NANDA protocol, hedge density)
- Specific formatting/structure the skill enforces

Bad evals test for things the model already knows:
- Common frameworks (Shape Up, Working Backwards — model knows these)
- General concepts (adversarial review, three-phase workflows)
- Fact recall from training data

## Per-Skill Notes

### geo-optimizer
- **Status**: Strong performer (+50% delta on Sonnet 4.6)
- Eval 2 (NANDA/AgentFacts) is the strongest differentiator — baseline doesn't know this protocol
- Eval 1 (GEO audit) tests niche concepts like hedge density scoring

### humanize
- **Status**: Best eval design — tests behavioral anti-patterns
- Assertions check for specific patterns (binary contrasts, tricolons, punchline endings) that LLMs naturally produce
- The skill's value is suppressing default model behavior, which is ideal for benchmarking

### hunter-skeptic-referee
- **Status**: Needs eval redesign (0% delta on Sonnet 4.6 — both scored 100%)
- Current evals test knowledge recall (describe the workflow) — model already knows adversarial review
- Redesign should test behavioral execution: give it code and check if it actually runs three isolated phases
- This skill works well in practice for complex reviews — the evals just don't capture that

### process-cleanup
- **Status**: Pending results
- Caveat: benchmark runs without real system access, so it tests formatting knowledge not actual behavior
- Assertions test for friendly names, waste scores, safety categories — good structural tests

### prd-creator
- **Status**: Removed from benchmarks
- Showed -16.7% delta — baseline already knows Shape Up and Working Backwards
- PRD knowledge folded into project-manager agent description instead
- The skill itself still exists for users who want it

### saas-launch-audit
- **Status**: Removed from benchmarks
- Too expensive (long prompts, 3 evals × 6 assertions)
- Tests fact recall (specific percentages, thresholds) not audit quality
- Designed for interactive use with browser tools — benchmarking without tools is unfair
