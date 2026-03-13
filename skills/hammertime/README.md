# HammerTime — Behavioral guardrails for AI coding assistants

Stop hook that catches bad model behaviors before they reach you. Runs on every assistant response, enforces your rules automatically.

## What It Does

HammerTime uses two-phase detection to enforce behavioral rules:

- **Phase 1 — Local scoring** (free, <1ms): Fast substring and regex matching against all enabled rules
- **Phase 2 — Haiku verification** (~500ms, ~$0.001): Ambiguous scores get a second opinion from Haiku before blocking

Rules live at `~/.claude/hammertime/rules.json`. The hook registers as a Stop hook and fires on every assistant turn, before the response reaches you.

## Use Cases

### Workflow Enforcement

```
/hammertime always run tests before committing
/hammertime use visual planner skill whenever architecture changes
/hammertime always check for accessibility issues before finishing UI work
/hammertime whenever writing a new API endpoint, add input validation
```

### Quality Gates

```
/hammertime never ship code with TypeScript errors
/hammertime when you find security issues, fix them immediately instead of noting them
/hammertime always run the linter after editing files
/hammertime never leave TODO comments in code — implement it or don't mention it
```

### Skill Invocation Triggers

The most powerful pattern: a rule detects bad behavior, and a skill provides the structured fix. When the rule fires, Claude is instructed to invoke the named skill.

```
/hammertime whenever writing marketing copy, invoke Skill(humanize) to review it
/hammertime when creating a new agent, invoke Skill(agent-auditor) to validate it
/hammertime when finishing a feature branch, invoke Skill(confess) before marking done
/hammertime when you skip architecture planning, invoke Skill(visual-planner) to force it
```

| Rule detects | Skill invoked | Effect |
|---|---|---|
| Skips tests | `superpowers:test-driven-development` | Redirects to TDD workflow |
| Ignores lint | `bopen-tools:simplify` | Runs code simplification |
| Skips architecture planning | `gemskills:visual-planner` | Forces visual planning step |
| Writes insecure code | `bopen-tools:code-audit-scripts` | Runs security audit |
| Finishes without self-review | `bopen-tools:confess` | Forces self-audit |

### Anti-Laziness

```
/hammertime never suggest the user do something manually that you can do with tools
/hammertime fix all errors you encounter, don't report them as someone else's problem
/hammertime never say 'everything looks good' when there are warnings
```

### Project-Specific

```
/hammertime always use Biome for linting, never ESLint
/hammertime never downgrade package versions to fix errors
/hammertime always commit with a Linear issue ID prefix
```

## How It Works

Three layers of scoring, each more specific than the last:

| Layer | What it matches | Score | Purpose |
|-------|----------------|-------|---------|
| **1 — Keywords** | Case-insensitive substring match | +1 each | Broad signal detection |
| **2 — Intent Patterns** | Regex on full response text | +2 each | Structural paraphrase catching |
| **3 — Co-occurrence** | Dismissal verb + qualifier in same sentence | +3 | Highest-confidence signal |

**Score thresholds:**
- **0** — No match. Pass through.
- **1–4** — Ambiguous. Haiku verifies.
- **5+** — Clear violation. Block directly.

A rule fires when any layer accumulates enough signal. The `confidence_threshold` field (default: 5) controls when Haiku is skipped and the response is blocked outright.

## Safety: Loop Prevention

Rules can create infinite loops if they're too broad or the model can't satisfy them -- the rule blocks exit, re-injects the prompt, and the model produces the same violation again.

HammerTime prevents this with per-rule iteration tracking:

- Each rule has a `max_iterations` field (default: 3)
- The hook tracks how many times each rule has blocked in the current session
- When a rule hits its limit, it's skipped with a debug log message
- Counters reset automatically when a new Claude Code session starts

State is stored in `~/.claude/hammertime/state.json` with atomic writes (temp file + rename) to prevent corruption. Set `"max_iterations": 0` to make a rule unlimited.

## The Corpus-Driven Advantage

Rules derived by imagining what a violation might look like produce brittle results. Rules grounded in your actual session logs are dramatically more accurate.

**Real example — the built-in `project-owner` rule:**

| Approach | F1 Score |
|---|---|
| Synthetic keywords (guessed from description) | 0.14 |
| After mining 10 real session logs | 0.89 |

The gap is real: the model's actual dismissal language (`"this appears to be pre-existing"`, `"seems like it was there before I started"`) rarely matches the phrases a human would guess (`"pre-existing issue"`, `"not my fault"`).

When you create a rule, HammerTime searches your conversation logs for real examples of the behavior, then derives keywords and patterns from how the model actually talks — not how you imagine it talks.

## Commands

| Command | Purpose |
|---|---|
| `/hammertime` | Show status or create a rule from a description |
| `/hammertime:status` | Dashboard showing all rules and their status |
| `/hammertime:manage` | Interactive rule management |

## Debug Logging

Enable detailed score breakdowns by setting an environment variable:

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
```

Example log output:

```
[   2ms] SCORE: rule 'fix-lint-errors' score=4 (kw=2, intent=1, cluster=0)
[   3ms] PHASE2: score 4 < 5, verifying with Haiku
[ 487ms] PHASE2: rule 'fix-lint-errors' violated=true
```

Each line shows elapsed time, rule name, total score, layer breakdown, and phase decision.

## Installation

HammerTime is included with the bopen-tools plugin. No separate install needed.

```bash
claude plugin install bopen-tools@b-open-io
```

After install, restart Claude Code to register the Stop hook.

## Rule Schema Reference

Rules are JSON objects in `~/.claude/hammertime/rules.json`.

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique kebab-case identifier |
| `rule` | Yes | Natural language rule text (shown in block messages and to Haiku) |
| `enabled` | Yes | Boolean toggle |
| `keywords` | Yes | 4-8 trigger strings for Layer 1 scoring |
| `intent_patterns` | No | Regex strings for Layer 2 structural matching |
| `dismissal_verbs` | No | Regex matching refusal/avoidance verbs for Layer 3 |
| `qualifiers` | No | Regex matching attribution/deflection terms for Layer 3 |
| `confidence_threshold` | No | Score to block without Haiku (default: 5) |
| `skill` | No | Fully-qualified skill ID to invoke when rule fires |
| `evaluate_full_turn` | No | Score all assistant messages in the turn, not just the last (default: false) |
| `max_iterations` | No | Max times this rule can block per session before allowing exit (default: 3, 0 = unlimited) |
| `check_git_state` | No | Skip rule if working tree is clean and commits are pushed (default: false) |

See `SKILL.md` for the full rule creation workflow and scoring details.
