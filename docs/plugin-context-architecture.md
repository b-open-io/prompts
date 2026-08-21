# Context-safe plugin architecture

Status: proposed migration architecture
Tracking epic: OPL-3181
Prior investigation: OPL-3045

## Problem

`bopen-tools`, since renamed to `core`, was a monolithic distribution
containing skills, agents, commands, hooks, and third-party symlinks for many
unrelated domains. Both Claude and
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
   module.
4. Keep Claude and Codex invocation policies explicit and testable.
5. Treat agents as part of the startup catalog; splitting skills alone is
   insufficient.
6. Keep third-party provenance and update ownership intact.
7. Make source, packaged, and installed inventories reproducible.

## Resolved mechanics

These were open questions in the first draft. All are now settled against the
shipped hosts rather than assumed.

### Naming: modules, not packs

**Decided.** Plugin distributions are **modules**. `pack` stays reserved for the
premium prompt packs sold on bopen.ai and managed by Agent Master, so the two
never collide in the product, the documentation, or the desktop interface.

### One repository, many modules

Both marketplaces already resolve a plugin from a subdirectory of the
marketplace repository. Anthropic's official marketplace uses a bare relative
path for its first-party entries:

```json
{ "name": "agent-sdk-dev", "source": "./plugins/agent-sdk-dev" }
```

and OpenAI's Codex marketplace uses the object form:

```json
{ "name": "linear", "source": { "source": "local", "path": "./plugins/linear" } }
```

No new repository is required, and the duplication and drift risk that
motivated one does not exist. Modules become subdirectories of this repository,
each carrying its own `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`
exactly as the root does today. Both host manifests already point at one shared
`skills/`, `agents/`, and `hooks/` tree, so the dual-host pattern is unchanged.

### Plugin dependencies exist

`plugin.json` accepts a `dependencies` array described as "Plugins that must be
enabled for this plugin to function. Bare names (no `@marketplace`) are resolved
against the declaring plugin's own marketplace." `claude plugin prune` removes
auto-installed dependencies once nothing needs them. Cross-module references
therefore have a supported expression, and a skill moving to another repository
stays reachable.

**A declared dependency stops the plugin loading when it is absent.** With
`dependencies: ["core"]` in its manifest, `orchestra` installs
correctly but its skills are invisible in any context where the core is not also
present — the loader skips the plugin silently instead of reporting the missing
dependency. Running its eval suite against the module alone scored 0/5 with every
case answering that no skill applied; removing the field scored 5/5 with nothing
else changed.

The first module therefore ships without `dependencies`. Its references to core
skills are prose recommendations in roster documents, so the module functions
alone and those references resolve for anyone who also has the core installed.
Use the field only where a module genuinely cannot function without another
plugin, and expect silent non-loading rather than an error when that plugin is
missing.

Codex's handling of `dependencies` remains untested.

### The Codex budget is global and proportional

The Codex skill budget is two percent of the selected model's context window —
`context_window * 2 // 100`, or 5,440 tokens on a 272,000-token model — and it
is shared across every installed plugin rather than allocated per plugin. Our
83 Codex-visible skills are roughly 23% of a 373-skill global catalog.

Two consequences govern the design. Splitting helps that host only when users
install fewer modules, so a core that quietly depends on everything returns the
catalog to its current size and achieves nothing. And every skill not forced on
a user is budget returned to the other plugins they chose.

### Redundancy

Skills and agents each belong to exactly one module and are moved rather than
copied, so no duplication arises there. Shared hook scripts are the only real
exposure, and hooks stay in core: the guards are universal and nobody wants them
scoped per domain. If a module ever needs its own hook, a builder materializes it
from one canonical source and the generated copy is never hand-edited.

## Module boundaries

The test applied to every boundary is whether someone would plausibly install
one side without the other. Cross-reference evidence comes from skills and
agents that cite each other by name.

### Subtractions first

Several resources belong to plugins that already own their domain. Removing them
is independently correct and shrinks the catalog before any split.

| Resource | Destination | Reason |
|---|---|---|
| `clawnet-cli` | clawnet | Duplicate; clawnet already ships a `clawnet-cli` skill |
| `linear-planning`, project-manager | linear-sync | linear-sync owns the Linear workflow |
| community-manager | 1sat (repo `1sat-sdk`) | BSV and 1Sat domain |
| `geo-optimizer`, `saas-launch-audit` | product-skills | Go-to-market already lives there |
| `ezkl` | bsv-skills or standalone | Unrelated to development tooling |
| `paperclip-plugin-dev`, ceo, cfo | Paperclip's own plugin | Organization simulation |

`agent-onboarding` and `agent-decommissioning` reference `clawnet-cli`, so its
move converts an internal reference into a declared cross-plugin dependency.

### Core

`setup` is referenced by `chrome-cdp`, `claudex`, `cost-tracking`,
`create-next-project`, `deploy-agent-team`, and `ezkl`. `front-desk` is
referenced by `agent-onboarding`, `agent-decommissioning`, and
`codex-agent-setup`. Those two plus session plumbing form the core:
`runtime-context`, `setup`, `check-version`, `hook-manager`, `confess`,
`remind`, `front-desk`, `humanize`, `reinforce-skills`, every hook, and the
front-desk agent.

