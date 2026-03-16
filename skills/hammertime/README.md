# HammerTime — Behavioral guardrails for AI coding assistants

Stop hook that catches bad model behaviors before they reach you. Runs on every assistant response, scoring against your rules and blocking violations before they become your problem to undo.

## What you can do with it

**Keep an agent working for a set amount of time.** Tell HammerTime "30 minutes, finish this refactor" and it will block every attempt to stop until the clock runs out — including the agent's own mid-task stopping. This is the standout feature for large tasks where the model tends to declare victory prematurely.

**Catch specific bad behaviors automatically.** Write a rule in plain English — "never dismiss errors as pre-existing" — and HammerTime scores every response against it. High-confidence violations are blocked immediately. Ambiguous ones go to a fast Haiku verification call before blocking.

**Trigger skills when a rule fires.** A rule can specify a skill to invoke when it catches a violation. The block message tells the agent exactly what to do next: "Invoke Skill(bopen-tools:confess) to address this."

**Ground rules in real session logs.** The built-in `project-owner` rule went from F1=0.14 to F1=0.89 after mining 10 production session logs — synthetic keywords guessed from a description almost never match how the model actually talks.

---

## Timer rules — deep focus on demand

The fastest way to get value from HammerTime. Run one of these commands at the start of a task:

```
/hammertime 30m deep focus on this refactoring
/hammertime 1h thorough security review of the codebase
/hammertime 45m finish this feature completely, check all edge cases
/hammertime 2h massive migration — keep iterating until it's done
```

For the duration, every stop attempt is blocked. The block message tells the agent how much time remains and prompts it to keep iterating — review the work, look for edge cases, verify tests pass. When the deadline passes, the timer rule auto-deletes from `rules.json` and the hook stops firing for that session.

Timer rules bypass the infinite-loop guard (`stop_hook_active`) because the deadline provides a hard termination guarantee — unlike content rules, there's no risk of an unbounded block cycle.

---

## Content rules — catching behavior patterns

Content rules score every assistant response against a set of keywords and patterns, then decide whether to block.

```
/hammertime always run tests before committing
/hammertime never say 'everything looks good' when there are warnings
/hammertime fix all errors you encounter, don't report them as someone else's problem
/hammertime whenever writing a new API endpoint, add input validation
/hammertime never leave TODO comments in code — implement it or don't mention it
```

### Skill invocation triggers

The most effective pattern: a rule detects bad behavior, and a skill provides the structured correction.

```
/hammertime whenever writing marketing copy, invoke Skill(humanize) to review it
/hammertime when creating a new agent, invoke Skill(agent-auditor) to validate it
/hammertime when finishing a feature branch, invoke Skill(confess) before marking done
/hammertime when you skip architecture planning, invoke Skill(visual-planner) to force it
```

| Rule detects | Skill invoked | Effect |
|---|---|---|
| Skips tests | `superpowers:test-driven-development` | Redirects to TDD workflow |
| Skips architecture planning | `gemskills:visual-planner` | Forces visual planning step |
| Writes insecure code | `bopen-tools:code-audit-scripts` | Runs security audit |
| Finishes without self-review | `bopen-tools:confess` | Forces self-audit |

### Anti-laziness rules

```
/hammertime never suggest the user do something manually that you can do with tools
/hammertime fix all errors you encounter, don't report them as someone else's problem
/hammertime never say 'everything looks good' when there are warnings
/hammertime when you find a workaround, explain why the root cause is out of scope
```

### Project-specific rules

```
/hammertime always use Biome for linting, never ESLint
/hammertime never downgrade package versions to fix errors
/hammertime always commit with a Linear issue ID prefix
/hammertime never use CDN imports — use proper module imports
```

---

## How scoring works

Three layers of detection, each more specific than the last:

| Layer | What it matches | Score | Purpose |
|-------|----------------|-------|---------|
| **1 — Keywords** | Case-insensitive substring match | +1 each | Broad signal detection |
| **2 — Intent patterns** | Regex on full response text | +2 each | Structural paraphrase catching |
| **3 — Co-occurrence** | Dismissal verb + qualifier in same sentence | +3 | Highest-confidence signal |

