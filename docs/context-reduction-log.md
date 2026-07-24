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

## Validation status

Not yet validated. `benchmarks/fixtures/agent-routing-cases.json` holds 30
cases — direct, boundary, ambiguous, and negative — where every boundary case
targets a pair of agents whose descriptions carry an explicit "not for X"
clause. Recording results needs fresh Claude and Codex sessions, which
OPL-3193 owns. No version bump has shipped; the release waits on that run.
