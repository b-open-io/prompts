# OPL-3181 — Plugin context safety and harness release

- [x] Research Claude/Codex catalog budgets and inventory weight.
- [x] Create the approved Linear epic and child issue tree.
- [x] OPL-3182: add a deterministic static plugin-weight reporter.
- [ ] OPL-3183: add an exact Codex startup-context snapshot/parser
  (1.1.113 runtime-warning correction under release verification).
- [x] OPL-3184: add an exact Claude startup-cost snapshot/parser.
- [x] OPL-3185: add source/package/install inventory parity checks.
- [x] OPL-3189: document the domain-plugin architecture and migration plan.
- [ ] OPL-3193: add activation/routing eval schema, fixtures, and reporting
  (recorded-result scorer complete; fresh-host event adapters remain).
- [ ] OPL-3194: document and automate the cross-host release test matrix
  (deterministic/hook/live tiers complete; packed-artifact and retained live
  activation evidence remain).
- [x] Update public docs and the changelog.
- [x] Patch-bump both manifests together.
- [x] Run deterministic, host, packaging, documentation, and smoke checks.
- [x] Commit explicit reviewed paths, push, refresh both plugin installs, and
  verify the published version.
- [x] Close only Linear issues whose acceptance criteria are proven complete.

## Review

- Released bopen-tools `1.1.112` in commit `321c925`; a `1.1.113` correction is
  in progress because the static Codex prompt capture cannot contain the
  runtime omission warning.
- The static inventory reports 85 source skills (69 authored and 16
  third-party), 78 Claude-implicit skills, 83 Codex-implicit skills, 36,635
  description bytes, 31 agents, and 14 commands.
- Fifteen context-harness unit tests, the full hook suite, manifest/docs checks,
  generated Codex adapter checks, Claude validation, and a dereferenced packed
  inventory comparison pass.
- Installed Claude and Codex roots both report `1.1.112`; the live harness and
  install-parity check pass with the known 16-symlink Codex packaging warning.
- Fresh host smokes returned `CLAUDE_CONTEXT_HARNESS_OK` and
  `CODEX_CONTEXT_HARNESS_OK`. The fresh Codex run reproduced the target startup
  warning with every description removed and 76 additional skills omitted.
- OPL-3183 is temporarily back In Progress until the corrected 1.1.113
  published install passes. OPL-3182, OPL-3184, OPL-3185, OPL-3189, and the
  completed prior pass OPL-3045 are Done. OPL-3193 and OPL-3194 remain In
  Progress because live activation adapters, retained host evidence, and
  benchmark integration are not yet complete; behavior-changing migration
  issues remain Todo.

# HammerTime per-project scoping

- [x] Inspect the worktree, hook, tests, commands, skill docs, manifests, and release docs.
- [x] Add deterministic `cwd_prefix` filtering using the session project directory.
- [x] Extend HammerTime tests for global, matching, non-matching, array, tilde, and malformed scopes.
- [x] Document scope authoring and display Scope in rule tables.
- [x] Patch-bump synchronized plugin manifests and HammerTime skill metadata.
- [x] Run targeted tests, repository checks, and review the uncommitted diff.

## Review

- `session_project_dir()` uses `CLAUDE_PROJECT_DIR` when the variable exists and
  otherwise `os.getcwd()`; `rule_applies_to_project()` expands each configured
  prefix and uses lexical `startswith` matching.
- Rules without `cwd_prefix` remain global. A string or all-string array is
  valid; malformed values and mixed arrays warn on stderr and are skipped.
- The full hook harness passes 338 tests and the isolated timer eval passes
  13/13. Manifest, documentation, JSON, rendered status, scope-unit, and
  whitespace checks pass.
- Quoted/example spans are removed before deterministic scoring; the
  project-owner corpus now passes 27/27 with F1 1.00 and is wired into the
  full hook harness as a regression gate.
- Both plugin manifests are synchronized at `1.1.110`; no commit or push was
  performed.

# x-research latest Grok routing

