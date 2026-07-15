# Changelog

Notable user-visible changes to bopen-tools are documented here. This project
uses patch releases for normal development work; Claude Code and Codex plugin
manifests share the same release version.

## Unreleased

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
