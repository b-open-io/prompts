## What shipped

bopen-tools began the day as one plugin holding 31 agents, 85 skills, 14 commands, and 11 hooks. Every agent and skill puts routing metadata into the model's context at session start, on every request, whether the session uses it or not.

Three changes later — compressing that metadata, relocating resources that belonged to other plugins, and splitting the first optional module out of the monolith — the core costs less than half what it did. The numbers below are from release 1.1.120.

| Measured on the installed plugin | Before | After |
|---|---:|---:|
| bopen-tools always-on | 29,260 tok | **14,094 tok** |
| Agent catalog | 15,660 tok | 4,590 tok |
| Skills / agents in core | 94 / 31 | 83 / 28 |

A 52% reduction in what a session pays before it does anything. The orchestration module costs a further 1,112 tokens, and only for sessions that actually install it.

Every step was verified against a routing eval run before and after the change, using a runner Claude Code shipped three weeks ago and never announced.

## Agents were 54% of the cost

`scripts/capture-claude-context.py` reads Claude Code's projected component costs and splits them by kind. At the starting point the agent catalog accounted for 15,660 of 29,260 always-on tokens, and the fifteen most expensive individual components in the entire plugin were all agents. The median skill cost 150 tokens; `cartographer` alone cost 1,100.

Thirty-one agents carrying more weight than ninety-three skill entries decided the order of the work. Rewriting agent frontmatter was the single change that could move the total furthest, and it touches no packaging, no installation path, and nothing a user can invoke.

`scripts/plugin-weight.py` now measures that surface directly, reporting agent description bytes and `tools:` list bytes alongside the skill figures and summing them into one `model_visible_startup_tokens`. Gates cap per-agent description size, per-agent example count, the aggregate startup total, and duplicate resource names, so a CI budget check built on that report covers the half of the catalog that grows every time someone adds a specialist.

## Always-on versus loaded on demand

The distinction that makes this safe is where each piece of a plugin lives:

| Component | When it loads |
|---|---|
| Agent `description` | Every request, always |
| Agent body (its system prompt) | Only when that agent is invoked |
| Skill `description` | Every request, always |
| `SKILL.md` body, `references/`, `scripts/` | Only when that skill is invoked |

Progressive disclosure already covers the bodies. Both passes touched only the always-on layer. Comparing every `agents/*.md` body between the pre-compression commit and the release reports zero changed files, so each agent's domain knowledge, workflow, and documentation tables are byte-identical to what shipped before.

## 73% off the agent descriptions

Anthropic's `plugin-dev:agent-development` guidance recommends 200–1,000 characters per agent description with 2–4 worked `<example>` blocks. The catalog averaged roughly 1,420 characters, with `cartographer` at 3,020 characters and 11 examples.

| Metric | Before | After |
|---|---:|---:|
| Agent description bytes | 44,016 | 12,102 |
| Agent `<example>` blocks | 81 | 0 |
| Agent `tools:` bytes | 14,865 | 4,527 |

Every description keeps the quoted trigger phrases a request matches against, plus a boundary naming the agent it gets confused with — `code-auditor` defers dependency scanning to `security-ops`, `data` defers query tuning to `database`. With 31 agents competing to answer the same request, those boundary clauses carry the disambiguation that 81 worked examples were carrying before.

The `tools:` change widens access while cutting bytes. An agent whose frontmatter enumerated `Skill(a), Skill(b), …` for forty entries could reach exactly those forty; collapsing that to a bare `Skill` grant gives it the whole catalog for 95 bytes. Base tool scoping stayed untouched, including `Bash(git:*)`-style restrictions, and `code-auditor`, `security-ops`, `devops`, and `payments` kept explicit lists because least-privilege scoping is the point of those four.

## Why the examples came out

Anthropic's [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) reports removing over 80% of Claude Code's own system prompt with no measurable loss on their coding evaluations. The finding that applies most directly to a plugin catalog concerns examples: giving a model examples "actually constrains them to a certain exploration space." For routing metadata, a worked example costs tokens and narrows the range of phrasings the model treats as a match.

That supersedes the 2–4 example recommendation still carried in the bundled `plugin-dev:agent-development` skill, and checking current platform documentation beats treating any bundled skill's snapshot as authoritative. All 81 example blocks came out on that basis, leaving the trigger phrases and boundary clauses to carry the matching at roughly a quarter of the byte cost.

## 19% off the skill descriptions

Twenty-five authored skill descriptions were rewritten next, 15,514 characters down to 8,149 across that set. What came out was boilerplate: the "This skill should be used when the user asks to…" preamble, `Covers:` enumerations of implementation detail, consequence sentences of the "Skipping this means…" form, and trigger phrases that only paraphrased a neighbouring trigger. All of that content already lives in the `SKILL.md` body, which loads only when the skill is actually invoked.