- [x] Trace the skill, Parker agent, live xAI catalog, and official model guidance.
- [x] Add deterministic latest-compatible model selection with regression tests.
- [x] Update Parker, public docs, changelog, skill/agent versions, and manifests.
- [x] Validate and forward-test the source behavior.
- [x] Commit, push, refresh both plugin installs, and smoke-test the release.

## Review

- The live xAI catalog exposes `grok-latest` on Grok 4.3 while Grok 4.5 is the
  newest canonical general-purpose model. The previous prompt delegated that
  ambiguous choice to the agent, and its stale ClawNet payload still encoded a
  retired model that redirects to 4.3.
- `select-model.sh` now chooses the newest canonical general-purpose model by
  provider creation time, treats generic latest aliases as automatic intent,
  validates versioned pins, and excludes specialized model families.
- `research.sh` owns selection plus the Responses API call in one process. A
  live smoke returned `grok-4.5` and `X_RESEARCH_ROUTING_OK`; an isolated
  forward test also produced a Grok 4.5 dry-run request with no paid call.
- Bash syntax, selector/wrapper regressions, 7 adapter install tests, Codex
  generation, manifests, docs, diff checks, structural ClawNet validation, and
  generic skill validation (with the repository-required top-level `version`
  omitted from the temporary validator copy) pass.
- Released commit `be137ce` as plugin 1.1.84 and synchronized `origin/master`.
  Claude and Codex plugin caches both contain x-research 1.1.5; the standalone
  Codex skill was upgraded through the skills manager, and the managed Parker
  adapter is at 1.2.13. Fresh Claude and Codex sessions both selected
  `grok-4.5` in dry-run mode without calling the paid Responses endpoint.

# OpNS / 1sat.name ownership refresh

- [x] Clone and inspect the updated `b-open-io/1sat-name` product.
- [x] Audit the active `1sat:opns` skill and agent ownership.
- [x] Audit bopen.ai premium packs for OpNS and decentralized-name coverage.
- [x] Update Uno, the OpNS skill, routing, and the premium playbook.
- [x] Validate all touched repositories and record the review.

## Review

- Uno Satoj is the primary owner for OpNS acquisition and owned-name lifecycle
  operations. Mina supports BRC-105 payment/refund flows, David supports
  covenant and transaction verification, Theo supports site integration, and
  Ordi supports community education.
- Published and installed `1sat@b-open-io` 0.2.4 for Claude and Codex. The
  release documents 1sat.name claiming, marketplace purchase, job/refund
  handling, exact-name selection, identity publication, listing, and transfer.
- Preserved the pre-existing `1sat-sdk` persona and Uno tooling edits in a
  dedicated commit before integrating the OpNS release; the SDK is clean and
  synchronized with `origin/master`.
- Updated the existing `payments-blockchain` premium pack and its ordinals
  launch chain in bOpen.AI. The source update is committed locally but remains
  unpublished pending a separate website/pack release decision.
- Plugin generation checks, 13 adapter/materialization tests, both skill
  validators, pack construction, 28 pack tests, and bOpen.AI typechecking pass.
  The SDK's full build reaches macOS code signing and then requires
  `ELECTROBUN_DEVELOPER_ID`; the full test suite records 240 passes and 11
  pre-existing environment/mock failures.

# Dual Claude Code and Codex plugin port

## WorkOS auth.md skill

- [x] Verify WorkOS auth.md v0.6.0, the ID-JAG draft, RFC 9728, and Better Auth primary sources.
- [x] Map the four distinct protocol families and define safe flow-selection guidance.
- [x] Create `skills/auth-md` with a lean SKILL.md, focused references, a read-only discovery probe, and evals.
- [x] Route Satchmo through the skill with synchronized skills/tools metadata and a patch version bump.
- [x] Update README, CHANGELOG, inventories, and generated metadata without changing plugin manifests.
- [x] Run targeted skill, script, agent, documentation, repository, terminology, and secret-safety validation.
- [x] Review the exact diff and document release-only steps plus the separate Sigma Auth follow-up.

### Review

- Added the experimental WorkOS auth.md v0.6.0 skill with six focused
  references, a GET/HEAD-only discovery probe, five deterministic probe tests,
  and three protocol-confusion/security evals.
