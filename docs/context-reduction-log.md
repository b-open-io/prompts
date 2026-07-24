# Context reduction log

Running record of the bopen-tools startup-context work under OPL-3181.
Kept as evidence for release notes and a bopen.ai write-up. Every number here
came from a committed harness run, not an estimate.

## Why this started

Claude Code's usage panel attributed 11% of a day's usage to the bopen-tools
plugin. The same panel listed `runtime-context` at 9% and `check-version` at 1%
under a "Skills" heading, with the caveat that these are "independent
characteristics of your usage, not a breakdown."

That caveat matters. Measured cost of those two skills:

| Skill | always-on | on-invoke |
|---|---:|---:|
| `runtime-context` | 170 | 1,200 |
| `check-version` | 190 | 550 |

Neither is expensive. Their percentages reflect *sessions they were loaded in*,
not tokens they caused. Optimizing them would have won nothing. The real signal
was the plugin-level line, and the real cost is the always-on catalog.

**Lesson for the write-up:** a per-skill usage attribution that correlates with
session length will point you at whatever loads earliest, not at what costs
most. Measure the catalog directly.

## Baseline (1.1.113, 2026-07-24)

Recorded in `docs/baselines/`. From `scripts/capture-claude-context.py`:

| Component | always-on tokens | share |
|---|---:|---:|
| Agents (31) | 15,660 | 54% |
| Skills (93 entries) | 13,730 | 46% |
| **Total** | **29,260** | |

The 15 most expensive always-on components are all agents. None are skills.
Median skill is 150 tokens; `cartographer` alone is 1,100.

From `scripts/plugin-weight.py`:

- Skill descriptions: 36,635 bytes / ~9,190 tokens
- Skill identity/path floor: 7,303 bytes (~49 tokens per skill)
- Agent descriptions: 44,016 bytes / ~11,012 tokens across 81 examples
- Agent tools lists: 14,865 bytes / ~3,729 tokens
- Model-visible startup total: 102,819 bytes / ~25,705 tokens

Two host constraints behave differently and need separate treatment:

- **Claude** cost is roughly proportional to bytes, so compression pays linearly.
- **Codex** enforces a hard catalog budget: a fresh `codex exec --json` run
  stripped every description and *still* omitted 76 skills. Cardinality binds
  there, and no amount of byte-trimming fixes it. Only packs do.

## Corrections made along the way

Recording these because they were wrong first, and a post that skips them is
less useful than one that doesn't.

1. **"Agent bytes aren't measured at all."** Wrong. `plugin_inventory.py`
   already collected `agent_description_bytes`. What was missing: the markdown
   report rendered agents as a bare count, no gate covered them, and `tools:`
   was never measured. The fix was narrower than first stated.
2. **"Always-on grew 39% since July (20,984 -> 29,260)."** Wrong, and it would
   have been a bad stat to publish. `docs/plugin-context-harness.md` already
   recorded ~29,101 at 1.1.110. The 20,984 figure lives in the OPL-3181 issue
   body and was never updated. The plugin did not grow 39%; the epic text is
   stale. The 54/46 agent-vs-skill split is unaffected.

## Changes

### OPL-3209 step 1 — account for the agent catalog

The weight reporter guarded the smaller half of the problem. A CI budget gate
built on it (OPL-3196) would have passed while the agent catalog grew without
limit.

Added to `plugin_inventory.py`: `tools_metrics` and `example_count` per
resource; totals for `agent_description_chars`, `agent_tools_bytes`,
`agent_tools_estimated_tokens`, `agent_example_count`; and a combined
`model_visible_startup_bytes` / `..._estimated_tokens`.

Added to `plugin-weight.py`: a "Largest agent descriptions" table, agent lines
in the summary, and three gates — `--max-agent-description-chars`,
`--max-agent-examples`, `--max-startup-tokens`.

Tests: 17 pass, including agents with no `tools:` key reporting zero rather
than a missing field.

Against Anthropic's `plugin-dev:agent-development` guidance (descriptions
200–1,000 chars, 2–4 examples), the catalog at baseline:

| Agent | Examples | Description bytes |
|---|---:|---:|
| `cartographer` | 11 | 3,020 |
| `optimizer` | 5 | 2,543 |
| `ceo` | 4 | 2,274 |
| `trainer` | 4 | 2,067 |
| `native-desktop` | 3 | 2,048 |

Average description is ~1,420 chars — above the recommended band, with the
worst case at nearly 3× the ceiling and 11 examples where 4 is the maximum.

