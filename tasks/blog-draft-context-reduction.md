## The Panel Pointed at the Wrong Skill

Claude Code's usage panel told us 11% of a day's usage came from the bopen-tools plugin. Underneath that number sat a per-skill breakdown, and it named `runtime-context` at 9% and `check-version` at 1%, with a caveat attached: these are "independent characteristics of your usage, not a breakdown."

We measured the two named skills directly. `runtime-context` costs 170 always-on tokens and 1,200 on invocation. `check-version` costs 190 always-on and 550 on invocation. Neither is expensive by any reasonable measure, and optimizing either would have won nothing worth the afternoon it would have cost.

The panel's percentage tracks sessions a skill was loaded in, correlated against session length. That statistic points at whatever loads earliest in a session; it says nothing about which tokens actually cost the most. If we had trusted the breakdown, we would have spent the afternoon shaving 170-token skills, and the real cost would have sat untouched one layer up, in the plugin's agent catalog.

## Measuring the Catalog Directly

`scripts/capture-claude-context.py` measures the model-visible startup cost directly instead of inferring it from session correlation. At 1.1.113, bopen-tools cost 29,260 always-on tokens:

| Component | Always-on tokens | Share |
|---|---:|---:|
| Agents (31) | 15,660 | 54% |
| Skills (93 entries) | 13,730 | 46% |
| **Total** | **29,260** | |

Thirty-one agents against ninety-three skill entries — a third of the catalog by count, carrying more than half the weight. The 15 most expensive individual components in the whole plugin were all agents. None were skills. The existing remediation plan, written before this measurement existed, had agent work sequenced last, behind two waves of skill-packaging changes that would have touched the smaller half of the problem first.

## The Tool Was Blind in One Eye

`plugin_inventory.py` already collected `agent_description_bytes` per resource, so the claim that agent cost went unmeasured turns out to be wrong. What actually happened: the markdown report rendered agents as a bare count, "Agents: 31," with no size breakdown next to it, and `tools:` list weight was never measured at all. A CI budget gate built on that report, the kind OPL-3196 was heading toward, would have passed indefinitely as the agent catalog grew, because nothing in the report's numbers would have moved.

The fix landed in `plugin_inventory.py` and `plugin-weight.py`: per-resource `tools_metrics` and `example_count`, catalog totals for `agent_description_chars`, `agent_tools_bytes`, and `agent_example_count`, a combined `model_visible_startup_bytes`/`estimated_tokens` figure, and three new gates — `--max-agent-description-chars`, `--max-agent-examples`, `--max-startup-tokens`. One of the new tests covers the case that would have hidden the problem again: an agent with no `tools:` key at all has to report a zero count rather than a missing field.

## Descriptions Ran Three Times Anthropic's Own Guidance

Anthropic's `plugin-dev:agent-development` skill recommends 200-1,000 characters per agent description and 2-4 worked `<example>` blocks. Measured against the baseline catalog:

| Agent | Examples | Description bytes |
|---|---:|---:|
| `cartographer` | 11 | 3,020 |
| `optimizer` | 5 | 2,543 |
| `ceo` | 4 | 2,274 |
| `trainer` | 4 | 2,067 |
| `native-desktop` | 3 | 2,048 |

The catalog average was roughly 1,420 characters, already outside the recommended band. The single worst case, `cartographer`, ran nearly three times the byte ceiling and carried 11 examples against a guidance cap of four.

## The Compression

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Agent description bytes | 44,016 | 12,102 | −73% |
| Agent `<example>` blocks | 81 | 0 | −100% |
| Agent `tools:` bytes | 14,865 | 4,527 | −70% |
| Model-visible startup tokens | ~25,705 | ~15,142 | −41% |

Every description kept two things: the quoted trigger phrases a request would match against, and an explicit "not for X, use Y" boundary against the agents it gets confused with most. With 31 agents competing to answer the same request, the boundary clause turned out to carry more disambiguating weight than a worked example ever did.