- A cache-free sequential benchmark in an isolated copy scored 67% with the
  skill versus 7% baseline (+60 percentage points). One correct with-skill
  response received a zero because the judge returned unparsable grading JSON;
  the reviewed result is preserved without replacing it with a favorable
  earlier sample. Release `1.1.81` publishes the reviewed aggregate for
  bopen.ai's ISR-backed benchmark page.
- Satchmo now routes agent identity, delegated signup, auth.md, ID-JAG, and
  agent-facing OAuth work through the skill at agent version `1.7.11`; the
  generated Codex adapter and manifest are synchronized.
- Both plugin manifests were synchronized at `1.1.81`, the release was pushed
  to the default branch, and both host marketplaces were refreshed and
  smoke-tested. The bopen-ai and Sigma repositories were not modified.
- Sigma follow-up: choose service/provider roles; pin the ID-JAG audience
  contract; publish RFC 9728 and authorization-server metadata; implement the
  custom Better Auth adapter and service-owned claim ceremony; separate agent
  tokens from browser sessions; enforce issuer/JWKS, expiry, `auth_time`,
  `jti`, client, tenant, consent, account-link, scope, revocation, audit, and
  incident controls; then run negative-path conformance tests with the probe.

## Visual Wayfinder and generative UI refresh

- [x] Inspect Wayfinder, JSON Render, generative UI, MCP Apps, settings, skill,
  agent, frontend, and browser-testing guidance.
- [x] Verify current JSON Render, MCP Apps, MCP SDK, and Claude Code settings
  contracts from primary sources and live package metadata.
- [x] Refresh the relevant pinned JSON Render imports and correct the React
  flat-spec example against the published package schema.
- [x] Build `visual-wayfinder` with a renderer-independent answer contract,
  constrained component catalog, tracker boundary, and text fallback.
- [x] Create and exercise a polished build-free desktop/mobile example UI.
- [x] Refresh the authored generative UI, MCP Apps, plugin settings, and Orbit
  guidance.
- [x] Add optional Agent Master skill-interface discovery for Visual Wayfinder.
- [x] Run repository validation, a fresh forward skill test, documentation and
  manifest checks, then patch-release and smoke-test both plugin installs.

### Review

- Visual Wayfinder keeps Wayfinder and the tracker authoritative: UI state is
  only a revision-checked draft, and the host-owned boundary submits a semantic
  answer rather than a rendered component tree.
- The self-contained demo exercises choice cards, an Other path, sliders,
  switches, tradeoff preview, rationale, text fallback, and an explicit review
  envelope. Desktop and 390 px mobile browser passes report no page errors.
- Agent Master's new `skillInterfaces` field derives bopen.ai destinations from
  validated plugin/skill slugs; it accepts no arbitrary URLs and adds no skill
  build step.
- The refreshed JSON Render imports are pinned to upstream `v0.19.0`. The
  React guide corrects an upstream nested-tree example using the published flat
  `root`/`elements` schema, and MCP guidance treats its adapter as scaffolding
  until exact CSP and submission boundaries are supplied by the host.

## OPL-2949 hook friendliness

- [x] Inventory bouncer, damage-control, publish-gate, and the requested Linear guard plus their output contracts.
- [x] Confirm current hook ownership and locate the prompts hook test harness.
- [x] Add safe alternatives to every blocking path in the prompts-owned guards.
- [x] Keep the extracted Linear guard in its owning plugin rather than silently restoring it to prompts; record the required follow-up.
- [x] Run shell syntax checks and hook tests, review the diff, and commit locally without a version bump or push.

### Review

- Added command-specific safe alternatives to bouncer and damage-control denials while preserving Claude stdout/exit-0 and Codex stderr/exit-2 contracts.
- Added a consistent `bopen-tools:publish-request` path to every publish-gate denial, including internal, API, approval, and on-chain acknowledgment failures.
- Extended hook tests to assert that friendly alternatives appear in both runtime output forms; the full prompts hook suite passes 308 tests.
- Did not restore `linear-commit-guard.sh`: commit `b38b8fa` removed it when linear-sync became a standalone plugin, and its current source checkout is already dirty with unrelated changes. That fix must be made and committed in a clean linear-sync worktree.
- Left both plugin manifests unchanged and did not push.

