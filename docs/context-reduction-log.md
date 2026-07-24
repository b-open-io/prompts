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