### OPL-3209 step 2 — compress agent frontmatter

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Agent description bytes | 44,016 | 12,053 | −73% |
| Agent `<example>` blocks | 81 | 0 | −100% |
| Agent `tools:` bytes | 14,865 | 4,527 | −70% |
| Model-visible startup tokens | ~25,705 | ~15,130 | −41% |

Descriptions keep two things: the quoted trigger phrases, and an explicit
"Not for X (use Y)" boundary. With 31 agents competing for the same requests,
the boundaries do more disambiguation work than worked examples did.

`tools:` lists collapsed enumerated `Skill(...)` grants into a single bare
`Skill`. That *widens* access rather than narrowing it — an agent listing 40
specific skills could use only those 40. Base tool scoping is untouched,
including `Bash(git:*)` and `Bash(mv:*)` restrictions. `code-auditor`,
`security-ops`, `devops`, and `payments` keep explicit lists because their
least-privilege scoping is load-bearing.

One bug worth recording: `designer.md` used JSON-array `tools:` syntax, so the
comma-splitting rewrite silently no-opped on it. Caught by diffing every
`tools:` line rather than trusting the aggregate byte count — the totals
looked fine while one file was untouched. Aggregate metrics hide per-file
failures.

## Anthropic's July 2026 guidance, and where it contradicts us

