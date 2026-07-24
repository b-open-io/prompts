# Context-safe plugin architecture

Status: proposed migration architecture
Tracking epic: OPL-3181
Prior investigation: OPL-3045

## Problem

bopen-tools is a monolithic distribution containing skills, agents, commands,
hooks, and third-party symlinks for many unrelated domains. Both Claude and
Codex pay startup context for model-visible routing metadata. Codex has already
reached states where descriptions are completely removed and skills are still
omitted, proving that catalog cardinality—not only long `SKILL.md` bodies—is the
binding constraint.

Shrinking bodies improves on-invocation cost but does not solve startup
omissions. Raising a host budget is useful for diagnosis but increases the
permanent prompt tax and cannot be the architectural fix.

## Design constraints

1. Preserve every public capability through a direct invocation or optional
   installation path.
2. Keep deterministic hooks separate from model-visible routing metadata.
3. Avoid a convenience umbrella that automatically re-enables every optional
   pack.
4. Keep Claude and Codex invocation policies explicit and testable.
5. Treat agents as part of the startup catalog; splitting skills alone is
   insufficient.
6. Keep third-party provenance and update ownership intact.
7. Make source, packaged, and installed inventories reproducible.

## Proposed distributions

### bopen-core

The default install. It should contain only capabilities that are useful in
most development sessions:

- runtime/session context
- hook setup and management
- front-door routing and diagnostics
- a minimal set of universal completion/safety utilities
- shared hook scripts and host manifests

Target budget:

- at most 12 implicit skills
- at most 180 characters per implicit description
- at most 2,200 aggregate implicit-description characters
- no startup omissions in a clean host profile

### bopen-orchestration

- coordinator
- advisor
- orchestrator
- wave coordinator
- software factory
- ClauDex and related execution-lane guidance

### bopen-design

- visual review and visual proposal
- generative UI and charting
- game UI, Three.js, shaders, and audio themes
- design-oriented agents

### bopen-release-ops

- publishing and release requests
- CI waiting and deployment
- Next.js upgrades and statusline/setup operations
- DevOps agents

### bopen-testing-security

- benchmarks and free-roam testing
- performance and code-audit workflows
- tester, optimizer, security, and audit agents

### bopen-integrations

- MCP Apps
- authentication and Plaid
- service integration and database/data agents

### bopen-research-comms

- X research and NotebookLM
- humanization and communication workflows
- researcher, documentation, marketing, and content agents

### bopen-agent-dev

- agent lifecycle, persona, auditing, onboarding, and decommissioning
- prompt engineering and agent-builder personas
- generated Codex agent adapters

### bopen-third-party

- MCP Apps SDK skills
- JSON Render skills
- macOS design, Remotion, Wayfinder, and other externally owned skills

This pack must preserve `skills-lock.json` provenance. Upstream content remains
upstream-owned; bopen-tools should not fork it merely to simplify packaging.

## Invocation policy

Each pack has two catalogs:

- **Implicit:** small routing surface for common, safe, naturally phrased
  requests.
- **Explicit-only:** publishing, deployment, interactive setup, narrow fetchers,
  and rare operations that users deliberately invoke.

Claude uses `disable-model-invocation: true`; Codex uses
`policy.allow_implicit_invocation: false` in `agents/openai.yaml`. A policy
change cannot ship until direct, indirect, negative, boundary, and ambiguity
tests demonstrate that intended routing is preserved.

`user-invocable: false` is not a context optimization; it changes who may invoke
a skill without removing its routing metadata.

## Shared implementation

The current repository remains the source of truth during migration:

- authored skills and agents stay in canonical source directories
- a pack manifest maps canonical resources into distributions
- a deterministic builder materializes regular files into each package
- the builder refuses duplicate ownership unless a resource is explicitly
  declared shared
- generated outputs are validated but not hand-edited

Shared hooks may be copied into more than one package only through the builder.
Installed packages must never depend on symlinks into another versioned cache.

## Compatibility

The existing `bopen-tools` name becomes the minimal core only after:

1. optional packs are published and installable
2. migration documentation maps every former capability
3. update behavior is verified on both hosts
4. fresh-session activation and execution tests pass
5. rollback to the last monolithic release is documented

During transition, the monolith remains available at its current version line.
No capability is deleted as part of the additive harness release.

## Migration sequence

1. Land static weight, exact host snapshots, and install-parity tooling.
2. Establish activation fixtures and retain baseline results.
3. Normalize only obviously explicit/manual workflows.
4. Implement the core builder and shared marketplace metadata.
5. Pilot orchestration, design, and third-party packs.
6. Verify context reduction, cross-pack routing, and update behavior.
7. Move remaining domains and agents.
8. Enforce per-pack budgets in CI.
9. Use 30–90-day aggregate usage data to refine implicit surfaces.

## Release and rollback

Every pack release must:

- patch-bump its Claude and Codex manifests together
- update its changelog and public inventory
- validate the packed artifact, not only the source checkout
- refresh both host marketplaces through their supported update paths
- run fresh-session context, activation, and execution smoke tests

Rollback means reinstalling the previous published package versions. Migration
must not require destructive changes to user settings or manually copied cache
files.

## Open decisions

- Final marketplace names and whether packs share one repository or use
  generated release repositories.
- Which 8–12 capabilities belong in core after routing evals.
- Whether agents are colocated with their domain packs or published in a
  dedicated agent catalog.
- How Codex should expose externally owned skills once repo-local symlinks are
  removed.
- The first stable per-pack context thresholds after clean-profile baselines
  exist.
