# Changelog

Notable user-visible changes to bopen-tools are documented here. This project
uses patch releases for normal development work; Claude Code and Codex plugin
manifests share the same release version.

## Unreleased

## [1.1.126] - 2026-07-24

### Added

- `humanize`: modeling a named writer on long-form work. The skill's four rules
  are subtractive and supply no shape, so a clean draft can still read as true
  statements in the order they happened. The new section takes the structural
  moves that transfer — a named concept, headings that make claims, argument
  order over chronology, a stated stake for the reader — and rejects the
  sentence-level tics, which are largely the patterns rules 1, 2, and 4 remove.
  `references/style-modeling.md` carries the procedure, per-writer move tables,
  and the measurement behind it.
- `humanize` rule 1 gains its one exception: a measured correction, where the
  dismissed half is a belief the reader holds and the pivot is evidence. The test
  is whether the first half survives as a standalone claim someone would defend.

## [1.1.125] - 2026-07-24

### Added

- `setup`: the Agent Master desktop shell can now update itself. The broker
  checks `bopen.ai/api/releases/agent-master/latest` for the installed version's
  channel, downloads the release with the signed-in bopen.ai session, verifies
  the disk image against the advertised version plus `codesign` and Gatekeeper,
  and applies it by quitting the app, swapping the bundle, and reopening. The
  outgoing bundle is kept until the replacement is in place.
- `setup`: the update surface identifies its host from a shell handshake
  (version, bundle path, process id) rather than from `--agent-master` alone, so
  a standalone `playground_server.ts` session is told the host is unsupported
  and never offers to replace an application it is not part of.

## [1.1.124] - 2026-07-24

### Added

- `bopen-plugin-dev:plugin-module-split`: splitting a plugin into a core plus
  optional modules. Covers marketplace subdirectory sourcing on both hosts, the
  `dependencies` field's silent-load behaviour, host adapter regeneration,
  symlink depth for vendored skills, and drawing module boundaries from the
  reference graph.

### Changed

- `bopen-plugin-dev:agent-auditor` gains a startup-weight dimension that runs
  before every other check. It reports the agent-versus-skill split of always-on
  cost and gates on per-agent description size, example count, and an aggregate
  token ceiling.
- `bopen-plugin-dev:benchmark-skills` covers `claude plugin eval`: the
  environment override, all six grader types, `--ablation with-without`, `--runs`
  for variance, and the three setups whose failures are indistinguishable from a
  routing miss.


## [1.1.123] - 2026-07-24

### Fixed

- **Codex custom agents survive the module split.** The adapter generator only
  scanned `agents/` at the plugin root, so the 26 agents that moved into modules
  produced no adapter and would have vanished from Codex. It now scans every
  `modules/*/agents/` directory as well, and each adapter records its real
  source path. All 29 adapters regenerate clean, and a scratch install resolves
  the curated roster across core and modules.
- Adapters also carried pre-compression descriptions, since they had not been
  regenerated since the agent rewrite. They now match their sources.

### Removed

- `ezkl`. It covers EVM and Solidity zero-knowledge ML with no relationship to
  anything else here, no home in the sibling plugins, and no premium pack
  reference.


## [1.1.122] - 2026-07-24

### Changed

- Each module owns the routing cases that exercise it. Twelve cases covering
  relocated agents and skills moved out of the core suite into
  `modules/<name>/evals/`, leaving nine in core.


## [1.1.121] - 2026-07-24

### Changed

- **bopen-tools is now a small core.** The catalog splits into nine optional
  modules: orchestration, plugin-dev, review, web, creative, mcp, ops, research,
  and public-agents. Core keeps session context, setup and hook management,
  completion auditing, session recall, routing, identity work, and every hook.
- Core falls to 15 skills and 3 agents, roughly 1,932 estimated startup tokens
  against ~25,705 before this work began.
- Modules live in `modules/` in this repository, each with its own Claude and
  Codex manifests, and register in both marketplaces by relative source path.
  Nothing is duplicated between core and modules.
- Third-party symlinked skills moved with their module, with targets adjusted
  for the extra directory depth, so vendor ownership and `skills-lock.json`
  provenance are unchanged.

### Fixed

- Relocating agents broke 28 Codex adapter directories, whose `AGENTS.md`
  symlink pointed at an agent file that had moved. Each adapter moved with its
  agent; adapters for agents that left the repository were removed.
- Repointed every in-repo reference to a relocated resource, including the skill
  and agent maps in `CLAUDE.md`.

### Note

`setup` and `visual-wayfinder` stay in core because Agent Master bundles both
into the signed desktop app and resolves them at `skills/<name>`.


## [1.1.120] - 2026-07-24

### Fixed

- `bopen-orchestration` no longer declares `dependencies: ["bopen-tools"]`. A
  declared dependency makes the loader skip the plugin silently wherever that
  dependency is absent: the module's eval suite scored 0/5 against the module
  alone, with every case reporting that no skill applied, and 5/5 with the field
  removed and nothing else changed. The module's references to core skills are
  prose recommendations, so it functions alone.
- Moved the five orchestration routing cases into the module, so each
  distribution owns the cases that exercise it.


