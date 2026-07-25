> **Superseded.** The published version lives in `bopen-ai` at
> `src/data/posts.ts` (slug `plugin-context-reduction`). Figures below
> predate the plugin rename: re-measured on the installed 1.1.128, core is
> 2,498 always-on tokens and all ten distributions together are 13,174.
> Names in this file were machine-rewritten by the rename sweep and read
> awkwardly in places. Do not quote it.

# The Catalog Tax

**Style model: Joel Spolsky (Joel on Software).** Draft for comparison against
the published `plugin-context-reduction` post. Same facts, same numbers, same
sections of substance — restructured around a single argument, in the voice of a
writer who made engineering blogs worth reading.

---

## The Catalog Tax

### Every request pays for the whole toolbox. Here is what happened when we stopped charging ours.

Open a plugin's manifest and you will find two kinds of writing in it. There is
the part that does the work — the agent's system prompt, the skill's
instructions, the reference files, the scripts. And there is the one-line
description that tells the model this thing exists.

The working part is free until you use it. The description is not. Every agent
description and every skill description goes into the model's context at the
start of every session, and stays there for every request in it, whether that
session ever touches the thing or not.

That is the catalog tax. It scales with the size of your catalog,
and nobody sends you a bill for it. You find out when your session
gets shorter.

core is our developer toolkit: 31 agents, 85 skills, 14 commands, 11
hooks. Yesterday morning its catalog charged **29,260 tokens** before a session
did anything at all. By that evening the core charged **2,797**, with the rest of
the capability sitting in nine modules you install only if you want them.

| Measured on the installed plugins | Tokens |
|---|---:|
| core, before | 29,260 |
| core core, after | **2,797** |
| All nine modules as well | 13,466 |

Ninety percent, in a day, with every capability still shipping. Here is how, and
which parts of it will transfer to whatever you have built.

## First, find out who is actually eating

Everybody assumes it is the skills. Skills are the thing you write a lot of, they
have the big folders, they have the scripts and the reference files. So that is
where you look.

`scripts/capture-claude-context.py` reads Claude Code's projected component costs
and splits them by kind, and the answer was agents. Agents were 15,660 of the
29,260 always-on tokens — 54% of the tax, from 31 files. The fifteen most
expensive individual components in the entire plugin were all agents. The median
skill description cost 150 tokens. One agent, `cartographer`, cost 1,100 all by
itself.

This is worth internalising before you touch anything, because it decides the
order of the work. Rewriting agent frontmatter was the change that could move the
total furthest, and it touches no packaging, no install path, no marketplace
entry, and nothing a user can invoke.

So we now measure it. `scripts/plugin-weight.py` reports agent description bytes
and `tools:` list bytes next to the skill figures and sums them into one
`model_visible_startup_tokens`, with gates on per-agent description size, example
count, the aggregate total, and duplicate names. Any catalog that grows every
time somebody adds a specialist needs that number in CI, because the growth is
individually reasonable and collectively expensive.

## The 81 examples

Anthropic's own `plugin-dev:agent-development` guidance recommends 200–1,000
characters per agent description, with two to four worked `<example>` blocks
showing when to trigger. Our catalog averaged about 1,420 characters.
`cartographer` carried 3,020 characters and eleven examples.

We took all 81 example blocks out. Every one.

| Metric | Before | After |
|---|---:|---:|
| Agent description bytes | 44,016 | 12,102 |
| Agent `<example>` blocks | 81 | 0 |
| Agent `tools:` bytes | 14,865 | 4,527 |

The reason comes from Anthropic's [new rules of context engineering for Claude 5
generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models),
where they report cutting over 80% of Claude Code's own system prompt with no
measurable loss on their coding evaluations. The line that matters for a plugin
catalog is about examples: giving a model examples "actually constrains them to a
certain exploration space."

Read that again with routing in mind. An example costs tokens and it tells the
model *this shape of request*, narrowing the range of phrasings it will treat as
a match. For a description whose entire job is "recognise when
somebody is asking for this," that is the opposite of what you want.

So the guidance in the bundled skill is superseded by the platform's own current
writing, which is a good general lesson: a skill's snapshot of a fast-moving API
is a snapshot, and the live docs win.

What stayed in every description is the quoted trigger phrases, plus a boundary
clause naming the neighbour it gets confused with. `code-auditor` defers
dependency scanning to `security-ops`. `data` defers query tuning to `database`.
With 31 agents competing to answer the same request, those clauses carry the
disambiguation the 81 examples were carrying, at roughly a quarter of the bytes.