**Score thresholds:**
- **0** — Pass through.
- **1–4** — Ambiguous. Haiku verifies (~500ms, ~$0.001).
- **5+** — Clear violation. Block directly, skip Haiku.

The `confidence_threshold` field (default: 5) controls where the direct-block cutoff sits.

### Why corpus-driven rules matter

Rules derived from guessing what a violation looks like produce brittle results. Rules grounded in real session logs are dramatically more accurate.

**Example — the built-in `project-owner` rule:**

| Approach | F1 Score |
|---|---|
| Synthetic keywords guessed from description | 0.14 |
| After mining 10 real session logs | 0.89 |

The gap is large because the model's actual dismissal language ("this appears to be pre-existing", "errors are unchanged", "not from our changes") rarely matches the phrases a human would guess ("pre-existing issue", "not my fault"). When you create a rule, HammerTime searches your conversation logs for real examples of the behavior, then derives keywords and patterns from how the model actually talks.

### Block messages include trigger phrases

When a rule fires, the block message lists which phrases in the response triggered the rule — up to five quoted strings — so the agent understands exactly what it said that caused the violation rather than producing another response that fails in the same way.

---

## Loop prevention

Rules that are too broad can create infinite loops: the rule blocks exit, re-injects the prompt, the model produces the same violation, repeat.

HammerTime prevents this with per-rule iteration tracking:

- Each rule has a `max_iterations` field (default: 3)
- The hook tracks how many times each rule has blocked in the current session
- When a rule hits its limit, it's skipped and the response passes through
- Counters reset automatically when a new Claude Code session starts

State is stored in `~/.claude/hammertime/state.json` with atomic writes (temp file + rename) so a crash mid-session never corrupts it. Set `"max_iterations": 0` to make a rule unlimited — appropriate for timer rules, where the deadline already guarantees termination.

---

## Commands

| Command | Purpose |
|---|---|
| `/hammertime 30m <desc>` | Create a timer rule (blocks for 30 minutes) |
| `/hammertime <desc>` | Create a content rule from a description |
| `/hammertime` | Show status dashboard |
| `/hammertime:status` | Dashboard showing all rules and their status |
| `/hammertime:manage` | Interactive rule management |

---

## Debug logging

Enable detailed score breakdowns:

```bash
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
```

```
[   2ms] SCORE: rule 'fix-lint-errors' score=4 (kw=2, intent=1, cluster=0)
[   3ms] PHASE2: score 4 < 5, verifying with Haiku
[ 487ms] PHASE2: rule 'fix-lint-errors' violated=true
```

Each line shows elapsed time, rule name, total score by layer, and phase decision.

---

## Installation

HammerTime is included with the bopen-tools plugin.

```bash
claude plugin install bopen-tools@b-open-io
```

Restart Claude Code after install to register the Stop hook.

---

## Rule schema reference

Rules are JSON objects in `~/.claude/hammertime/rules.json`. You rarely need to edit this file directly — the `/hammertime` command creates rules for you.

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique kebab-case identifier |
| `rule` | Yes | Natural language rule text (shown in block messages and to Haiku) |
| `enabled` | Yes | Boolean toggle |
| `keywords` | Yes | 4–8 trigger strings for Layer 1 scoring |
| `intent_patterns` | No | Regex strings for Layer 2 structural matching |
| `dismissal_verbs` | No | Regex matching refusal/avoidance verbs for Layer 3 |
| `qualifiers` | No | Regex matching attribution/deflection terms for Layer 3 |
| `confidence_threshold` | No | Score to block without Haiku (default: 5) |
| `skill` | No | Fully-qualified skill ID to invoke when rule fires |
| `evaluate_full_turn` | No | Score all assistant messages in the turn, not just the last (default: false) |
| `max_iterations` | No | Max blocks per session before allowing exit (default: 3, 0 = unlimited) |
| `check_git_state` | No | Skip rule if working tree is clean and commits are pushed (default: false) |
| `deadline` | No | ISO 8601 datetime — makes this a timer rule; auto-deleted when expired |

See `SKILL.md` for the full rule creation workflow and scoring details.