## [1.1.119] - 2026-07-24

### Changed

- Repointed every remaining reference to relocated resources: the skill and
  agent maps in `CLAUDE.md`, four agent bodies, `commands/factory-init.md`, the
  README, and the setup playground's pack catalog now name
  `bopen-orchestration`, `paperclip`, `product-skills`, or `clawnet` for the
  resources those plugins now own.


## [1.1.118] - 2026-07-24

### Removed

- The `ceo` and `cfo` personas and `paperclip-plugin-dev`, which are
  organization simulation and Paperclip tooling. They now ship as the
  `paperclip` plugin, so a coding session no longer pays startup context for
  them. The `ceo` body carried seven references to a `Skill(paperclip)` that
  exists in no published plugin; that gap is recorded in the new repository
  rather than silently carried over.

### Changed

- `visual-proposal` references Chief through `Agent(paperclip:ceo)`.
- Three agent-routing cases covering relocated agents are retired from the
  fixture, leaving 27.
- Authored skills fall to 58 and agents to 28.


## [1.1.117] - 2026-07-24

### Changed

- **bopen-tools is now the core.** Orchestration moves out to the first optional
  module, `bopen-orchestration`: coordinator, advisor, orchestrator,
  wave-coordinator, software-factory, deploy-agent-team, claudex, and the
  agent-builder persona. Those coordinator-family skills cite each other, which
  made them the cleanest first extraction.
- Modules live in `modules/` inside this repository, each with its own Claude
  and Codex manifests, and register in the marketplace through a relative source
  path. No second repository is involved, so nothing is duplicated and nothing
  can drift.
- `bopen-orchestration` declares `bopen-tools` as a dependency, so installing
  the module pulls the core.
- Core startup surface reaches roughly 12,160 estimated tokens, down from
  ~25,705 before this work began — a 53% reduction.

### Note on terminology

Plugin distributions are **modules**. `pack` stays reserved for the premium
prompt packs sold on bopen.ai, which Agent Master manages.


## [1.1.116] - 2026-07-24

### Removed

- `clawnet-cli`, which duplicated a skill of the same name in the clawnet
  plugin. That copy was a 2.6 KB stub against clawnet's 21 KB guide, but it
  carried three sections clawnet lacked — the v0.0.33 vault composition, ORDFS
  server-side directory traversal, and the agent `icon:` frontmatter field —
  so those were merged upstream before removal rather than dropped.
- `geo-optimizer` and `saas-launch-audit`, now shipped by product-skills where
  the rest of the go-to-market work lives. `geo-optimizer` overlapped
  `ai-seo-optimization` on AI-search optimisation, so both descriptions now name
  each other as boundaries.

### Changed

- Agent tool grants and the premium pack catalog reference the relocated skills
  through their new plugin prefixes.
- Authored skills fall from 69 to 66; the model-visible startup surface reaches
  roughly 13,050 estimated tokens, down from ~25,705 before this work began.


## [1.1.115] - 2026-07-24

### Changed

- Compressed 25 authored skill descriptions to routing metadata, 15,514 to
  8,149 characters across that set. Skill descriptions overall fall from 36,635
  to 29,618 bytes. Every coined term the model cannot infer — `claudex`,
  `CLIProxyAPI`, `SKILL-MAP`, `AGENT-MAP`, `service_auth`, `ID-JAG`, `cuelume`,
  `ADW`, `monkey test` — is preserved verbatim, because for those skills the
  description is the only discovery handle. The rewriter refuses to write into
  a symlinked directory, so the 16 vendored third-party skills are untouched.
- Model-visible startup surface falls from ~15,142 to ~13,388 estimated tokens,
  and from ~25,705 before the agent pass — a 48% cumulative reduction.

### Added

- An `evals/` suite of 26 cases in the native `claude plugin eval` format,
  covering agent selection and skill selection across direct, boundary,
  ambiguous, and negative routing.

### Fixed

- `skill-check-version` tested whether a publish succeeded; the skill compares
  the installed version against GitHub. The case now matches the skill.
- Replaced `skill-agent-browser`, which expected a skill belonging to a
  different plugin and was unreachable from this one, with `skill-chrome-cdp`.

### Validation

Skill routing over 16 cases at three runs each went from 83.3% to 91.7% with no
case regressing. The full 26-case suite scores 25/26 (98.7%), with agent cases
at 10/10. A `--ablation with-without` run reports mean delta 0.8: every positive
case passes at 100% with the plugin and 0% without it, while negative cases pass
in both arms.

## [1.1.114] - 2026-07-24

### Changed

- Compressed all 31 agent descriptions to routing metadata: trigger phrases and
  explicit "not for X, use Y" boundaries, with the worked `<example>` blocks
  removed. Agent descriptions fall from 44,016 to 12,053 bytes. No agent
  capability, persona, or system prompt changed.
- Replaced enumerated `Skill(...)` grants in agent `tools:` lists with a single
  bare `Skill` grant, which widens skill access rather than narrowing it, and
  cuts agent tool lists from 14,865 to 4,527 bytes. Base tool scoping is
  unchanged, including `Bash(git:*)`-style restrictions. The security- and
  publish-sensitive agents — code-auditor, security-ops, devops, payments —
  keep their explicit lists.