The `tools:` line is the free lunch of the whole exercise. An agent whose
frontmatter enumerated `Skill(a), Skill(b), …` across forty entries could reach
exactly those forty. Collapse it to a bare `Skill` grant and it reaches the
entire catalog for 95 bytes — wider access, smaller bill. Base tool scoping
stayed exactly as it was, `Bash(git:*)` restrictions included, and four agents
kept their explicit lists because least privilege is the entire point of
`code-auditor`, `security-ops`, `devops`, and `payments`.

The skills got a lighter pass: 25 authored descriptions, 15,514 characters down
to 8,149. What came out was preamble — "This skill should be used when the user
asks to…", `Covers:` enumerations of implementation detail, and trigger phrases
that paraphrased the trigger phrase next to them. All of it already lives in the
`SKILL.md` body, which loads when the skill is invoked and not before.

Two rules governed that pass and both are worth stealing. The sixteen third-party
skills are symlinks to upstream-owned content with their own on-chain
attestation, so the rewriter refuses to write into a symlinked directory, which
puts that boundary in the tool instead of in somebody's memory. And every coined term survives
verbatim — `claudex`, `CLIProxyAPI`, `GPT-5.6 Sol`, `SKILL-MAP`, `service_auth`,
`ID-JAG`, `cuelume`, `ADW`, `monkey test`. For anything outside the model's
training data, the description is the whole discovery mechanism, and a dropped
term cannot be recovered from what the model already knows.

## Now prove you did not break it

Here is the uncomfortable thing about editing routing metadata: you cannot review
it. You can read the diff all day. The diff will look fine. The only question
that matters is whether a real request still reaches the right agent, and reading
cannot answer it.

Claude Code has shipped a tool for exactly this since July, and as far as we can
tell nobody has written about it.

```bash
export CLAUDE_CODE_WALNUT_SPIRE=1
claude plugin eval .
```

### When it arrived

We pulled the published versions apart. Two boundaries, on consecutive releases,
which is as tight as this kind of dating gets.

| Version | Published | `plugin eval` | Unlockable by |
|---|---|:-:|---|
| 2.1.197 | 2026-06-30 | — | — |
| 2.1.198 | 2026-07-01 | yes | Anthropic only |
| 2.1.206 | 2026-07-09 | yes | Anthropic only |
| 2.1.207 | 2026-07-10 | yes | anyone |
| 2.1.219 | 2026-07-24 | yes | anyone |

In 2.1.198 the gate is a server-side flag with no local override:

```js
if (!statsigCheck("tengu_walnut_spire", false))
  error("`plugin eval` is currently in early access")
```

From 2.1.207 an environment variable satisfies the same gate:

```js
function gate() {
  return statsigCheck("tengu_walnut_spire", false) || process.env.CLAUDE_CODE_WALNUT_SPIRE
}
```

Neither release said a word. The public `CHANGELOG.md` runs 5,248 lines and
mentions `plugin eval` nowhere; searching it for "walnut" returns nothing. One
honest limit on the dating: this is string analysis of shipped binaries, so it
tells you when the code and the gate appeared, and not when the flag was switched
on for any particular account.

### Getting past "No eval cases found"

Run it on a repo with no suite and it says `No eval cases found`, because it
expects a directory layout and creates nothing for you. A case is a directory
under `evals/` holding a prompt and at least one grader, and there are two ways
to write one.

**The lightweight form** is a Markdown prompt plus a grader file per check:

```
evals/
  routes-to-code-auditor/
    prompt.md
    graders/
      expected-agent.md
```

```markdown
<!-- prompt.md -->
---
max_turns: 1
allowed_tools: [Skill]
runs: 3
---

Audit this pull request diff for injection risks before we merge it.
Reply with only the subagent_type you would delegate to, and nothing else.
```

```markdown
<!-- graders/expected-agent.md -->
---
type: regex
weight: 1
pattern: '^\s*(core:)?(code-auditor)\s*$'
---
```

`claude plugin eval init --bare <name>` scaffolds that pair, which is the fastest
way to see the shape.

**The full form** is one `case.yaml` with the same settings under `execution`:

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

### The graders

Six types, with different required fields:

| `type` | Required fields | Scores by |
|---|---|---|
| `regex` | `pattern` | matching the final message |
| `tool_used` | `tool` | whether a tool was called |
| `tool_order` | `before`, `after` | relative order of two tool calls |
| `file_exists` | `path` | a file being present after the run |
| `llm` | `criteria` | a judge model's verdict |
| `baseline` | `baseline_file`, `criteria` | comparison against a recorded answer |

