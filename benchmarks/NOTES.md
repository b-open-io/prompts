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

---

## Eval Design Methodology

### The Core Principle: Benchmark Behavior, Not Knowledge

The only skills that produce measurable delta are ones that **change what the model does by default**. Two categories work:

1. **Behavioral suppression** — The skill suppresses patterns the model naturally produces (e.g., humanize suppresses tricolons, binary contrasts, AI vocabulary). These are the highest-signal benchmarks because the baseline behavior is consistent and the assertion is concrete.

2. **Genuinely novel knowledge** — The skill injects domain knowledge that is NOT in the model's training data (e.g., geo-optimizer injects NANDA protocol, hedge density scoring). The key test: would a knowledgeable human need to look this up? If yes, the model probably doesn't know it either.

**What does NOT work:**
- Knowledge the model already has (Shape Up, Working Backwards, adversarial review, chart selection)
- General quality improvement without a specific behavioral target
- Skills that require real system access to demonstrate value (process-cleanup, CLI tools)
- Skills copied from other publishers (test your own work)

### Trap Input Design

Every eval prompt should be a **trap** — a prompt that reliably elicits the bad behavior the skill suppresses. If the baseline doesn't fail on a prompt, that prompt is useless as a test case.

Examples of good traps:
- "Write our company values with 4 values" → traps baseline into tricolons, binary contrasts, punchline endings (humanize)
- "Explain the pros and cons of X" → traps into "not X — it's Y" pattern (humanize)
- "Give me three key benefits of X" → traps into tricolon (humanize)
- "Generate an AgentFacts schema following NANDA protocol" → baseline doesn't know NANDA (geo-optimizer)

### Contrastive Validation

A proper eval checks BOTH directions:
1. **Baseline DOES exhibit** the bad pattern (confirms the trap works)
2. **Skill output does NOT exhibit** the bad pattern (confirms the skill works)

If the baseline passes an assertion, that assertion isn't measuring skill delta — it's measuring something the model already does. Either redesign the assertion or drop that test case.

### Assertion Types (by reliability)

| Type | Reliability | Cost | Use for |
|------|-------------|------|---------|
| `not-contains` / regex | Highest | Free | Specific banned phrases, patterns |
| Binary LLM judge | High | 1 API call | Presence/absence of a behavior |
| G-Eval rubric (CoT + score) | Medium | 1 API call | Multi-dimensional quality |
| Pairwise comparison | Medium-High | 2+ API calls | Subjective preference |

**Default to binary assertions.** "Does this output contain a tricolon?" is more stable than "rate the writing naturalness 0-10." Use deterministic checks (regex, string matching) whenever possible — they're free and perfectly reliable.

### Judge Best Practices

Our current judge sends assertions as plain text and asks for JSON. Research shows this is suboptimal. Better approach:

1. **Temperature = 0** for the judge model (deterministic grading)
2. **Chain-of-thought before verdict** — require the judge to reason before scoring
3. **Concrete examples** — give the judge 2-3 examples of pass and fail for each assertion
4. **Different model family as judge** — if outputs are from Claude, judge with GPT-4o or vice versa (avoids self-enhancement bias where a model rates its own outputs higher)
5. **JSON output** — structured output prevents parsing failures

Judge prompt structure:
```
You are evaluating whether the following text exhibits [specific behavior].

[BEHAVIOR DEFINITION]: [Specific definition with 2-3 concrete examples]
[EXAMPLES OF PRESENCE]: "..."
[EXAMPLES OF ABSENCE]: "..."

Think step by step about whether [specific markers] appear in the text.
Then output JSON: {"id":"...","passed":true/false,"reasoning":"one sentence"}
```

### Pass@3 for Stochastic Assertions

For behavioral assertions where outputs vary between runs, run each test case 3 times at temperature > 0 and require 2/3 to pass. This gives a reliability signal: pass@3 = 3/3 is stronger than 2/3, even if both "pass."

### Assertion Discovery (VibeCheck Method)

Before hardcoding assertions for a new skill, discover what actually differs:

1. Generate 20 paired outputs (with skill vs. without) on diverse inputs
2. Have a model propose behavioral differences it notices between the two sets
3. Validate those differences quantitatively across the full dataset
4. The patterns that show up consistently become formal assertions

This prevents guessing at assertions that don't actually differentiate.

### Skills Worth Benchmarking (Checklist)

Before writing evals for a skill, verify:

- [ ] The skill changes behavior the model performs by default (suppression) OR injects knowledge genuinely absent from training data
- [ ] The skill works in a non-interactive, single-prompt-in/single-response-out mode
- [ ] The skill doesn't require real system access (filesystem, APIs, browsers) to demonstrate value
- [ ] The skill is ours (not copied from another publisher)
- [ ] You can design at least 2 trap prompts that reliably elicit baseline failure
- [ ] Assertions are concrete and binary (not vague quality judgments)

If any box is unchecked, the skill is not a good benchmark candidate right now.

---

## Research Sources

Key papers and resources that informed this methodology:

- **MT-Bench** (Zheng et al., 2023) — Validated LLM-as-judge with >80% human agreement on pairwise comparisons. Accuracy drops on similar outputs, improves with larger gaps. [arxiv 2306.05685](https://arxiv.org/abs/2306.05685)
- **G-Eval** (Liu et al., 2023) — CoT + token probability scoring for evaluation. Highest correlation with human judges at the time. [arxiv 2303.16634](https://arxiv.org/abs/2303.16634)
- **Prometheus 2** (ICLR 2024) — Open-source 7B judge model reaching GPT-4 correlation (0.897 vs 0.882). Cost-effective alternative for behavioral grading. [arxiv 2405.01535](https://arxiv.org/html/2405.01535v2)
- **Bloom** (Anthropic, 2025) — Anthropic's internal behavioral eval framework. Claude Opus as judge achieves 0.86 Spearman correlation with human labels. [alignment.anthropic.com](https://alignment.anthropic.com/2025/bloom-auto-evals/)
- **VibeCheck** (2024) — Automated discovery of qualitative behavioral differences between model outputs. Iterative axis proposal + validation. [arxiv 2410.12851](https://arxiv.org/html/2410.12851v1)
- **SteerEval** (2025) — L3 (specific lexical suppression) is harder to control than L1/L2 (intent/strategy). Confirms that surface-pattern suppression skills need precise assertions. [arxiv 2603.02578](https://arxiv.org/html/2603.02578)
- **Promptfoo** — Most feature-complete open-source eval harness. Supports `not-contains`, `g-eval`, `llm-rubric`, `select-best`, weighted assertions. [promptfoo.dev](https://www.promptfoo.dev/docs/configuration/expected-outputs/)
- **Semgrep case study** — Deterministic assertions for measurable behaviors are more reliable and cheaper than LLM-judged quality. Use LLM judging only for things that can't be deterministically checked. [semgrep.dev blog](https://semgrep.dev/blog/2024/does-your-llm-thing-work-how-we-use-promptfoo)

### Known LLM-as-Judge Failure Modes

| Bias | Impact | Mitigation |
|------|--------|------------|
| Position bias | >10% accuracy shift from swapping order | Run pairwise twice with swapped order, average |
| Verbosity bias | Judges prefer longer outputs >90% of the time | Rubric instruction: "length does not indicate quality" |
| Self-enhancement | GPT-4 gives itself 10% win rate boost | Use different model family as judge |
| Inconsistency | Same input scores differently across runs | temperature=0, run 3x majority vote |

---

## Per-Skill Notes

### geo-optimizer
- **Status**: Published (+50% delta on Sonnet 4.6)
- Eval 2 (NANDA/AgentFacts) is the strongest differentiator — baseline doesn't know this protocol
- Eval 1 (GEO audit) tests niche concepts like hedge density scoring
- **Why it works**: Genuinely novel knowledge injection — NANDA protocol is not in training data

### humanize
- **Status**: Published (+53% delta on Sonnet 4.6, best eval design)
- Assertions check for specific patterns (binary contrasts, tricolons, punchline endings) that LLMs naturally produce
- Eval 2 scored 0% baseline → 100% with skill — a perfect trap
- **Why it works**: Behavioral suppression — the skill suppresses patterns the model produces by default

### hunter-skeptic-referee
- **Status**: Needs eval redesign (0% delta on Sonnet 4.6 — both scored 100%)
- Current evals test knowledge recall (describe the workflow) — model already knows adversarial review concepts
- The skill works well in practice for complex reviews — the evals just don't capture that
- **Redesign idea**: Give it actual buggy code and check whether output follows the three-phase protocol with isolated contexts. But this requires multi-turn execution, which our harness doesn't support.

### code-audit-scripts
- **Status**: Published (+17% delta on Sonnet 4.6)
- Uses test fixture at `benchmarks/fixtures/sample-project/` with planted issues
- Best traps: test file exclusion (skill excludes by default, baseline includes), severity categorization (FIXME/HACK/XXX vs TODO), false positive filtering (env var references vs real secrets)
- Eval #2 is the strongest differentiator — not telling model to exclude tests, skill does it automatically
- **Why it works**: Deterministic scripts produce exact counts and categorizations the baseline gets wrong

### perf-audit
- **Status**: Not published (-13% delta on Sonnet 4.6)
- Sonnet already knows heavy dependencies and their alternatives without the skill
- dep-audit.sh's curated list doesn't add knowledge the model lacks
- Pure knowledge injection that doesn't benchmark — same pattern as charting

### process-cleanup
- **Status**: Not published (-5% delta on Sonnet 4.6)
- Benchmark runs without real system access, so it tests formatting knowledge not actual behavior
- Sonnet 4.6 already formats process reports with friendly names and categories without the skill

### charting
- **Status**: Not published (0% delta on Sonnet 4.6)
- Model already knows chart selection, Canvas vs SVG, downsampling, library recommendations
- Pure knowledge injection with no behavioral change — exactly the pattern that doesn't benchmark

### prd-creator
- **Status**: Removed from benchmarks
- Showed -16.7% delta — baseline already knows Shape Up and Working Backwards
- PRD knowledge folded into project-manager agent description instead

### saas-launch-audit
- **Status**: Removed from benchmarks
- Too expensive (long prompts, 3 evals × 6 assertions)
- Tests fact recall not audit quality
- Designed for interactive use with browser tools — benchmarking without tools is unfair

### frontend-design
- **Status**: Removed — this is Anthropic's official skill, not ours
- Was incorrectly included in the repo