- Model-visible startup surface falls from ~25,705 to ~15,130 estimated tokens.

### Added

- `scripts/plugin-weight.py` now measures agent `tools:` bytes and description
  example counts, reports a combined model-visible startup total, and gates on
  `--max-agent-description-chars`, `--max-agent-examples`, and
  `--max-startup-tokens`. The report previously showed agents as a bare count,
  so a budget gate built on it would have guarded skills only.
- `scripts/run-agent-routing.py` records agent selection from fresh headless
  Claude sessions via `claude -p --plugin-dir` with an isolated
  `CLAUDE_CONFIG_DIR`, so a source tree can be validated before it is
  published. `--runs` samples each case and reports the majority, because
  single samples flip often enough to invent differences that are not real.
- 30 agent-routing cases in `benchmarks/fixtures/agent-routing-cases.json`
  covering direct, boundary, ambiguous, and negative selection, with recorded
  results in `benchmarks/results/`.

### Fixed

- `agent-builder` listed "deploy this as a ClawNet bot" as a trigger, which
  collided with `devops` and mis-routed deployment requests. It now defers
  deployment explicitly. The collision predated this release and was masked by
  the longer descriptions.

### Validation

Routing was measured before and after compression over the same 30 prompts.
Precision was 100% in both arms — neither ever selected a forbidden agent.
Recall went from 92.6% / 85.2% (two runs, verbose) to 96.3% (majority of three
runs, compressed), and the number of cases that flipped between identical runs
halved from 4/30 to 2/30. Identical prompts cost 29% fewer tokens.

## [1.1.113] - 2026-07-24

### Fixed

- Corrected the Codex context snapshot so a static `prompt-input` capture no
  longer misreports zero omitted skills when the runtime budget warning is
  unavailable. Optional `codex exec --json` events now provide the
  authoritative omission count and description-removal state, and the live
  harness accepts the recorded event stream without adding model calls to the
  deterministic tier.

## [1.1.112] - 2026-07-24

### Added

- Plugin context diagnostics: `plugin-weight.py` inventories skill, agent, and
  command routing/on-demand weight; exact Claude and Codex snapshot tools parse
  live or recorded host output; install-parity checks compare source, packaged,
  and installed inventories without modifying caches.
- Deterministic context-harness tests cover multiline frontmatter, symlinked
  third-party skills, host invocation policies, prompt/detail parsing, semantic
  version ordering, and inventory drift.
- A recorded-result skill-routing evaluator reports precision, recall,
  omissions, forbidden activations, and confusion data independently from the
  existing output-quality benchmark.
- `run-plugin-harness.py` provides deterministic, hook, and live-host release
  tiers, with architecture and operator guides under `docs/`.
- Refreshed five stale generated Codex agent adapters and their ownership
  manifest from the 1.1.111 authored agent sources.

### Changed

- Replaced the README's fixed-budget workaround with host-specific diagnostics,
  explicit-only policy guidance, and the planned small-core/optional-domain-pack
  architecture. This release does not change skill descriptions, routing,
  invocation policy, hooks, or public capabilities.
- Stabilized the session-context hook fixture by preventing its intentionally
  prepared router index from being treated as stale, eliminating a macOS
  cleanup race with the asynchronous index builder.

## [1.1.111] - 2026-07-24

### Added

- `shadscan` (1.0.0): new skill that drives the `@shadscan/cli` static analyzer
  through an audit → fix → re-score loop against shadcn/React apps, covering the
  six scored categories (foundation, interaction, states, accessibility, forms,
  production-polish), the AI-agent handoff modes (`--format prompt`,
  `--apply --agent claude`), and the CI score gate (`--fail-under`, GitHub
  Action, pre-commit). Deep flag reference, JSON notes, and a per-category fix
  playbook live in `references/reference.md`.

### Changed

- `designer` (Ridd, 1.0.22), `nextjs` (Theo, 1.1.10), and `tester` (Jason,
  1.3.17): wired the new `shadscan` skill into the shadcn-capable line with a
  maker/checker split — Ridd is the primary fixer (categories map onto his
  accessibility/states/forms patterns), Theo the secondary fixer for structural
  and composition findings, and Jason owns the CI `--fail-under` gate rather
  than applying UI fixes.

## [1.1.110] - 2026-07-21

### Added

- `hammertime` (1.0.2): rules can now declare `cwd_prefix` as a path string or
  array of path strings. Scoped content and timer rules run only when
  `CLAUDE_PROJECT_DIR` (or the process working directory when unset) starts
  with an expanded prefix; malformed scopes warn on stderr and are skipped.
  Rule authoring guidance and status/management tables now expose scope while
  preserving global behavior for rules without the field. Deterministic
  scoring now excludes complete quoted and inline-code spans, taking the
  project-owner corpus from F1 0.89 to 1.00 without losing true positives.

## [1.1.109] - 2026-07-17

### Changed

- `nextjs` (Theo, 1.1.9): react-doctor is now a completion gate on ALL nontrivial React/Next.js work, not just new projects — run `npx -y react-doctor@latest . --verbose --diff`, add zero findings, treat a regression like a failing test. New projects still must hit a full score of 100.