The `tools:` change is worth spelling out because it runs against intuition. Collapsing an enumerated `Skill(a, b, c, ...)` grant down to a bare `Skill` grant widens access. An agent that previously listed 40 specific skills could only reach those 40; now it can reach the whole catalog. Base tool scoping was left alone, including `Bash(git:*)`-style restrictions, and four agents kept their explicit lists on purpose — `code-auditor`, `security-ops`, `devops`, and `payments` — because least-privilege scoping is the point of the agent.

One bug from this pass is worth recording on its own. `designer.md` used JSON-array syntax for its `tools:` field, so the comma-splitting rewrite silently no-opped on that one file. Every other agent compressed correctly, which is exactly how the failure hid inside a byte count that looked perfectly healthy across all thirty-one files. It surfaced only once every individual `tools:` line was diffed against source, which is far more reliable than trusting a single aggregate byte count.

## A Contradiction We're Not Going to Resolve in Our Favor

Partway through this work, Anthropic published [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models). They cut over 80% of Claude Code's own system prompt with no measurable loss on their coding evaluations, and stated that giving a model examples "actually constrains them to a certain exploration space."

That validates the decision to drop all 81 `<example>` blocks. It also makes the bundled `plugin-dev:agent-development` guidance we'd consulted — 2-4 examples per agent — partly stale on this specific point, which is its own small proof of a rule we already tell ourselves: verify fast-moving platform guidance against current docs before trusting a cached skill's snapshot.

But the same post argues for something we didn't do. Its framing calls for deletion: a catalog covering "every known practice you might run into" should become "a tree of files loaded at the right time." Read that way, the honest move was to go straight at structure — split the monolith, defer what isn't needed at startup. Compression keeps all 31 agents permanently resident and makes each one cheaper without asking whether it belongs at all.

Compression bought a measured 41% reduction for a few hours of work and no install migration required, which is real and worth having, even though it is not the fix the post is describing.

Two caveats sit unresolved past what the routing eval below could settle. Our compressed descriptions are dense with quoted trigger phrases, and if "examples constrain exploration" generalizes from behavioral instructions to discovery metadata, trigger-phrase stuffing may turn out to be the same anti-pattern wearing a different coat — the eval wasn't designed to test that specific question, so it stays open. Anthropic's "no measurable loss" claim was measured against coding evals only; it says nothing about routing accuracy across a 31-agent catalog, so it doesn't retire our risk.

## Testing a Plugin Before It's Published

`scripts/run-agent-routing.py` runs headless Claude sessions with `claude -p`, non-interactive, one process per test case. Two flags make it possible to validate a plugin that hasn't shipped anywhere: `--plugin-dir` loads a plugin straight from a source tree for that one session, with no marketplace step and no restart, and pointing `CLAUDE_CONFIG_DIR` at a scratch directory gives each run a clean profile so the already-installed plugin, project settings, and user memory can't leak into the result.

The probe asks the model only for a selection, stopping short of an actual delegation. A real delegation runs the whole subagent, which costs minutes and dollars per case and folds the subagent's own output quality into the measurement, obscuring the routing decision itself. What gets measured is which agent name the model picks when it can see the catalog and nothing else — exactly the property description compression puts at risk.

## The Mistake Worth Publishing

The first before/after comparison ran one sample per arm and looked like compression had *improved* routing accuracy. One more run of the same comparison took that result apart.

| Arm | Runs | Precision | Recall | Cases unstable across runs | Median tokens/case |
|---|---:|---:|---:|---:|---:|
| Before (verbose) | 2 | 100.0% | 92.6%, 85.2% | 4 / 30 | 45,729 |
| After (compressed) | 3 | 100.0% | 96.3% (majority) | 2 / 30 | 32,549 |

Precision held at 100% in both arms across every run — the model never once picked a forbidden agent, verbose or compressed. A third run of the compressed arm scored 100% precision and 92.6% recall, a different pair of misses than the first compressed run produced. Comparing all three runs together, four cases flip:

| Case | Expected | Verbose | Compressed | Compressed, third run |
|---|---|---|---|---|
| `boundary-consolidator-vs-architecture` | consolidator | consolidator | consolidator | NONE |
| `boundary-database-vs-data` | database | NONE | database | database |
| `ambiguous-perf-regression-source-unknown` | optimizer | NONE | optimizer | NONE |
| `boundary-devops-vs-code-auditor` | devops | devops | agent-builder | devops |