Two constraints governed the pass. The sixteen third-party skills in `skills/` are symlinks to upstream-owned content carrying their own on-chain attestation, so the rewriter refuses to write into a symlinked directory, which makes that boundary structural. Second, every coined term survives verbatim — `claudex`, `CLIProxyAPI`, `GPT-5.6 Sol`, `SKILL-MAP`, `AGENT-MAP`, `service_auth`, `ID-JAG`, `cuelume`, `ADW`, `monkey test`. For a skill covering something outside the model's training data, the description is the entire discovery mechanism, and a dropped distinctive term cannot be recovered from what the model already knows.

## `claude plugin eval`: what it is and how to run it

Claude Code ships an eval runner for plugins. It answers the question you cannot answer by reading a diff: given a realistic user request, does the model actually reach for the thing you built? For a plugin whose whole job is routing — 31 agents and 85 skills competing to claim a request — that is the only property that matters, and description edits can break it silently.

### When it arrived

Both boundaries land on consecutive published versions, so the dating is exact.

| Version | Published | `plugin eval` | Unlockable by |
|---|---|:-:|---|
| 2.1.197 | 2026-06-30 | — | — |
| 2.1.198 | 2026-07-01 | yes | Anthropic only |
| 2.1.206 | 2026-07-09 | yes | Anthropic only |
| 2.1.207 | 2026-07-10 | yes | anyone |
| 2.1.219 | 2026-07-24 | yes | anyone |

The gate changed shape between those two dates. In 2.1.198 through 2.1.206 it reads:

```js
if (!statsigCheck("tengu_walnut_spire", false))
  error("`plugin eval` is currently in early access")
```

A server-side feature flag with no local override, so only Anthropic could turn it on. From 2.1.207 the same gate becomes:

```js
function gate() {
  return statsigCheck("tengu_walnut_spire", false) || process.env.CLAUDE_CODE_WALNUT_SPIRE
}
```

An environment variable now satisfies it, which is what makes the feature reachable outside Anthropic. Neither release announced it: the full 5,248-line public `CHANGELOG.md` mentions `plugin eval` nowhere, and searching it for "walnut" returns nothing.

One limit on that dating. This is string analysis of shipped binaries, so it captures when the code and gate appeared, not when the server flag was switched on for any particular account.

### Getting past "No eval cases found"

```bash
export CLAUDE_CODE_WALNUT_SPIRE=1
claude plugin eval .
```

On a repo with no eval suite this reports `No eval cases found`, because the runner expects a specific directory layout and creates nothing on its own. A case is a directory under `evals/`, and each case needs a prompt and at least one grader. There are two ways to express that.

**The lightweight form** is a Markdown prompt plus one grader file per check:

```
evals/
  routes-to-code-auditor/
    prompt.md
    graders/
      expected-agent.md
```

```markdown
<!-- evals/routes-to-code-auditor/prompt.md -->
---
max_turns: 1
allowed_tools: [Skill]
runs: 3
---

Audit this pull request diff for injection risks before we merge it.
Reply with only the subagent_type you would delegate to, and nothing else.
```

```markdown
<!-- evals/routes-to-code-auditor/graders/expected-agent.md -->
---
type: regex
weight: 1
pattern: '^\s*(bopen-tools:)?(code-auditor)\s*$'
---
```

`claude plugin eval init --bare <name>` scaffolds exactly this pair.

**The full form** is a single `case.yaml`, which takes the same settings under an `execution` block:

```yaml
schema_version: "1.0"          # required
name: routes-to-code-auditor   # required
execution:                     # required
  prompt: "Audit this diff for injection risks."
  max_turns: 1
  timeout_seconds: 30
  allowed_tools: [Skill]
  disallowed_tools: [Bash]
  model: haiku
  system_prompt: "be terse"
runs: 3
tags: [routing]
graders:
  - name: expected-agent       # name and type are both required
    type: regex
    weight: 1
    pattern: '^\s*code-auditor\s*$'
```

`allowed_tools` deserves attention, because getting it wrong produces a failure that looks exactly like a routing miss. Declaring `allowed_tools: []` removes the Skill tool, and with it the entire skill catalog, so the model answers that nothing applies — correctly, given what it can see. Any case measuring skill selection needs `allowed_tools: [Skill]` so the catalog is visible to the model being tested.

### The grader types

Six exist, and the required fields differ:

| `type` | Required fields | Scores by |
|---|---|---|
| `regex` | `pattern` | matching the final message |
| `tool_used` | `tool` | whether a tool was called |
| `tool_order` | `before`, `after` | relative order of two tool calls |
| `file_exists` | `path` | a file being present after the run |
| `llm` | `criteria` | a judge model's verdict |
| `baseline` | `baseline_file`, `criteria` | comparison against a recorded answer |

The first four are deterministic and cost nothing to score. For "which of 31 agents did it pick," `regex` is exact and free, and there is nothing for a judge to weigh in on. `llm` earns its cost when the answer is prose whose quality cannot be pattern-matched.

### What ablation means

`--ablation with-without` runs every case twice: once with the plugin loaded and once without it, then reports the difference. It answers whether the plugin causes the behaviour or the model would have done it anyway — the question that separates a plugin that earns its context budget from one that merely coexists with correct answers.

```bash
claude plugin eval . --runs 3 --ablation with-without --report report.html
```

The HTML that command produces is fully self-contained. [Here is the one from this run](/reports/bopen-tools-plugin-eval.html), covering all ten agent-routing cases across both arms.

Ten agent-routing cases against bopen-tools:

| Case | With plugin | Without |
|---|---:|---:|
| `boundary-code-audit-vs-security-ops` | 100% | 0% |
| `boundary-data-vs-database` | 100% | 0% |
| `boundary-database-vs-data` | 100% | 0% |
| `boundary-devops-vs-code-auditor` | 100% | 0% |
| `boundary-optimizer-vs-designer` | 100% | 0% |
| `boundary-security-ops-vs-code-audit` | 100% | 0% |
| `direct-map-clustering` | 100% | 0% |
| `direct-write-tests` | 100% | 0% |
| `negative-out-of-catalog` | 100% | 100% |
| `negative-plain-question` | 100% | 100% |

Mean delta 0.8. Every positive case depends entirely on the plugin being present, and both negative cases pass in either arm, which is the correct result — with no catalog loaded there is nothing to over-route to. Include negative cases for that reason: they are the only thing that catches a catalog which claims requests it should decline.

### Flags that matter

`--runs <n>` samples each case and is the most important of them, since a single sample per arm swings by one to two cases on a 30-case suite and will invent differences that do not exist. `--case <glob>` filters, though repeated `--case` flags do not accumulate — the last one wins. `--report <path>` writes a self-contained HTML report, `--json <path>` writes the full result, `--max-cost-usd` caps spend, and `--keep-temp` preserves each run's sandbox with a `trace.jsonl` for debugging.

## What the suite caught first

Before it measured anything about compression, the eval found four defects in our own test harness. The first skill-routing run scored 41.7% and read as a catalog-wide routing failure. It was two bugs: cases declared `allowed_tools: []`, hiding the skill catalog, and the grader regex omitted the optional `bopen-tools:` prefix that the agent graders already allowed, so a correct answer of `bopen-tools:visual-review` scored as wrong. With both defects fixed, the real uncompressed baseline came out at 83.3%, which is the number every later comparison is measured against.

A third defect: repeated `--case` flags silently run only the last glob, which made an agent regression check pass on two cases while reporting success for ten. A fourth: a case can expect a skill belonging to a *different* plugin, unreachable from the plugin under test, and that failure is indistinguishable from a routing miss. Auditing every expected skill name against the plugin's actual inventory is what surfaced it, and it should run before anyone trusts a suite's failures.

Two cases were then repaired, once their before-and-after delta had already been recorded. `skill-check-version` asked whether a publish had succeeded when the skill compares the installed version against GitHub. `skill-agent-browser` expected a skill from another plugin and became `skill-chrome-cdp`, the browser skill this plugin actually ships. Both now pass three runs out of three, and neither had anything to do with the descriptions under test.

## Results

Skill routing across 16 cases at three runs each, before and after the skill pass:

| | Before | After |
|---|---:|---:|
| Cases at full marks | 13 / 16 | 14 / 16 |
| Pass rate | 83.3% | 91.7% |
| Regressions | — | none |

`skill-remind` moved from 0% to 100%, though at three runs that swing does not separate a clearer description from ordinary variance. The claim the data supports is narrower and still useful: compression degraded nothing across sixteen cases and three runs apiece.

The full 26-case suite scores 25/26 at 98.7%, with all ten agent cases at 100%. An earlier agent-only comparison built on a custom runner had already shown precision holding at 100% across both the verbose and compressed catalogs, with identical prompts costing 29% fewer tokens.

## Splitting the monolith

Compression made each entry cheaper. It did nothing about how many entries there are, and on Codex that is the binding constraint: the skill budget is two percent of the selected model's context window — `context_window * 2 // 100`, about 5,440 tokens on a 272,000-token model — and it is shared across **every installed plugin**, not allocated per plugin. A fresh `codex exec --json` run against a catalog with every description stripped still omitted 76 skills. Only loading fewer resources moves that host.

