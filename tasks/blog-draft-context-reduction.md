## What 1.1.114 changed

bopen-tools ships 31 agents, 85 skills, 14 commands, and 11 hooks. Every one of those agents and skills puts routing metadata into the model's context at session start, on every request, whether or not the session ever uses it. Release 1.1.114 cuts that standing cost by 37% and holds routing accuracy steady, verified against a 30-case eval run on both the old and new catalogs.

| Measured on the installed plugin | 1.1.113 | 1.1.114 | Delta |
|---|---:|---:|---:|
| Agent catalog | 15,660 | 4,590 | −71% |
| Skill catalog | 13,730 | 13,770 | — |
| **Always-on total** | **29,260** | **18,313** | **−37%** |

## Agents were 54% of the cost

`scripts/capture-claude-context.py` reads Claude Code's projected component costs and splits them by kind. At 1.1.113 the agent catalog accounted for 15,660 of 29,260 always-on tokens, and the fifteen most expensive individual components in the entire plugin were all agents. The median skill cost 150 tokens; `cartographer` alone cost 1,100.

That ratio decided the order of the work. Thirty-one agents carry more weight than ninety-three skill entries, so rewriting agent frontmatter was the single change that could move the total furthest, and it touches no packaging, no installation path, and nothing a user can invoke.

`scripts/plugin-weight.py` now measures that surface directly. It reports agent description bytes and `tools:` list bytes alongside the skill figures, counts the `<example>` blocks in each description, and sums everything into a single `model_visible_startup_tokens`. Gates cap per-agent description size, per-agent example count, the aggregate startup total, and duplicate resource names across the catalog. Any CI budget check built on that report now covers both halves of the plugin, including the half that grows every time someone adds a specialist.

## 73% off the descriptions

Anthropic's `plugin-dev:agent-development` guidance recommends 200–1,000 characters per agent description with 2–4 worked `<example>` blocks. The baseline catalog averaged roughly 1,420 characters, with the largest entries carrying far more:

| Agent | Examples | Description bytes |
|---|---:|---:|
| `cartographer` | 11 | 3,020 |
| `optimizer` | 5 | 2,543 |
| `ceo` | 4 | 2,274 |
| `trainer` | 4 | 2,067 |
| `native-desktop` | 3 | 2,048 |

Every description now keeps the quoted trigger phrases a request matches against, plus an explicit boundary naming the agent it gets confused with — `code-auditor` defers dependency scanning to `security-ops`, `data` defers query tuning to `database`. With 31 agents competing to answer the same request, those boundary clauses carry the disambiguation that 81 worked examples were carrying before.

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Agent description bytes | 44,016 | 12,102 | −73% |
| Agent `<example>` blocks | 81 | 0 | −100% |
| Agent `tools:` bytes | 14,865 | 4,527 | −70% |
| Model-visible startup tokens | ~25,705 | ~15,142 | −41% |

The `tools:` change widens access while cutting bytes. An agent whose frontmatter enumerated `Skill(a), Skill(b), …` for forty entries could reach exactly those forty; collapsing that to a bare `Skill` grant gives it the whole catalog for 95 bytes. Base tool scoping stayed untouched, including `Bash(git:*)`-style restrictions, and `code-auditor`, `security-ops`, `devops`, and `payments` kept their explicit lists because least-privilege scoping is load-bearing for those four.

## Why the examples came out

Anthropic's [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) reports removing over 80% of Claude Code's own system prompt with no measurable loss on their coding evaluations. The finding that applies most directly to a plugin catalog is about examples: giving a model examples "actually constrains them to a certain exploration space." For routing metadata, a worked example both costs tokens and narrows the range of phrasings the model treats as a match.

That supersedes the 2–4 example recommendation still carried in the bundled `plugin-dev:agent-development` skill, and it is worth checking current platform documentation before treating any bundled skill's snapshot as authoritative. All 81 example blocks came out on that basis, leaving the trigger phrases and boundary clauses to carry the matching work at roughly a quarter of the byte cost.

The same post makes a second argument that compression does not satisfy. It calls for progressive disclosure: a catalog covering "every known practice you might run into" should become "a tree of files that can be loaded at the right time." Shortening 31 agent descriptions makes each one cheaper to keep resident and does nothing about how many stay resident, which is the structural problem described at the end of this post.

## Testing a plugin before it ships

Routing accuracy is what description compression puts at risk, so it needed measuring before release. Two flags on the Claude Code CLI make that possible without publishing anything: `claude -p` runs a session headless and non-interactive, one process per case, and `--plugin-dir <path>` loads a plugin straight from a source tree for that session, with no marketplace entry and no restart. Pointing `CLAUDE_CONFIG_DIR` at a scratch directory adds a clean profile per run, keeping the installed copy of the plugin and any project settings out of the measurement.