## [1.1.108] - 2026-07-17

### Changed

- Refreshed third-party vendored skills to latest via `skills update` (macos-design, wayfinder; skills-lock hashes updated). The ext-apps and json-render sources need a per-source `npx skills add <source> -y` refresh (flagged as follow-up).

## [1.1.107] - 2026-07-17

### Changed

- Context-efficiency pass on two heavy skills — detail relocated to `references/`
  via progressive disclosure, no information lost, triggers unchanged:
  - `create-next-project` (2.0.3): SKILL.md 3851 → 1967 words (663 → 266 lines);
    build-team, database-provisioning, and deployment-workflow detail moved to
    new reference files.
  - `hammertime` (1.0.1): SKILL.md 2460 → 1998 words; schema-field internals,
    extra examples, and skill-invocation/mode-inference tables moved to
    `references/rule-design.md`. Corpus-driven methodology preserved.
  - Core orchestration manuals (coordinator, software-factory, visual-proposal,
    advisor) were deliberately left full — they are meant to load when triggered.
  - The `convert-web-app` refactor was reverted: it is a third-party symlinked
    skill (skills-lock.json / modelcontextprotocol ext-apps) and belongs upstream.

### Changed

- shadcn accuracy pass across the design agents, aligning them to the official
  `Skill(shadcn)` (vercel plugin) and CLI v4:
  - `designer` (Ridd, 1.0.21) — fixed a wrong flag (`--base base` → `--base base-ui`),
    reframed `Skill(shadcn)` as the authority, corrected non-interactive init
    (`-d`/`-f`, not `--yes`), and added the CLI v4 additions most agents didn't know:
    project templates (`init --template`), `registry:base`, `registry:font`
    (typography as a first-class registry — the "type sets"), the full style-preset
    set (vega/nova/maia/lyra/mira/luma/sera), Base UI, and the new chat components
    (MessageScroller, Message, Bubble, Attachment, Marker). Deprecated flags noted.
  - `nextjs` (Theo, 1.1.8) — same authority framing + recent-additions summary.
  - `agent-builder` (1.7.12) — added the "AI Elements requires `--base radix`" caveat.
  - `references/design/shadcn.md` — prepended a staleness banner; the 1113-line doc
    predates CLI v4 (interactive init, removed `--style`/`--base-color`/`--css-variables`)
    and now defers to `Skill(shadcn)`. Full trim tracked for the skill-efficiency pass.

## [1.1.105] - 2026-07-17

### Changed