### One repository, many plugins

The obvious fear about splitting is duplication: two repositories, two copies of shared files, and drift between them within a month. That fear turns out to be unfounded, because both marketplaces already resolve a plugin from a subdirectory of the marketplace repository.

Anthropic's own official marketplace uses a bare relative path for its first-party entries:

```json
{ "name": "agent-sdk-dev", "source": "./plugins/agent-sdk-dev" }
```

and OpenAI's Codex marketplace uses the object form:

```json
{ "name": "linear", "source": { "source": "local", "path": "./plugins/linear" } }
```

So modules became subdirectories of the same repository, each with its own Claude and Codex manifests, exactly as the root already had. Nothing is copied, so nothing can drift.

### A dependency that fails quietly

`plugin.json` accepts a `dependencies` array, documented as the plugins that must be enabled for this one to function, so declaring the core looked like the obvious way to express the relationship. The module installed correctly with it. Its skills were then invisible to any session that did not also have the core, because the loader skips a plugin whose declared dependency is missing without saying so.

The eval caught it immediately: the orchestration suite scored 0/5 against the module alone, every case reporting that no skill applied, and 5/5 with the field removed and nothing else changed. The module now ships without it. Its references to core skills are recommendations in roster documents, so it works alone and those references resolve for anyone who has both installed. Reach for `dependencies` only when a module genuinely cannot function without another plugin, and expect silence instead of an error when that plugin is absent.

The first module is `bopen-orchestration`: coordinator, advisor, orchestrator, wave-coordinator, software-factory, deploy-agent-team, claudex, and the agent-builder persona. Those coordinator-family skills cite each other by name, which made them the tightest cluster in the dependency graph and the cleanest thing to lift out first.

### Boundaries drawn from references, not taxonomy

The test for every boundary was whether someone would plausibly install one side without the other, and the evidence came from which skills and agents cite each other. `setup` is referenced by chrome-cdp, claudex, cost-tracking, create-next-project, and deploy-agent-team. `front-desk` is referenced by agent-onboarding, agent-decommissioning, and codex-agent-setup. Those two anchor the core; the coordinator family anchors orchestration.

One naming decision was load-bearing. bopen.ai already sells premium prompt packs, and the desktop app manages them, so calling plugin distributions packs would have overloaded the word across the product, the docs, and the UI. They are **modules**; `pack` stays reserved.

## Relocating what never belonged

Splitting a catalog is a good moment to notice what should not be in it at all.

| Resource | Moved to | Why |
|---|---|---|
| `clawnet-cli` | clawnet | Duplicate of a skill that plugin already shipped |
| `geo-optimizer`, `saas-launch-audit` | product-skills | Go-to-market, not developer tooling |
| `ceo`, `cfo`, `paperclip-plugin-dev` | new paperclip plugin | Organization simulation |

The clawnet case shows why. Our copy was a 2.6 KB stub against clawnet's 21 KB guide and looked like pure redundancy, but it carried three sections the larger skill lacked: the vault composition, ORDFS server-side directory traversal, and the agent `icon:` frontmatter field. Deleting it as an obvious duplicate would have quietly destroyed all three. Consolidation means reading both copies first.

`geo-optimizer` had a similar wrinkle in the other direction: it overlapped product-skills' existing `ai-seo-optimization` on AI-search optimisation, so both descriptions now name each other as boundaries and stop competing for the same request.

## What the downstream looked like

The premium prompt packs carried 886 plugin-prefixed references across 79 distinct names in 216 files, and every resource that moved invalidated its references. Rewriting them exposed rot that predated the split: `visual-recap` and `critique` had become `visual-review`, `loop-engineering` had become `software-factory`, `payment-specialist` had become `payments`, and five names carried a `bopen-tools:` prefix for skills bopen-tools never provided.

The site's own build guard caught the last mile — a pack citing a skill from a plugin missing from the install map fails the build before a broken instruction can ship. That check now has a companion that walks every `plugin:resource` reference in the repository and fails on any that names something its plugin does not provide. Two of its first three runs found bugs in the checker itself: a plugin whose repository directory does not match its name, and a regex that read `json-render-core` as a reference to `json-render`.

## What is still ahead

Eight more modules are specified and not yet built: plugin-dev, review, web, creative, mcp, ops, research, and a public-agents distribution for personas whose audience is strangers on a public surface. That last one is separated by audience, not domain, because an agent embedded in a website widget should not carry `Write` and `Bash` the way a terminal persona can.

Two relocations are blocked on uncommitted work sitting in other repositories, which is a scheduling problem and its own argument for doing this incrementally and publishing each step.
