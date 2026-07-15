# Changelog

Notable user-visible changes to bopen-tools are documented here. This project
uses patch releases for normal development work; Claude Code and Codex plugin
manifests share the same release version.

## Unreleased

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