## OPL-2945 native agents

- [x] Read the full spec, house agent guidance, required exemplars, and named ground-truth repositories.
- [x] Inventory persona names, skill IDs, roster surfaces, versions, and the clean working-tree baseline.
- [x] Create the Native SDK desktop specialist in the house agent format.
- [x] Tune Kira to make Expo and React Native the default house mobile stack and patch-bump her version.
- [x] Add the desktop specialist to every roster and routing surface plus the CLAUDE.md color scheme.
- [x] Validate agent structure, prose constraints, version policy, manifests, roster coverage, and uncommitted state.

### Review

- Added Ada, the Native SDK and Zig desktop specialist, with an explicitly pending avatar and verified skill references.
- Updated Kira to an Expo-first React Native default while preserving native iOS, native Android, and Flutter expertise.
- Wired the new agent through authored directories, dispatch rosters, organization metadata, architecture maps, and generated Codex adapters.
- Validated JSON, YAML frontmatter, agent parsing, version bumps, prose constraints, roster uniqueness, generated adapters, plugin-manifest sync, and the no-bot boundary.
- Left the complete working tree uncommitted and did not edit either plugin manifest.

## Plugin agent boundary correction

- [x] Remove the app-specific `satchmo-live` deployment from plugin agent discovery.
- [x] Remove live-service routing and roster references from distributed plugin metadata.
- [x] Make the installable-persona versus app deployment boundary explicit.
- [x] Add Orbit's missing canonical agent title and regenerate Codex adapters.
- [x] Patch-bump both manifests, validate, commit, push, and smoke-test both installs.

### Review

- The plugin now has 30 source agents and 30 generated Codex adapters; all 30
  source agents have canonical `title` metadata.
- `satchmo-live` is absent from agent discovery, generated manifests, the
  company roster, the README, and front-desk routing.
- App-specific persistent agents and user-created deployments are documented
  as belonging to their owning projects rather than this plugin catalog.
- Released both manifests at `1.1.30` in commit `3953dbe`, updated both
  installed plugin caches, and verified the published artifact contains 30
  agents, no `satchmo-live`, and Orbit's `MCP Specialist` title.
- Fresh Claude and Codex sessions returned `CLAUDE_AGENT_BOUNDARY_OK` and
  `CODEX_AGENT_BOUNDARY_OK`; Codex SessionStart, UserPromptSubmit, and Stop
  hooks all completed.
- The updating Codex session remained pinned to the removed 1.1.29 hook path,
  so its three PreToolUse commands exited 127 after 1.1.30 replaced the cache.
  Fresh-session smoke tests prove the 1.1.30 hooks themselves are healthy; a
  session restart is required after replacing an active versioned cache.

- [x] Verify current Codex plugin, hook, and custom-agent contracts using
  official documentation and installed-runtime probes.
- [x] Design a shared prompt/include architecture that preserves the authored
  Claude agents while providing real Codex agent/orchestration support.
- [x] Get a read-only Fable advisor verdict on the architecture before broad
  edits.
- [x] Move Claude hooks to an explicit Claude-only configuration and fix bugs
  in the existing Claude behavior.
- [x] Implement Codex-native versions of useful hooks, including HammerTime,
  browser guidance, and session context where the runtime supports the spirit.
- [x] Add the Codex plugin manifest and repository marketplace metadata.
- [x] Make the coordinator/orchestrator and advisor patterns available in the
  installed Codex plugin, including Grok worker routing.
- [x] Validate Claude and Codex plugin behavior, install the published plugin into Codex,
  and smoke-test the installed toolkit from outside this repository.
- [x] Review the final diff, patch-bump both manifests, commit, push, update the
  Claude plugin, and verify `origin/master..master` is empty.

## Review

- Codex 0.144.0 supports real project and user custom agents. Plugin manifests
  do not install those agent files, so `agents/*.md` remains canonical and a
  deterministic generator plus explicit, ownership-aware installer provides
  regular TOML adapters without symlinks or hand-maintained prompt copies.