- `humanize` skill (1.0.8): added an "Assistant & Formatting Tells" section to
  `references/structures.md` covering the output-layer signatures our prose rules
  didn't already catch — sycophantic openers, collaborative closers, knowledge-
  cutoff disclaimers, curly quotes, emoji on headings, Title Case headings,
  mechanical boldface, and inline-header vertical lists. Adapted from the
  24-pattern checklist in the MIT [ericosiu/ai-marketing-skills](https://github.com/ericosiu/ai-marketing-skills)
  (our skill already covered the other ~20 patterns in more depth). Benchmarked
  core rules and scoring untouched.

## [1.1.104] - 2026-07-16

### Added

- `ui-audio-theme` skill (1.1.1): synthesized UI sound support, adopting lessons
  from the MIT [cuelume](https://github.com/Danilaa1/cuelume) library. Two new
  references and an asset:
  - `references/interaction-taxonomy.md` — a production-agnostic 14-moment
    vocabulary (chime, tick, press, release, toggle, success, error, page,
    loading, ready…) with the restraint rules that keep UI audio from becoming
    noise (a distinct sound per moment, hover throttle, paired press/release,
    silent fallback), mapped onto the skill's event-map coverage domains.
  - `references/cuelume-web-delivery.md` + `assets/cuelume-event-map.json` — a
    synthesized **web** micro-interaction delivery path via cuelume for crisp,
    deterministic clicks, chosen per event alongside the ElevenLabs sample
    pipeline (which stays for bespoke/branded/ambient/voice and any file target
    like game/TV/desktop). All 30 semantic events are mapped to cuelume's 14
    sounds with per-event coverage ratings and an `elevenlabs_recommended` flag.
  - SKILL.md gains a "Delivery paths" section and taxonomy pointers. cuelume is
    an external dependency the consuming app installs; it is not vendored into
    this repo. A native recipe synth that renders audio files (for game/desktop
    targets cuelume cannot serve) is a deliberate follow-up, gated on the first
    concrete file-export need.

### Added

- `claudex` skill (0.0.1): a standalone escape hatch for running the Claude Code
  harness on **GPT-5.6 Sol** via a local **CLIProxyAPI**, billed against a
  ChatGPT/Codex subscription — for when Anthropic usage runs out mid-session. The
  normal `claude` command is untouched; `claudex` is a separate zsh alias that
  reroutes one invocation through the proxy. Crisis-triggering description fires
  on "my usage ran out" / "run Claude Code on GPT-5.6 Sol"; the one-time macOS
  setup (Homebrew install, conf edit, launchd service, browser OAuth, alias) and
  the drift troubleshooting live in `references/`. Chosen over folding into
  `setup` or a docs-only note because only a live skill description can fire at
  the moment the wall hits.
- `setup` manifest: a `cliproxyapi` CLI row (used by `claudex`) so a general
  harness audit surfaces a missing or dead proxy and points at the skill —
  audit-only, no install logic added to `setup`.

### Added

- `visual-proposal` skill (0.0.10): a **CEO final-call** stage — after the
  advocates and judges, `Agent(bopen-tools:ceo)` (Chief) makes the last, decisive
  call, weighing the business and the user holistically (technical debt priced as
  interest, scope creep, reversibility, user benefit), with the single thing that
  would change his mind. Added a drop-in **interactive-choices** component
  (`references/interactive-choices.md`): selectable radio-style option cards for
  every decision plus a copy-response button that emits a clean, version- and
  link-stamped block for pasting back to the agent — including the required
  Agree / Agree-with-caveats / Disagree control on the CEO's call. Wired
  `Skill(bopen-tools:humanize)` into the flow: every advocate/judge/CEO humanizes
  its return, and the host humanizes the final page copy.
- `ceo` agent (Chief, 1.0.8): a **Decision Lens** section for making the final
  call on a technical proposal — speed-and-quality via staged release gates (not
  a binary), technical debt as a priced loan, scope guarded by "what do we stop?"
  and banking freed capacity into debt paydown, a checkable user-advocacy gate,
  tie-breaking authority, and engaging the architecture directly. Grounded in
  current (2026) engineering-leadership thinking.

## [1.1.101] - 2026-07-16

### Fixed

- `visual-proposal` skill (0.0.9): the judging bench now runs by DEFAULT as part
  of the standard flow (advocates → cross-examination → judges), instead of only
  when the user explicitly asked for a verdict. Fresh runs were producing three
  advocates and no judges because the bench was gated behind an explicit request.
  Clarified that this does not violate Rule 1: a bench is a panel of attributed,
  usually-split verdicts with flip-conditions — not the *author* handing down one
  foregone conclusion — so neutrality is preserved while the proposal stays
  decision-useful. Skip the bench only for a page with no real decision.

## [1.1.100] - 2026-07-16

### Changed

- `visual-proposal` skill (0.0.8): make the multi-agent advocacy panel the
  DEFAULT for any proposal with a real option-decision (no longer opt-in), and
  add a lean "Casting the panel" section — pick real named agents from the roster
  (Front Desk / the `agents/*.md` files), then run the new bundled
  `scripts/embed-avatars.sh` to source each avatar (local
  `~/code/bopen-ai/public/images/agents/{slug}.png` or the published
  `bopen.ai/...`), downscale, and emit an inline `window.AV` data-URI map (the
  Artifact CSP blocks external images). Moves the repetitive fetch/downscale/embed
  work out of prose and into a script, so agents reproduce the named roster
  advocates, avatars, and judging panel instead of a plain writeup.

## [1.1.99] - 2026-07-15

### Changed

- `visual-proposal` skill (0.0.7): document the reframe re-run. When the user
  changes which options are in play or the principle separating them (not just
  picks a winner), re-brief the advocates to re-propose and re-fire the judging
  bench on the new points of contention rather than only editing the conclusion
  text — grounding the re-run with the same rigor, and marking the prior round
  superseded rather than deleting it.

## [1.1.98] - 2026-07-15

### Documentation

- Synchronized the public `visual-proposal` inventory with 0.0.6: a concrete,
  buildable premise challenge becomes a first-class option in advocacy and
  judging.
- Hardened the OrdFS collection implementation plans after source-level review:
  exposed the item rarity type mismatch, required complete MAP fields and
  normalized collection IDs, separated MAP-byte invariance from AIP validation,
  gated authoritative membership on a collection-matching signer, and made the
  documented whole-output AIP mismatch an explicit stop condition. Also
  reconciled the docs plan's changed-file criteria and clarified token icon,
  parent, and application-level ownership semantics.

## [1.1.97] - 2026-07-15

### Changed

- `visual-proposal` skill (0.0.6): a premise-challenging voice that proposes a
  concrete, buildable alternative is now promoted to a first-class option —
  full cross-examination (advocates attack it by name, it attacks them) and the
  judging bench re-runs to include it — rather than being sidelined as a
  non-judged sidebar. Only a voice that questions the framing without offering a
  buildable option stays a marked premise-challenge. Added the buildability tell
  and a reminder to ground the fourth option with the same rigor as the rest.

## [1.1.96] - 2026-07-15

### Changed

- `visual-proposal` skill (0.0.5): added the premise-challenging voice — an
  advocate that disputes a proposal's load-bearing assumption ("does this even
  need to be a collection?") rather than picking among the presented options.
  It gets an equal-weight card marked as challenging the framing, is not scored
  against the option advocates or ruled on by the judging bench, and what it
  surfaces folds into the open questions as an upstream decision the reviewer
  settles first.

## [1.1.95] - 2026-07-15

### Fixed

- Bypassed environment HTTP proxies with a direct loopback socket for Agent
  Master's Portless readiness requests, preventing clean CI proxy settings
  from intercepting local tool health checks.

## [1.1.94] - 2026-07-15

### Changed

- `visual-proposal` skill (0.0.4): link out to browsable sources. Whenever a
  proposal names something with a URL — a repo, file, PR, issue, doc page, or
  deployed app — it must be a clickable `<a target="_blank">`, since the Artifact
  CSP blocks embedding external resources but not outbound navigation. The
  landscape section in particular links every repo/file/PR reference so the
  reviewer clicks straight through to the real code.

## [1.1.93] - 2026-07-15

### Documentation

- Documented Agent Master's loopback-plus-`Host` readiness strategy for local
  Portless tools so the public runtime contract matches the shipped broker.

## [1.1.92] - 2026-07-15

### Fixed

- Made Agent Master's HTTP Portless readiness probes connect through loopback
  while preserving each tool's public hostname, avoiding multi-label
  `.localhost` resolver failures on clean macOS release runners.

## [1.1.91] - 2026-07-15

### Changed

- `visual-proposal` skill (0.0.3): added a "landscape / what already exists"
  section to the proposal spine — an inventory of existing specs, code, and
  tools with where each lives and a status chip, framed explicitly as
  orientation and NOT a judging input. Documented the agent sign-off affordance
  (cluster the advocate avatars on a fact's card, straddling its top edge, to
  show a group verified it) and the requirement to show each advocate/judge's
  avatar, name, and role. The judging bench now keeps each judge's "would flip
  if" condition as the actionable tiebreaker.

## [1.1.90] - 2026-07-15

### Fixed

- Extended Agent Master's managed-interface readiness window to 90 seconds so
  cold standalone Deck Creator and Visual Planner starts do not fail on clean
  release machines under load.

## [1.1.89] - 2026-07-15

### Changed

- Documented `visual-proposal`'s optional advocate debates and user-requested
  judging panels in the public skill inventory, keeping release documentation
  synchronized with the expanded skill surface.

## [1.1.88] - 2026-07-15

### Changed

- Expanded `visual-proposal` with option-by-option cross-examination and an
  optional independent judging bench. Judges may rank or name a winner only
  when the user explicitly requests a recommendation or verdict; their fixed
  lenses, rationales, tally, and dissent remain separate from the neutral
  option cards and do not replace the human decision.

## [1.1.87] - 2026-07-15

### Added

- Added `visual-proposal`, a grounded, diagram-led workflow for presenting
  unbuilt designs, RFCs, roadmaps, and neutral option comparisons as a single
  self-contained, theme-aware HTML page.
- Added a five-plan OrdFS collection roadmap with explicit TODO gates,
  cross-repo dependencies, stop conditions, linked source material, and a
  dedicated findings section. Publishing these plans does not approve their
  implementation.

### Fixed

- Made Agent Master wait for a successful tool-specific readiness probe and
  expected product marker, preventing a wildcard broker 404 from being treated
  as a successfully launched Deck Creator, Visual Planner, or Visual Wayfinder.
- Restored setup-playground typechecking by keeping the pack-dependency test
  fixture synchronized with the required harness-state contract.
- Reconciled the OrdFS plan's shared-content draft with its compatibility
  invariant: collection and collectionItem MAP envelopes and AIP authorship
  remain unchanged while only item content becomes a reference.

## [1.1.86] - 2026-07-15

### Changed

- Added a production standalone build for the Agent Master broker so the
  signed desktop app can run the local configurator without a bOpen Tools
  checkout or a user-installed dependency tree.

## [1.1.85] - 2026-07-15

### Added

- Added an origin-restricted Agent Master broker that lets bopen.ai detect an
  explicitly enabled desktop session and launch only Deck Creator, Visual
  Planner, and Visual Wayfinder through fixed Portless namespaces.
- Added an isolated static server for Visual Wayfinder so its active HTML runs
  on `wayfinder.agent-master.localhost` instead of the privileged broker
  origin.

### Changed

- Made the setup playground honor Portless-provided host, port, and public URL
  values and require `--agent-master` before exposing the local broker API.
- Protected website-to-desktop launches with an exact origin allowlist,
  Private Network Access preflight support, and an ephemeral per-process
  connection capability.

## [1.1.84] - 2026-07-15

### Changed

- Made `x-research` resolve the newest canonical general-purpose Grok model
  from the live xAI catalog for every research task, while preserving verified
  versioned model pins for reproducible work.
- Routed Parker's Grok research through the skill-owned request wrapper instead
  of duplicating model selection and response parsing in the agent prompt.

### Fixed

- Prevented lagging aliases such as `grok-latest` and `grok-4-latest` from
  silently selecting Grok 4.3 when Grok 4.5 is available.
- Kept model selection and the Responses API request in one process so a shell
  tool boundary cannot discard the chosen model.

## [1.1.83] - 2026-07-15

### Changed

- Rebuilt the audio picker's main screen as a responsive event workbench with
  always-visible waveform cards, a clear selected-take state, direct
  waveform-to-editor interaction, compact icon actions, and contextual
  cross-event assignment controls.

### Fixed

- Kept generated takes inline after deletion instead of collapsing their
  containing list.
- Made accepted candidates and revisions visibly persistent after reopening
  the picker, including candidates selected for more than one event.

## [1.1.82] - 2026-07-15

### Added

- Added a visual waveform editor to `ui-audio-theme` with draggable and
  keyboard-adjustable trim handles, click-to-seek, selection playback, labeled
  fade/volume/reverb/delay sliders, reset, and non-destructive revision saves.
- Added an existing-product UI-audio audit workflow, event-map template, and
  validator covering routes, overlays, async work, authentication, payments,
  blockchain operations, keyboard navigation, gamepad input, visual
  alternatives, and repetition policy.
- Added first-class `item-hover`, `nav-item-hover`, `tx-pending`, and
  `tx-confirmed` theme slots, with transaction-boundary and tooltip-separation
  guidance for application integrations.

### Changed

- Expanded Frames, the audio specialist, to invoke `ui-audio-theme` for
  existing-site audits, semantic wiring reviews, theme generation, visual
  editing, and accepted-asset handoff.
- Made the picker compact around one shared editor and added cross-event
  assignment, candidate deletion, accepted-sound history, and legacy theme-file
  adoption without requiring regeneration.

### Fixed

- Preserved existing manifest entries during single-slot or category-limited
  regeneration instead of erasing previously accepted sounds.
- Removed the vague `soften edge` shortcut and exposed its underlying audio
  concepts as explicit fade-in and fade-out controls.

## [1.1.81] - 2026-07-15

### Added

- Added `auth-md`, a production-oriented guide to the experimental WorkOS
  auth.md v0.6.0 agent-registration proposal. It covers RFC 9728 discovery,
  agent and service flows, service-owned claim ceremonies, ID-JAG providers,
  Better Auth adaptation, consent, account linking, token separation,
  revocation, audit, and incident response, plus a GET/HEAD-only discovery
  probe and behavioral evals. Its reviewed cache-free sequential benchmark
  scores 67% with the skill versus 7% baseline across three adversarial cases
  (+60 percentage points).

### Changed

- Expanded Satchmo's agent-architecture routing to invoke `auth-md` for agent
  identity, delegated signup, ID-JAG, and agent-facing OAuth work while keeping
  WorkOS auth.md, Better Auth Agent Auth, OAuth Dynamic Client Registration,
  and RFC 8628 Device Authorization explicitly separate.

## [1.1.80] - 2026-07-14

### Added

- Added `visual-wayfinder`, a build-free visual decision workbench that wraps
  one active Wayfinder ticket with choice cards, ranges, rankings, toggles,
  tradeoff tables, consequence previews, a renderer-independent answer
  envelope, and an accessible text fallback. A polished self-contained demo
  documents the intended desktop and mobile experience.
- Added Agent Master `skillInterfaces` discovery and an **Open Visual
  Wayfinder** entry. The desktop configurator derives a trusted bopen.ai link
  from plugin and skill slugs; it does not run the skill, persist its answers,
  or add another build step.
- Added a current `plugin-settings` skill covering Claude Code `userConfig`,
  secure storage, settings boundaries, project-owned configuration, and the
  Agent Master discovery contract.
- Added pinned JSON Render 0.19 imports for MCP Apps, directives, and devtools,
  alongside refreshed core, React, and shadcn guidance.

### Changed

- Refreshed `generative-ui`, `mcp-apps`, and Orbit's MCP specialist guidance
  against JSON Render 0.19.0, MCP Apps SDK 1.7.4, the 2026-01-26 stable Apps
  specification, and current Claude Code plugin settings. The guidance now
  requires flat React specs, capability negotiation, exact resource CSP,
  app-only submission tools, bounded `structuredContent`, useful text
  fallbacks, and explicit production hardening around `@json-render/mcp`.

## [1.1.79] - 2026-07-14

### Changed

- Expanded `design-game-ui` with an explicit capability and ownership map for
  UI audio, generated visuals, diegetic 3D, application integration,
  constrained-device performance, and traversal testing. Ridd now invokes
  `ui-audio-theme` and Frames when actual sound assets are requested while
  retaining the semantic event, accessibility, repeat, and acceptance contract.
- Documented bounded handoffs to Lisa and Gemskills, Kris, Theo, Torque, and
  Jason, plus research escalation to Parker and `x-research`, so related
  capabilities are composed when triggered rather than dispatched for every
  game or television interface task. Narrowed Ridd's former generic audio-skill
  trigger to requested sound production or an approved feedback-event map.
- Clarified that `ui-audio-theme` is the single UI-sound production workflow
  and made its local visual picker the default feedback loop for game HUD and
  television navigation sounds. Generated baselines now require explicit
  per-slot user audition and acceptance before Frames hands assets to the
  runtime owner; `design-game-ui` retains only semantic event requirements.

## [1.1.78] - 2026-07-14

### Fixed

- Removed the unsupported top-level `_comment` field from the Codex hook
  manifest. Codex 0.144.1 rejects unknown hook-config fields and could skip the
  plugin's hooks on a fresh install; validation now locks the accepted schema.

## [1.1.77] - 2026-07-14

### Added

- Added `design-game-ui`, a Ridd-owned workflow for converting existing app
  content into controller- and remote-first game HUDs and television
  interfaces. It covers semantic action maps, deterministic focus navigation,
  Back-stack behavior, ten-foot safe areas, remapping, accessibility,
  performance, testing, and telemetry.
- Added Agent Master's **My Packs** library, device sign-in flow, local
  dependency checks, and setup-plan integration for purchased packs.
- Added declarative repository and skill settings with schema validation, plus
  bounded SessionStart context injection for explicitly opted-in, non-sensitive
  values.
- Added documentation integrity checks so release metadata, the changelog, and
  public README inventories cannot silently drift apart.

### Changed

- Expanded Ridd's routing contract to own two-dimensional game HUDs,
  controller/remote navigation, and ten-foot television shells, with explicit
  handoffs for diegetic 3D work and framework-heavy integration.
- Reconciled the README with the authored skills, complete agent roster, slash
  commands, hooks, Agent Master features, settings contract, benchmark coverage,
  repository structure, and current marketplace update flow.
- Tightened plugin publishing guidance so every user-visible change updates
  this changelog, public-surface changes update the README, and Claude/Codex
  manifests and caches are released together.

### Fixed

- Stopped prompt-router indexing from turning words inside quoted examples and
  negative routing clauses into broad positive triggers. This keeps generic
  keyboard-focus and gameplay-control work out of `design-game-ui`, while
  diegetic and world-space interface requests route to Kris.

## [1.1.76] - 2026-07-14

### Added

- Added Agent Master's `--pack` dependency pass. It reads a pack table of
  contents or `pack.json`, computes the required plugin closure, and shows
  required-versus-installed state with runtime-specific commands.

### Changed

- Allowed the Agent Master playground to install validated missing pack
  dependencies only after the user explicitly selects **Install missing**;
  the zero-install fallback remains read-only and emits a plan.

## [1.1.75] - 2026-07-14

`1.1.75` was the manifest version at the end of the reconstructed period below.
The repository did not keep contemporaneous notes for this individual patch;
this heading records the last documented manifest boundary, not a claim that
the full historical baseline shipped in one release.

## Historical baseline: 1.0.14–1.1.75 (reconstructed)

This baseline was reconstructed from repository history for changes made
between the `v1.0.13` tag on 2026-01-19 and plugin version `1.1.75` on
2026-07-14. The project did not maintain contemporaneous patch-by-patch release
notes during that period, so the grouped summary below records meaningful
product changes without assigning every commit to a release that was not
tagged.

### Added

- Added dual Claude Code and Codex plugin distribution, paired manifests,
  generated Codex agent adapters, a safe adapter installer, and cross-host hook
  manifests.
- Added the unified `setup` skill and Agent Master UI for live harness
  detection, plugin and dependency inventory, hook configuration planning,
  runtime-specific setup prompts, catalog browsing, and session status.
- Added orchestration workflows including `orchestrator`, `coordinator`,
  `advisor`, wave coordination, and explicit specialist/worker boundaries.
- Added software-factory planning, free-roam exploratory testing, visual diff
  reviews, UI audio themes, MCP Apps development, Chrome CDP automation,
  Paperclip plugin development, HTML-to-PDF templates, Persona tooling, cost
  tracking, and EZKL workflows.
- Added specialist personas for executive leadership, finance, security,
  training, cartography, creative 3D, community management, and native desktop
  development, alongside expanded roster and front-desk routing.
- Added HammerTime behavioral rules, prompt routing, roster and skill-activity
  hooks, hook setup controls, session contracts, and a local benchmark runner.
- Added skill provenance through `skills-lock.json`, ClawNet publication
  metadata, and on-chain attestation artifacts.

### Changed

- Consolidated agent personas as the canonical source for generated Codex
  adapters and clarified which app-specific agents stay in their owning
  repositories.
- Refined model routing and provider boundaries for Claude, Codex, Grok, and
  read-only advisor lanes; updated agent skills and descriptions to trigger on
  user intent rather than generic role labels.
- Reworked HammerTime with scored detection, full-turn evaluation, timer and
  pause controls, loop limits, clearer diagnostics, and safer fallbacks.
- Updated the setup playground with the bOpen visual system, plugin navigation,
  live plan state, sound feedback, runtime tiers, and catalog links.
- Moved statusline distribution to the standalone `claude-peacock` plugin and
  retired or consolidated obsolete and duplicate commands, agents, and skills.

### Fixed

- Fixed command and hook parsing edge cases, destructive-command false
  positives, structured deny behavior, apply-patch path handling, session
  deduplication, and friendlier safe-alternative messages.
- Fixed xAI response extraction and control-character handling for newer Grok
  reasoning responses.
- Fixed stale agent adapters, skill references, model names, plugin cache/update
  guidance, and numerous setup and playground state inconsistencies.

### Security

- Added `damage-control`, `bouncer`, and `publish-gate` protections across both
  supported hosts, including sensitive-path and destructive-operation checks.
- Isolated browser content from privileged hook context and added safer browser
  intent guidance.
- Removed `ccusage` integration after a supply-chain concern and strengthened
  secret scanning, token setup, and authenticated publishing workflows.