Mid-work, Anthropic published
["The new rules of context engineering for Claude 5 generation models"](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
by Thariq Shihipar. Anthropic removed **over 80% of Claude Code's own system
prompt** with "no measurable loss on our coding evaluations."

Two points land directly on this work:

**It validates dropping the examples.** The post states that giving examples
"actually constrains them to a certain exploration space," and recommends
designing better interfaces instead. That is the opposite of the
`plugin-dev:agent-development` skill we consulted, which specifies 2–4
`<example>` blocks per agent. We had already dropped all 81 examples on the
argument that boundaries disambiguate better; the newer first-party guidance
supports it. **The bundled plugin-dev guidance is now partly stale on this
point** — a live instance of our own rule about verifying fast-moving platform
guidance against current docs rather than a cached skill's snapshot.

**It challenges compression as a phase.** The headline lesson was *delete*,
not densify. A catalog covering "every known practice you might run into"
should become "a tree of files that can be loaded at the right time." Read
strictly, that argues for going straight at structure — packs and deferred
loading — rather than treating description compression as load-bearing.
Compression keeps all 31 agents permanently resident; it makes each cheaper
without asking whether each belongs.

The honest reading: compression bought a measured 41% for a few hours' work
and no install migration, which is worth having. But it is not the fix, and
the post is a good argument against declaring victory on it.

Three caveats we should not paper over:

1. Our compressed descriptions are dense with quoted trigger phrases. If the
   "examples constrain exploration" finding generalizes from behavioral
   instructions to discovery metadata, trigger-phrase stuffing may be the same
   anti-pattern in a different coat. Unresolved; the routing eval should
   settle it.
2. Anthropic's "no measurable loss" was measured on *coding evals*, not on
   routing accuracy under a 31-agent catalog. It does not retire our risk.
3. The post's remedies — model judgment, ToolSearch deferred loading,
   tree-of-files — are Claude-side capabilities. Codex's hard catalog cap has
   no such escape hatch. This is evidence the two hosts are diverging, and
   that one shared compress-then-split plan may be the wrong shape.

Also relevant to OPL-3188: the post's CLAUDE.md guidance is "keep it
lightweight, briefly describe what the repo is for, spend most of the tokens
on gotchas, avoid stating the obvious." Our CLAUDE.md is 26 KB.

## Validation

`scripts/run-agent-routing.py` records agent selection from fresh headless
Claude sessions. Three details make it work without publishing anything:

- `claude -p` runs headless and non-interactive.
- `--plugin-dir <path>` loads a plugin **from a source tree** for one session.
  No marketplace, no publish step, no restart. This is what makes a
  pre-release routing gate possible at all.
- `CLAUDE_CONFIG_DIR` pointed at a scratch directory gives a clean profile, so
  the installed copy of the plugin, project settings, and user memory cannot
  leak into the measurement.

The probe asks for a selection rather than letting delegation happen. A real
delegation runs the whole subagent — minutes and dollars per case — and would
measure the subagent's work rather than the routing decision. What is measured
is which agent the model picks when it can see the catalog and nothing else.
That is precisely the property description compression puts at risk. It is a
selection measurement, not an end-to-end delegation measurement, and the
distinction is worth keeping honest.

### Result: compression did not degrade routing, and made it steadier

Two arms over the same 30 prompts — a git worktree at `ddd7466`
(pre-compression, 81 examples) against `HEAD` (compressed, 0 examples), with
repeat samples once the first comparison proved unreliable:

| Arm | Runs | Precision | Recall | Cases unstable across runs | Median tokens/case |
|---|---:|---:|---:|---:|---:|
| Before | 2 | 100.0% | 92.6%, 85.2% | 4 / 30 | 45,729 |
| After | 3 | 100.0% | 96.3% (majority) | 2 / 30 | 32,549 |

Neither arm ever chose a forbidden agent — precision was 100% throughout. The
difference is in omissions: the verbose catalog declined to route more often,
and flipped its answer on twice as many cases between identical runs.

The single remaining omission in the compressed arm is
`ambiguous-perf-regression-source-unknown` ("the dashboard got slow this week
and I don't know why yet"), where handling it directly instead of delegating is
a defensible answer. It is marked ambiguous in the fixture for that reason.

Only three of thirty cases differed. **That difference turned out to be mostly
noise, and reading it as signal was a mistake worth recording.**

A third run of the compressed arm scored 100% precision / 92.6% recall — a
different pair of failures than the first compressed run. Comparing across all
three runs, four cases flip:

| Case | Expected | Before | After | Third run |
|---|---|---|---|---|
| `boundary-consolidator-vs-architecture` | consolidator | consolidator | consolidator | NONE |
| `boundary-database-vs-data` | database | NONE | database | database |
| `ambiguous-perf-regression-source-unknown` | optimizer | NONE | optimizer | NONE |
| `boundary-devops-vs-code-auditor` | devops | devops | agent-builder | devops |

At N=1 per arm, a one- or two-case difference on thirty cases is within
run-to-run variance. The earlier draft of this log claimed compression *fixed*
two cases the verbose catalog got wrong. It does not support that. Both arms
land in the same 92–100% band; what is defensible is that **compression did
not measurably degrade routing**, not that it improved it.

This is exactly why the native runner defaults to `runs: 3` per case. Our
runner had no `--runs` and we compared single samples — the kind of error that
looks like a result until you run it once more.

The `devops` case was different: reproducible, diagnosed, and fixed.
`agent-builder` listed "deploy this as a ClawNet bot" as a trigger, colliding
with `devops`, which owns "wire up a ClawNet bot deployment". Removing the
trigger and adding an explicit deployment boundary fixed it, and
`agent-builder`'s own case still routes correctly. The eval caught a genuine
catalog-design collision that predated this work and was latent in the verbose
descriptions too — just masked.

**End-to-end: identical prompts, identical work, 29% fewer tokens** (45,729 →
32,549 median per case) and 28% lower cost. That is the number that matters —
not the static byte count, but what a real session actually pays.

## `claude plugin eval`, and how to turn it on

Claude Code ships a plugin eval runner that would have replaced most of
`run-agent-routing.py`: `evals/**/case.yaml` or `prompt.md` + `graders/*.md`,
`--runs` for variance, `--ablation with-without` for an automatic no-plugin
baseline arm, `--judge-model` for LLM grading, and `--report` for a
self-contained HTML report. `claude plugin eval init --bare <name>` scaffolds a
case.

It refuses to run with "`plugin eval` is currently in early access". The gate
is a single predicate in the CLI bundle:

```js
function sOu(){ return Ke("tengu_walnut_spire", !1) || Z.CLAUDE_CODE_WALNUT_SPIRE }
```

So it is either a server-side feature flag or the environment variable
`CLAUDE_CODE_WALNUT_SPIRE`. Setting `CLAUDE_CODE_WALNUT_SPIRE=1` unlocks the
subcommand and the scaffolder locally. The scaffolded case format is small:

```yaml
# evals/<name>/prompt.md
---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---
# evals/<name>/graders/criteria.md
---
type: llm
weight: 1
---
```

We kept the custom runner for this pass. Exact-match on an agent name is
deterministic and free to grade; an LLM judge is neither, and for "which of 31
agents did it pick" there is nothing to judge. The native runner's
`--ablation with-without` is genuinely better than what we built, though, and
its HTML report is a better artifact. Worth migrating once the gate is not an
env-var workaround — building a release gate on an early-access flag would be
a bad trade.

The eval-authoring interview prompt that `plugin eval init` uses has been
extracted from the CLI and published by a third party,
[Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/skill-plugin-eval-authoring-interview.md).
That is an unofficial mirror, not an Anthropic release — useful for
understanding how the authoring interview frames a good eval case, but not
something to treat as a stable contract.