The first four are deterministic and free to score. For "which of 31 agents did
it pick," `regex` is exact and there is nothing for a judge to weigh in on. The
`llm` grader earns its cost when the answer is prose no pattern can capture, like
whether a generated README actually explains the install step.

### Ablation, and why you want it

`--ablation with-without` runs every case twice, once with your plugin loaded and
once without, then reports the difference. It answers the question that separates
a plugin earning its context budget from one that merely coexists with correct
answers: did *you* cause this, or would the model have got there anyway?

```bash
claude plugin eval . --runs 3 --ablation with-without --report report.html
```

That HTML is fully self-contained. [Here is ours](/reports/bopen-tools-plugin-eval.html),
covering all ten agent-routing cases in both arms.

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

Mean delta 0.8. Every positive case depends entirely on the plugin being there,
and both negative cases pass in either arm, which is the result you want — with
no catalog loaded there is nothing to over-route to. Write negative cases for
that reason. They are the only thing that catches a catalog claiming requests it
should decline.

### Three ways to get a red result that means nothing

Set `allowed_tools: []` and you remove the Skill tool, and with it the entire
skill catalog. The model answers that nothing applies, which is correct given
what it can see, and looks precisely like a catalog that cannot route. Anything
measuring skill selection needs `allowed_tools: [Skill]`.

Write a grader pattern without the plugin prefix and a correct answer scores as a
miss: you asked for `visual-review` and the model said
`review:visual-review`. Make the prefix optional.

Name a resource that its target plugin does not contain — easy when resources
move between distributions — and the run reports a routing miss where a load error would have told you why.
Audit expected names against the real inventory before the run.

And one on the CLI itself, which is the sort of thing you find at 2am: repeated
`--case` flags do not accumulate. The last glob wins. A run that looks like it
covered ten cases may have covered two.

### The flags

`--runs <n>` is the one that matters. A single sample per arm swings by one to
two cases on a 30-case suite and will invent a difference that is not there.
`--case <glob>` filters, with the accumulation caveat above. `--report <path>`
writes the HTML, `--json <path>` the full result, `--max-cost-usd` caps spend, and
`--keep-temp` preserves each run's sandbox with a `trace.jsonl` for debugging.

### What it said

Skill routing across 16 cases, three runs each, before and after the skill pass:

| | Before | After |
|---|---:|---:|
| Cases at full marks | 13 / 16 | 14 / 16 |
| Pass rate | 83.3% | 91.7% |
| Regressions | — | none |

`skill-remind` went from 0% to 100%, though at three runs that swing does not
separate a clearer description from ordinary variance, and we are not going to
claim it does. The claim the data supports is narrower and enough: compression
degraded nothing across sixteen cases and three runs apiece. The full 26-case
suite scores 25/26 at 98.7%, all ten agent cases at 100%, and an earlier
comparison on a custom runner had precision holding at 100% across both the
verbose and the compressed catalogs while identical prompts cost 29% fewer
tokens.

## Cheaper entries, or fewer of them

Compression makes each entry cost less. It does nothing about how many entries
there are, and there is a host where that is the binding constraint.

Codex allocates roughly two percent of the selected model's context window to
skills — about 5,440 tokens on a 272,000-token model — and that budget is shared
across **every installed plugin**, not handed out per plugin. A fresh
`codex exec --json` run against a catalog with every description stripped still
omitted 76 skills. On that host the only lever is loading fewer resources, which
is what turned a compression exercise into a packaging one.

### You do not need a second repository

The fear about splitting is duplication: two repos, two copies of the shared
files, drift inside a month. It is unfounded, because both marketplaces already
resolve a plugin from a subdirectory of the marketplace repo. Anthropic's own
official marketplace uses a bare relative path for its first-party entries, and
OpenAI's Codex marketplace uses an object form doing the same job:

```json
{ "name": "agent-sdk-dev", "source": "./plugins/agent-sdk-dev" }
{ "name": "linear", "source": { "source": "local", "path": "./plugins/linear" } }
```

So the modules are subdirectories of the same repository, each with its own
Claude and Codex manifests. Nothing is copied between core and modules, so
nothing can drift.

| Module | Always-on |
|---|---:|
| core (core) | 2,797 |
| web | 1,864 |
| creative | 1,649 |
| plugin-dev | 1,562 |
| review | 1,412 |
| ops | 1,375 |
| research | 1,191 |
| orchestration | 1,112 |
| mcp | 378 |
| public-agents | 126 |