The last row is not a variance result. That case failed reproducibly, we fixed the cause, and the third run was recorded after the fix — it belongs in the table because it looked identical to the noise until we chased it.

At one sample per arm, a one- or two-case swing across thirty cases sits inside ordinary run-to-run noise. An earlier draft of our internal log claimed compression fixed two cases the verbose catalog got wrong; the third run alone disproves that. What holds up is narrower and still useful: compression did not measurably degrade routing, and it produced fewer unstable cases across repeat runs than the verbose catalog did.

The fix for the runner itself was to add `--runs` and score by majority vote, matching what Claude Code's own native eval tooling defaults to. Comparing single samples on a 30-case set is exactly the kind of measurement that manufactures a result out of noise, and we'd already done it once before catching it.

One case in the table above is a genuine, reproducible bug. `agent-builder` listed "deploy this as a ClawNet bot" as a trigger phrase, which collides with `devops`, the agent that owns ClawNet bot deployment. Removing that trigger and adding an explicit deployment boundary fixed the case reproducibly, and `agent-builder`'s own routing case still passes. The collision predated this work and was already present in the verbose descriptions, but it took multiple runs to surface it — a single comparison would have read it as ordinary noise and moved on.

The number that matters most from this pass is what a real session pays for identical prompts and identical work: 29% fewer tokens (45,729 to 32,549 median per case) and 28% lower cost.

## `claude plugin eval` Exists, and It's Gated

Claude Code ships a native plugin eval runner that would have replaced most of `run-agent-routing.py` on its own: `case.yaml` or `prompt.md` plus grader files, `--runs` for variance sampling, `--ablation with-without` for an automatic no-plugin baseline arm, and an HTML report. It refuses to run today, gated by a single predicate in the CLI bundle:

```js
function sOu(){ return Ke("tengu_walnut_spire",!1) || Z.CLAUDE_CODE_WALNUT_SPIRE }
```

Setting `CLAUDE_CODE_WALNUT_SPIRE=1` unlocks the subcommand and its scaffolder locally, which is how we exercised it enough to decide against depending on it for this release.

We kept the custom runner for this release regardless, for a specific reason: exact-match on an agent name is deterministic and free to grade. The native tool's LLM-judge path is neither, and there's nothing for a judge to weigh in on when the question is which of 31 agent names got returned. `--ablation with-without` is a genuinely better feature than anything we built, and building a release gate today on a flag that requires an environment-variable override would still be a bad trade for a plugin meant to ship reliably.

One attribution to get right: the eval-authoring interview prompt that `plugin eval init` uses has been extracted from the CLI and published by a third party, [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/skill-plugin-eval-authoring-interview.md). It's an unofficial mirror, useful for understanding how the tool frames a good eval case, and despite reading like first-party documentation, it did not come from Anthropic — Piebald-AI extracted and published it independently.

## Shipped

Released as bopen-tools 1.1.114. Installed measurement: always-on tokens fell from 29,260 to 18,313, a 37% reduction, with the agent catalog's own always-on cost down 71%. The static model-visible surface that `plugin-weight.py` reports from source fell from ~25,705 to ~15,142 tokens, matching the same direction from a second, independent measurement path.

## What's Still Open

Compression makes 31 agents cheaper. It doesn't ask whether all 31 belong in a catalog every session loads in full. The structural fix Anthropic's own post argues for — a small resident core plus optional packs loaded on demand — is the work still in front of us, not yet started even in draft form.

Codex makes that structural work mandatory. It enforces a hard limit on catalog size regardless of description length: a fresh `codex exec --json` run against the fully stripped catalog still omitted 76 skills.

No amount of trimming a description fixes a cardinality problem. Only reducing how many resources load by default can fix that. The pack boundaries are drafted in an architecture RFC and the migration is tracked, but nothing is built yet, and the honest status is that the cheap half of this problem is done and the structural half is not.