### Modules

| Module | Contents |
|---|---|
| orchestration | coordinator, advisor, orchestrator, wave-coordinator, software-factory, deploy-agent-team, hammertime, claudex, codex-agent-setup; agent-builder |
| plugin-dev | agent-auditor, agent-onboarding, agent-decommissioning, benchmark-skills, plugin-settings, skill-publish, publish-request, npm-publish, statusline-setup; prompt-engineer, trainer |
| review | visual-review, visual-proposal, visual-wayfinder, hunter-skeptic-referee, code-audit-scripts, free-roam-testing, wayfinder; code-auditor, security-ops, architecture-reviewer, consolidator, tester |
| web | frontend-performance, perf-audit, shadscan, create-next-project, nextjs-upgrade, charting, github-stars, generative-ui, chrome-cdp; designer, nextjs, optimizer, mobile |
| creative | threejs-r3f, shaders, design-game-ui, ui-audio-theme, voice-clone, html-to-pdf, cli-demo-gif, macos-design, remotion-best-practices, native-sdk-macos-release; creative-developer, audio-specialist, native-desktop, cartographer |
| mcp | mcp-apps, create-mcp-app, add-app-to-server, convert-web-app, the nine json-render skills; mcp |
| ops | devops-scripts, wait-for-ci, process-cleanup, cost-tracking, plaid-integration; devops, database, data, integration-expert, payments |
| research | x-research, x-tweet-fetch, x-tweet-search, x-user-lookup, x-user-timeline, persona, notebooklm; researcher, documentation-writer, executive-assistant |
| public-agents | account-manager |

`coordinator`, `advisor`, `orchestrator`, and `wave-coordinator` cite each other,
which is the tightest cluster in the graph and makes orchestration the natural
pilot. `design-game-ui` cites `ui-audio-theme`, keeping them together.

**public-agents** is separated by audience rather than domain. Its personas
answer strangers on a public surface, which justifies a tighter tool policy than
a developer distribution can express: account-manager currently carries `Write`
and `Bash`, appropriate in a terminal and wrong in a website widget. Martha stays
in core because `front-desk` is internal routing that other skills depend on; her
deployed incarnation is already separate as `bots/martha.bot.json`.

**chrome-cdp** is gated by runtime environment rather than domain. It attaches to
a live Chrome session carrying the user's logins and needs a manual toggle, so it
assumes a human at a desktop. It sits in web because the person inspecting a live
page is usually building that page. agent-browser, which is headless and general,
belongs to a different plugin entirely.

Grouping the sixteen vendored skills into a single third-party module is rejected.
Provenance is already tracked in `skills-lock.json` and the `.clawnet`
attestations, and a provenance-based module would force someone doing MCP work to
install two distributions to get one coherent toolset.

## Downstream coupling

Splitting is not contained to this repository.

**Premium prompt packs** carry 886 `core:` references across 79 distinct
names in 216 files. Roughly 127 point at core and need no edit; about 760 need
rewriting, of which 98 point at resources leaving for other repositories. This
needs a rename script and a CI check that fails on any unresolvable reference.

**Agent Master** bundles pinned bOpen Tools and Gemskills runtimes into the
signed application, so end users never install plugin source. Splitting changes
what the app ships, what its harness audit reports, and what its configuration
wizard offers.

## Superseded: first-draft distributions

The original draft proposed eight distributions named as packs, including a
`bopen-third-party` grouping by provenance. Both the naming and that grouping
are superseded by "Module boundaries" above. Target budgets carry forward
unchanged: at most 12 implicit skills in core, at most 180 characters per
implicit description, and no startup omissions in a clean host profile.

## Invocation policy

Each module has two catalogs:

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
- a module manifest maps canonical resources into distributions
- a deterministic builder materializes regular files into each package
- the builder refuses duplicate ownership unless a resource is explicitly
  declared shared
- generated outputs are validated but not hand-edited

Shared hooks may be copied into more than one package only through the builder.
Installed packages must never depend on symlinks into another versioned cache.

## Compatibility

The existing `core` name becomes the minimal core only after:

1. optional modules are published and installable
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
5. Pilot the orchestration module.
6. Verify context reduction, cross-module routing, and update behavior.
7. Move remaining domains and agents.
8. Enforce per-module budgets in CI.
9. Use 30–90-day aggregate usage data to refine implicit surfaces.

## Release and rollback

Every module release must:

- patch-bump its Claude and Codex manifests together
- update its changelog and public inventory
- validate the packed artifact, not only the source checkout
- refresh both host marketplaces through their supported update paths
- run fresh-session context, activation, and execution smoke tests

Rollback means reinstalling the previous published package versions. Migration
must not require destructive changes to user settings or manually copied cache
files.

## Open decisions


- Which 8–12 capabilities belong in core after routing evals.

- How Codex should expose externally owned skills once repo-local symlinks are
  removed.
- The first stable per-module context thresholds after clean-profile baselines
  exist.