- A live isolated `gpt-5.6-sol` test installed the plugin and all 30 adapters,
  spawned `bopen_front_desk`, waited for it, and received
  `FRONT_DESK_AGENT_OK` from the child.
- Codex runtime agent identifiers require lowercase letters, digits, and
  underscores. The first live test caught hyphenated generated names; generator
  schema 2 now converts them and validates the runtime regex.
- Hook tests cover 113 cases across both runtimes. They include the existing
  Claude confirmation bug, nondestructive git unstaging, publish-gate GraphQL,
  Codex apply_patch protection, session context, browser guidance, and
  HammerTime continuation behavior.
- Released both manifests at `1.1.29`, pushed commit `65a8054`, updated the
  Claude plugin, installed the published Codex plugin and all 30 user-scope
  agents, and received `PUBLISHED_AGENT_OK` from `bopen_front_desk` in a fresh
  `gpt-5.6-sol` session. SessionStart, UserPromptSubmit, and Stop hooks all
  completed in that published-plugin smoke test.

## Game and television interface design capability

- [x] Turn the X and primary-platform research into a focused `design-game-ui`
  skill with progressive reference material and a concrete output contract.
- [x] Route Ridd to the new skill and preserve the boundary with 3D/diegetic
  interface work and framework-specific application engineering.
- [x] Add the new skill to every generated/distributed discovery surface and
  validate it with forward-trigger and non-trigger scenarios.
- [x] Create the skill's catalog artwork through Lisa and Gemskills, then
  register and optimize it in the bOpen.AI catalog.
- [x] Establish and backfill `CHANGELOG.md`, reconcile the README with the
  actual plugin inventory, and add automated documentation-drift checks.
- [x] Update publishing guidance so every plugin change maintains the
  changelog and public-surface changes maintain the README.
- [x] Run repository, skill, documentation, manifest, and installation tests.
- [x] Patch-bump both manifests, commit explicit paths, push master, refresh
  both plugin installs, and smoke-test fresh Claude and Codex sessions.
- [x] Add a bounded companion-capability map so Ridd composes Frames and
  `ui-audio-theme`, Lisa/Gemskills, Kris, Theo, Torque, and Jason when their
  production or validation lanes are triggered.
- [x] Keep UI audio non-duplicative: `design-game-ui` supplies semantic events,
  while Frames and `ui-audio-theme` own generation and the mandatory visual
  picker feedback loop.

### Review

- Added `design-game-ui` with eight focused references and an eleven-part design
  contract covering app preservation, semantic input, spatial focus, Back,
  television constraints, HUD feedback, accessibility, validation, and
  specialist ownership.
- Ridd now owns 2D game/TV interface work; Kris explicitly owns diegetic and
  world-space interfaces. Seven forward scenarios verify those boundaries.
- Established a reconstructed changelog baseline and exact README inventories,
  backed by a CI documentation guard and corrected dual-host publishing flow.
- Lisa generated eight referenced drafts; the approved D-pad/HUD emblem is
  registered, optimized, typechecked, and published in bOpen.AI commit
  `f5b1c36`.
- Pre-release gates pass: 329 hook tests, 7 installer tests, manifest parity,
  documentation inventory, generated adapters, YAML parsing, Python compile,
  catalog-art validation, bOpen.AI typecheck, and whitespace checks.
- Released both manifests at `1.1.77`; fresh Codex skill loading passed but
  exposed an unsupported `_comment` field in the Codex hook manifest. The
  follow-up `1.1.78` patch removes it, adds a schema regression assertion, and
  repeats marketplace refresh plus fresh Claude/Codex smoke tests.
- The `1.1.79` follow-up makes UI audio an explicit semantic handoff to Frames
  through `ui-audio-theme` and documents bounded visual, 3D, framework,
  performance, and QA composition without turning every request into a fan-out.
- `ui-audio-theme` remains the only UI-sound generator and now explicitly
  covers game menus, HUD feedback, and TV navigation. Its localhost visual
  picker is the default approval interface; `voice-clone` remains separate.