Boundaries came from the reference graph. `setup` is
cited by six other skills and `front-desk` by three, which anchored the core. The
coordinator family cites itself, which made orchestration the obvious first
extraction. The test for every boundary was whether somebody would plausibly
install one side without the other.

Two things stayed in core for a reason that has nothing to do with the catalog:
Agent Master bundles `setup` and `visual-wayfinder` into the signed desktop app
and resolves them at `skills/<name>`, so moving either would have broken a
shipped binary. `public-agents` split on audience instead — its personas answer
strangers on a public surface, which justifies a tighter tool policy than a
developer distribution can express.

### The field that fails quietly

`plugin.json` accepts a `dependencies` array, documented as the plugins that must
be enabled for this one to function. Declaring the core looked like the obvious
way to say "this module expects core."

The module installs fine with it. Its skills are then invisible to any session
that does not also have the core, because the loader skips a plugin whose
declared dependency is missing and says nothing about it.

The eval found this in one run: the orchestration suite scored 0/5 against the
module alone, every case reporting that no skill applied, and 5/5 with the field
removed and nothing else touched. Reach for `dependencies` only when a module
genuinely cannot function without another plugin, and expect silence when that plugin is
absent.

### What moves with an agent

Relocating an agent moves more than one file, and the parts Claude ignores are
the parts Codex depends on. Each agent carries an `agents/<name>/AGENTS.md`
symlink pointing at `../<name>.md`, so every relocation needs its link
re-pointed. Codex resolves custom agents from generated `.toml` adapters, and a
generator written for one flat `agents/` directory has to learn the new layout
before it emits anything for the 26 agents that now live in modules. Third-party
skills are symlinks too, each needing a target adjusted for the extra depth so
vendor ownership survives.

Treat those as part of the move. Ours now scans every module, all 29 adapters
regenerate clean, and a scratch install resolves the curated roster across core
and modules.

## What was never ours to begin with

Splitting a catalog is a good moment to notice what should not be in it at all.

| Resource | Moved to | Why |
|---|---|---|
| `clawnet-cli` | clawnet | Duplicate of a skill that plugin already shipped |
| `geo-optimizer`, `saas-launch-audit` | product-skills | Go-to-market, not developer tooling |
| `ceo`, `cfo`, `paperclip-plugin-dev` | new paperclip plugin | Organization simulation |

The clawnet one is the instructive case. Two skills shared a name across two
plugins — a 21 KB workflow guide and a 2.6 KB reference — and the small one
documented vault composition, ORDFS server-side directory traversal, and the
agent `icon:` frontmatter field that the big one did not cover. Those sections
moved upstream before the duplicate came out. Consolidating two copies of
anything means reading both, which is slower than comparing byte counts and the
only way to keep what the smaller one knew.

## The part nobody budgets for

Our premium prompt packs carry 886 plugin-prefixed references across 79 distinct
names in 216 files. Every resource that moves invalidates a long tail of
instructions written against its old address, and none of it shows up until
something tries to invoke a name that no longer resolves.

That coupling is the real cost of a split. Two guards now cover it: the site
build already refused to ship a pack citing a plugin missing from its install
map, and alongside it a checker walks every `plugin:resource` reference in the
repository and fails on any naming something its plugin does not provide. A
rename can no longer outrun its references.

## Teaching it back to the toolkit

Doing this once produces numbers. Making it repeatable means teaching the tools
what the run exposed, because an agent asked to do the same job next month starts
from nothing otherwise.

`agent-auditor` gained a startup-weight dimension that runs before every other
check, reports the agent-versus-skill split, and gates on per-agent description
size, example count, and an aggregate token ceiling. `benchmark-skills` learned
the eval runner end to end. A new `plugin-module-split` skill covers the parts
that break quietly — marketplace subdirectory sourcing, the dependency field, host
adapter regeneration, symlink depth.

The whole sequence is packaged as **`sd-plugin-context-diet`**, a four-link chain
in the [software-development pack](https://bopen.ai/premium/software-development):
Satoshi measures and compresses, Jason proves routing survived, Satoshi splits
the catalog, and Zack publishes and sweeps the downstream references. Each link
hands an artifact forward and blocks the next, so a failed verification stops the
chain where it stands.

If your plugin charges its users for capabilities they never invoke, that chain
is the run we just made, with the traps already marked.