Together those let a git worktree at an old commit and the current working tree run the identical 30-case suite against identical prompts, which is what makes a before-and-after comparison meaningful. `scripts/run-agent-routing.py` wraps the loop, samples each case, and writes JSONL that the existing precision-and-recall scorer reads without modification.

The probe asks the model which agent it would delegate to and stops there. Letting the delegation proceed would run the full subagent, folding its output quality into a measurement meant to capture the selection decision, at a cost of minutes and dollars for every case in the suite.

## Routing held at 100% precision

The eval covers 30 cases across four kinds: direct requests with an obvious owner, boundary pairs where two agents plausibly compete, ambiguous requests with several defensible answers, and negative cases where no agent should be selected at all. Every boundary case targets a pair whose descriptions name each other in a boundary clause, so a failure there points at the exact wording that stopped disambiguating.

| Arm | Runs | Precision | Recall | Cases unstable across runs | Median tokens/case |
|---|---:|---:|---:|---:|---:|
| Verbose descriptions | 2 | 100.0% | 92.6%, 85.2% | 4 / 30 | 45,729 |
| Compressed descriptions | 3 | 100.0% | 96.3% (majority) | 2 / 30 | 32,549 |

Precision held at 100% in every run on both catalogs, meaning the model never selected an agent the case marked forbidden. The compressed catalog also flipped its answer on half as many cases between otherwise identical runs, which is the more useful signal for anyone tuning a large agent roster.

Run-to-run variance turned out to be large enough to matter. A single sample per arm produced a one-to-two case difference on a 30-case suite, well inside the noise floor, so the runner now takes `--runs` and scores by majority vote — the same default Claude Code's own eval tooling uses. Any comparison of two catalogs on a suite this size needs repeat sampling before its numbers mean anything.

The suite also caught a trigger collision that compression did not introduce. `agent-builder` listed "deploy this as a ClawNet bot" among its triggers, competing directly with `devops` and its "wire up a ClawNet bot deployment" trigger. Removing the trigger and adding an explicit deployment boundary fixed the case reproducibly across subsequent runs, and separating that real failure from the surrounding variance is exactly what repeat sampling is for.

## 29% fewer tokens on identical work

Byte counts describe the catalog; what a session pays is measured per request. Running the same 30 prompts against both catalogs moved the median from 45,729 tokens per case down to 32,549, a 29% reduction, with total run cost across the suite falling 28%.

## The native eval runner and its feature flag

Claude Code ships a native plugin eval runner that covers most of what `run-agent-routing.py` does: `case.yaml` or `prompt.md` plus grader files, `--runs` for variance sampling, `--ablation with-without` for an automatic no-plugin baseline arm, and a self-contained HTML report. It declines to run with "`plugin eval` is currently in early access", gated by one predicate in the CLI bundle:

```js
function sOu(){ return Ke("tengu_walnut_spire",!1) || Z.CLAUDE_CODE_WALNUT_SPIRE }
```

Setting `CLAUDE_CODE_WALNUT_SPIRE=1` unlocks the subcommand and its `init --bare` scaffolder locally. We kept the custom runner for this release because exact-match on an agent name grades deterministically and for free, and because a release gate that depends on an early-access flag is worth avoiding until the flag goes away. The `--ablation` arm is a better piece of engineering than anything we built and is worth migrating to once that happens.

One attribution to get right: the eval-authoring interview prompt that `plugin eval init` uses has been extracted from the CLI and published at [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/skill-plugin-eval-authoring-interview.md). That repository is a third-party mirror with no affiliation to Anthropic, useful for understanding how the tool frames a good eval case.

## Where the remaining weight sits

The skill catalog is untouched at 13,770 tokens and is the obvious next target, with 36,635 bytes of descriptions across 85 skills and a floor of roughly 49 tokens per skill for identity and path alone. Compression can reach the description bytes there the same way it reached the agent descriptions.

Codex needs the structural fix. It enforces a hard ceiling on catalog size independent of description length: a fresh `codex exec --json` run against a catalog with every description stripped still omitted 76 skills. Cardinality is the binding constraint on that host, so the only thing that moves it is reducing how many resources load by default — splitting the monolith into a small resident core plus optional domain packs that install on their own.

That split is specified in an architecture RFC and not yet built. What exists now is the tooling it needs to land safely: a weight report that covers both halves of the catalog with budget gates attached, and a routing suite that can score any candidate change against the current release before it ships.
