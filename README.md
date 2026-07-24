<p align="center">
  <img src="assets/banner.jpg" alt="bOpen Tools" width="100%" />
</p>

# bopen-tools: Prompts, Skills & AI Agents

**A shared toolkit for Claude Code and Codex** with specialist agents, skills,
orchestration patterns, safety hooks, and reusable development workflows.

## What This Repository Does

This repository provides:

- **Specialized AI agents** for design, security, documentation, architecture,
  testing, payments, infrastructure, and more
- **Cross-agent skills** shared by Claude Code and Codex
- **Runtime-specific hooks** that preserve the same safety and workflow intent
  on both hosts
- **Agent Master setup UI** for auditing the local harness, viewing purchased
  packs, opening advertised skill interfaces, and building runtime-specific
  setup plans without silently installing anything
- **Orchestration patterns** for a strong main model, native specialists,
  Grok implementation workers, and a read-only Fable advisor
- **Claude Code slash commands** for common workflows

See [CHANGELOG.md](CHANGELOG.md) for release notes and the reconstructed
historical baseline.

## Installation

### Claude Code

```bash
/plugin install bopen-tools@b-open-io
```

Claude Code discovers the plugin's agents, skills, commands, and Claude-specific
hooks directly.

### Codex

Add this repository as a Codex marketplace, then install the plugin:

```bash
codex plugin marketplace add b-open-io/prompts --ref master
codex plugin add bopen-tools@b-open-io
```

The Codex plugin installs the shared skills and Codex-specific hooks. Codex
custom-agent files are configured separately because Codex discovers them from
project or user agent directories rather than from a plugin manifest.

#### Install Codex custom agents

Ask Codex to invoke the explicit setup skill:

```text
Use $bopen-tools:codex-agent-setup to install the curated agents for this project.
```

The default installs a curated adapter set into the current project's
`.codex/agents/` directory. To make the full roster available across projects:

```text
Use $bopen-tools:codex-agent-setup to install all agents in user scope.
```

From a repository checkout, the equivalent commands are:

```bash
# Curated roster in this project (the safe default)
bash skills/codex-agent-setup/scripts/setup.sh

# Full roster in ${CODEX_HOME:-~/.codex}/agents/
bash skills/codex-agent-setup/scripts/setup.sh --user --all
```

The installer copies regular TOML files atomically, tracks only files it owns,
preserves user modifications and unrelated agents, and never changes
`~/.codex/config.toml`. Start a new Codex session after setup so the agents are
discovered. Installed runtime agent names use the `bopen_` prefix and
underscores, such as `bopen_agent_builder` and `bopen_code_auditor`. Generated
filenames retain the readable `bopen-*.toml` convention.

### Updating

Use each host's marketplace update path; do not copy files into a plugin cache
or rely on `git pull` to refresh an installed plugin.

```bash
# Claude Code
claude plugin update bopen-tools@b-open-io

# Codex: refresh the marketplace snapshot before reinstalling/updating
codex plugin marketplace upgrade
codex plugin add bopen-tools@b-open-io
```

Start a fresh Claude Code or Codex session after updating so cached plugin
metadata, skills, agents, and hooks are reloaded.

### Skills only

For other agentic frameworks, install individual skills:

```bash
bunx skills add b-open-io/bopen-tools --skill <skill-name>
```

The list below is the authored bopen-tools inventory. Third-party skills are
tracked separately in [`skills-lock.json`](skills-lock.json) and keep their
upstream provenance.

<details>
<summary><strong>Authored skills — click to expand</strong></summary>

```bash
bunx skills add b-open-io/bopen-tools --skill agent-auditor
bunx skills add b-open-io/bopen-tools --skill agent-decommissioning
bunx skills add b-open-io/bopen-tools --skill agent-onboarding
bunx skills add b-open-io/bopen-tools --skill advisor
bunx skills add b-open-io/bopen-tools --skill auth-md
bunx skills add b-open-io/bopen-tools --skill benchmark-skills
bunx skills add b-open-io/bopen-tools --skill charting
bunx skills add b-open-io/bopen-tools --skill check-version
bunx skills add b-open-io/bopen-tools --skill chrome-cdp
bunx skills add b-open-io/bopen-tools --skill claudex
bunx skills add b-open-io/bopen-tools --skill clawnet-cli
bunx skills add b-open-io/bopen-tools --skill cli-demo-gif
bunx skills add b-open-io/bopen-tools --skill code-audit-scripts
bunx skills add b-open-io/bopen-tools --skill codex-agent-setup
bunx skills add b-open-io/bopen-tools --skill confess
bunx skills add b-open-io/bopen-tools --skill coordinator
bunx skills add b-open-io/bopen-tools --skill cost-tracking
bunx skills add b-open-io/bopen-tools --skill create-next-project
bunx skills add b-open-io/bopen-tools --skill deploy-agent-team
bunx skills add b-open-io/bopen-tools --skill design-game-ui
bunx skills add b-open-io/bopen-tools --skill devops-scripts
bunx skills add b-open-io/bopen-tools --skill ezkl
bunx skills add b-open-io/bopen-tools --skill free-roam-testing
bunx skills add b-open-io/bopen-tools --skill front-desk
bunx skills add b-open-io/bopen-tools --skill frontend-performance
bunx skills add b-open-io/bopen-tools --skill generative-ui
bunx skills add b-open-io/bopen-tools --skill geo-optimizer
bunx skills add b-open-io/bopen-tools --skill github-stars
bunx skills add b-open-io/bopen-tools --skill hammertime
bunx skills add b-open-io/bopen-tools --skill hook-manager
bunx skills add b-open-io/bopen-tools --skill html-to-pdf
bunx skills add b-open-io/bopen-tools --skill humanize
bunx skills add b-open-io/bopen-tools --skill hunter-skeptic-referee
bunx skills add b-open-io/bopen-tools --skill linear-planning
bunx skills add b-open-io/bopen-tools --skill mcp-apps
bunx skills add b-open-io/bopen-tools --skill nextjs-upgrade
bunx skills add b-open-io/bopen-tools --skill notebooklm
bunx skills add b-open-io/bopen-tools --skill npm-publish
bunx skills add b-open-io/bopen-tools --skill orchestrator
bunx skills add b-open-io/bopen-tools --skill paperclip-plugin-dev
bunx skills add b-open-io/bopen-tools --skill perf-audit
bunx skills add b-open-io/bopen-tools --skill persona
bunx skills add b-open-io/bopen-tools --skill plaid-integration
bunx skills add b-open-io/bopen-tools --skill plugin-settings
bunx skills add b-open-io/bopen-tools --skill process-cleanup
bunx skills add b-open-io/bopen-tools --skill publish-request
bunx skills add b-open-io/bopen-tools --skill reinforce-skills
bunx skills add b-open-io/bopen-tools --skill remind
bunx skills add b-open-io/bopen-tools --skill runtime-context
bunx skills add b-open-io/bopen-tools --skill saas-launch-audit
bunx skills add b-open-io/bopen-tools --skill setup
bunx skills add b-open-io/bopen-tools --skill shaders
bunx skills add b-open-io/bopen-tools --skill shadscan
bunx skills add b-open-io/bopen-tools --skill skill-publish
bunx skills add b-open-io/bopen-tools --skill software-factory
bunx skills add b-open-io/bopen-tools --skill statusline-setup
bunx skills add b-open-io/bopen-tools --skill threejs-r3f
bunx skills add b-open-io/bopen-tools --skill ui-audio-theme
bunx skills add b-open-io/bopen-tools --skill visual-proposal
bunx skills add b-open-io/bopen-tools --skill visual-wayfinder
bunx skills add b-open-io/bopen-tools --skill visual-review
bunx skills add b-open-io/bopen-tools --skill voice-clone
bunx skills add b-open-io/bopen-tools --skill wait-for-ci
bunx skills add b-open-io/bopen-tools --skill wave-coordinator
bunx skills add b-open-io/bopen-tools --skill x-research
bunx skills add b-open-io/bopen-tools --skill x-tweet-fetch
bunx skills add b-open-io/bopen-tools --skill x-tweet-search
bunx skills add b-open-io/bopen-tools --skill x-user-lookup
bunx skills add b-open-io/bopen-tools --skill x-user-timeline
```

</details>

## Specialized AI Agents

The canonical agent personas live in [agents/](agents/). Claude Code loads them
directly from the plugin. Codex uses generated TOML adapters derived from those
same files, installed with the explicit setup described above. Every file in
`agents/` is an installable plugin persona. App-specific persistent deployments
and user-created agents stay in their owning projects and are not cataloged as
bopen-tools members.

### Development & Architecture
- 🔵 [**prompt-engineer**](agents/prompt-engineer.md) — Zack — Slash commands, agent skills, YAML frontmatter, Claude Code config
- 🏗️ [**architecture-reviewer**](agents/architecture-reviewer.md) — Kayle — Large-scale system design, refactoring, multi-file analysis
- 🔴 [**code-auditor**](agents/code-auditor.md) — Jerry — Security vulnerabilities, comprehensive code audits
- 🛡️ [**security-ops**](agents/security-ops.md) — Paul — Runtime security, dependency scanning, supply chain analysis, OWASP
- 🚀 [**optimizer**](agents/optimizer.md) — Torque — Runtime performance, bundle analysis, Core Web Vitals
- 🧪 [**tester**](agents/tester.md) — Jason — Testing strategies, evals, skill benchmarking, CI automation
- 🧹 [**consolidator**](agents/consolidator.md) — Steve — File organization, deduplication, naming conventions

### Platform & Infrastructure
- 🟠 [**devops**](agents/devops.md) — Root — Vercel + Railway + Bun stack, CI/CD, security scanning
- 🟢 [**database**](agents/database.md) — Idris — PostgreSQL, MySQL, MongoDB, Redis, SQLite, Turso, Convex
- 📱 [**mobile**](agents/mobile.md) — Kira — Expo-first React Native, Swift, Kotlin, Flutter
- 🖥️ [**native-desktop**](agents/native-desktop.md) — Ada — Native SDK, Zig, system WebViews, menu-bar apps, signed DMGs
- 🔗 [**integration-expert**](agents/integration-expert.md) — Maxim — API integrations, webhooks, third-party services
- 🟠 [**mcp**](agents/mcp.md) — Orbit — MCP servers and Apps, capability negotiation, JSON Render delivery, diagnostics, and publishing
- ⚡ [**nextjs**](agents/nextjs.md) — Theo — Next.js, React 19, Turbopack, Bun, Biome

### Specialized Domains
- 🔷 [**creative-developer**](agents/creative-developer.md) — Kris — Three.js, R3F, shaders, physics, diegetic and world-space interfaces
- 🗺️ [**cartographer**](agents/cartographer.md) — Leaf — MapLibre, Mapbox, Leaflet, CesiumJS, geospatial data
- 💚 [**payments**](agents/payments.md) — Mina — Payment integrations, Plaid, financial operations
- 🤖 [**agent-builder**](agents/agent-builder.md) — Satchmo — AI agent systems, tool-calling, multi-agent orchestration
- 📊 [**data**](agents/data.md) — Data Accumulator — Data processing, analytics, ETL pipelines
- 📣 **marketer** — Caal — Moved to `product-skills:marketer`
- 🗂️ [**project-manager**](agents/project-manager.md) — Wags — Linear planning, issue tracking, project organization

### Content & Communication
- 🟣 [**designer**](agents/designer.md) — Ridd — Web UI/UX plus game HUDs, controller/remote navigation, and ten-foot TV interfaces
- 🔷 [**documentation-writer**](agents/documentation-writer.md) — Flow — READMEs, API docs, PRDs, guides
- 🎵 [**audio-specialist**](agents/audio-specialist.md) — Frames — ElevenLabs audio, UI-audio audits and wiring, waveform editing, sound effects, and music generation
- 🩷 [**researcher**](agents/researcher.md) — Parker — Web research, docs, APIs, parallel research strategies
- 🎮 [**community-manager**](agents/community-manager.md) — Ordi — 1Sat Ordinals Discord bot, BSV community engagement

### Organization & Operations
- 👑 [**ceo**](agents/ceo.md) — Chief — Organization strategy, delegation, ownership, and executive decisions
- 💰 [**cfo**](agents/cfo.md) — Milton — Cost visibility, budgets, and financial operations
- 🎓 [**trainer**](agents/trainer.md) — Satoshi — Agent training, standards, and knowledge transfer
- 🏢 [**front-desk**](agents/front-desk.md) — Martha — Team directory, routing, service provider lookup
- 💼 [**executive-assistant**](agents/executive-assistant.md) — Tina — Google Workspace, scheduling, communications
- 🌐 [**account-manager**](agents/account-manager.md) — Kurt — Public-facing sales, visitor qualification, bOpen.io chat

**Usage:** In Claude Code, request the plugin agent by name (for example,
`bopen-tools:code-auditor`). In Codex, use its installed adapter name (for
example, `bopen_code_auditor`). If a Codex adapter is missing, run the setup
skill rather than pretending the specialist was spawned.

## Skills

Skills are context-triggered capabilities. They activate automatically or can be invoked directly. Install individually with `bunx skills add b-open-io/bopen-tools --skill <name>`.

### X/Twitter
| Skill | Description |
|-------|-------------|
| `x-research` | AI-powered X/Twitter research via the newest available general-purpose Grok model (requires `XAI_API_KEY`) |
| `x-tweet-fetch` | Fetch individual tweets by ID via X API v2 |
| `x-tweet-search` | Search recent X/Twitter posts by query (last 7 days) |
| `x-user-lookup` | Look up X/Twitter user profiles by username |
| `x-user-timeline` | Get recent tweets from an X/Twitter user |

`x-research` resolves the live xAI model catalog at the start of each research
task and selects the newest canonical general-purpose Grok model. Generic
`latest` aliases are treated as automatic selection because provider aliases
can lag; set a versioned `XAI_RESEARCH_MODEL` only when a reproducible pin is
intentional.

### Content & Media
| Skill | Description |
|-------|-------------|
| `charting` | Full-stack data visualization and charting |
| `cli-demo-gif` | Generate CLI demo GIFs using vhs (Charmbracelet) |
| `generative-ui` | Guardrailed JSON Render interfaces with flat specs, small catalogs, deterministic directives, and text fallbacks |
| `html-to-pdf` | Design print-ready collateral and render it through a Playwright PDF pipeline |
| `humanize` | Remove AI writing patterns and restore natural voice |
| `persona` | Capture writing style profiles and social intelligence |
| `ui-audio-theme` | Audit and wire existing products, then generate, visually edit, reassign, and audition cohesive app, game HUD, and TV navigation sound themes — via ElevenLabs samples or a synthesized cuelume web micro-interaction path, guided by a production-agnostic interaction taxonomy |
| `visual-proposal` | Present an unbuilt design, RFC, roadmap, or options space as a grounded, diagram-led HTML proposal. For real decisions it runs a default panel of named roster-agent advocates (with avatars) → cross-examination → a judging bench → the CEO's holistic final call, humanizes every voice, and ends with selectable option cards + a copy-response button that pastes a version-stamped reply back to the agent |
| `visual-wayfinder` | Turn one active Wayfinder decision into a build-free visual workbench with structured controls and consequence previews |
| `voice-clone` | Clone voices using ElevenLabs Instant Voice Cloning |

### Development & Quality
| Skill | Description |
|-------|-------------|
| `benchmark-skills` | Write evals for skills and measure impact vs baseline |
| `chrome-cdp` | Drive Chrome through a Bun-native Chrome DevTools Protocol CLI |
| `clawnet-cli` | Work with the ClawNet registry, identities, skills, and attestations |
| `code-audit-scripts` | Deterministic security and quality scans (secrets, debug artifacts) |
| `confess` | Analyze and document code issues and technical debt |
| `create-next-project` | Scaffold a new Next.js app with Bun and Biome |
| `design-game-ui` | Convert app content into controller/remote-first game HUD and television interfaces, composing audio, visual, 3D, performance, and QA specialists as needed |
| `ezkl` | Build and verify zero-knowledge machine-learning proofs with EZKL |
| `free-roam-testing` | Explore a running app like a curious human to discover new bugs and UX failures |
| `frontend-performance` | Optimize Next.js performance using Lighthouse and bundle analysis |
| `github-stars` | Add GitHub star counts and social proof widgets |
| `hunter-skeptic-referee` | Adversarial bug hunting with three isolated agents |
| `nextjs-upgrade` | Upgrade Next.js to latest version with Turbopack |
| `npm-publish` | Publish packages to npm with changelog and version management |
| `paperclip-plugin-dev` | Build and review Paperclip plugins against the worker and UI contracts |
| `perf-audit` | Run local performance audits without network calls |
| `shaders` | Custom shaders for Three.js and WebGL |
| `shadscan` | Drive the shadscan analyzer to audit and raise a shadcn app's UI-fundamentals score, and gate it in CI |
| `software-factory` | Design autonomous agent workflows with a real verification gate, bounded state, and stop conditions |
| `threejs-r3f` | Building Three.js and React Three Fiber projects |
| `visual-review` | Turn a PR, branch, or diff into a visual HTML review page |

### Agent & Plugin Management
| Skill | Description |
|-------|-------------|
| `agent-auditor` | Comprehensive audit for agents and skills across the plugin ecosystem |
| `agent-decommissioning` | Retire and remove agents from the team |
| `agent-onboarding` | End-to-end checklist for adding a new agent |
| `codex-agent-setup` | Explicitly install, check, update, or uninstall Codex custom-agent adapters |
| `deploy-agent-team` | Spin up parallel agents to work on tasks |
| `hammertime` | Write behavioral guardrail rules for the HammerTime stop hook |
| `hook-manager` | Discover and install automation hooks |
| `orchestrator` | Keep the current main in control across specialists, workers, and an advisor |
| `plugin-settings` | Choose official Claude Code configuration, project-owned state, or Agent Master skill-interface discovery without conflating them |
| `coordinator` | Specify and dispatch bounded implementation work to external workers |
| `advisor` | Obtain a read-only second opinion at a commitment boundary |
| `reinforce-skills` | Inject skill/agent routing maps into CLAUDE.md |
| `publish-request` | Prepare a human-reviewed release request without executing the publish |
| `skill-publish` | Publish and version bump plugins |
| `wave-coordinator` | Dispatch 5+ parallel agents with context budget management |

### Operations & DevOps
| Skill | Description |
|-------|-------------|
| `check-version` | Check if bopen-tools plugin is up to date |
| `claudex` | Run the Claude Code harness on GPT-5.6 Sol via a local CLIProxyAPI — an escape hatch when Anthropic usage runs out |
| `cost-tracking` | Track and report model and agent operating costs |
| `devops-scripts` | Shell scripts for infrastructure health checks |
| `linear-planning` | Plan projects and features using Linear |
| `notebooklm` | Query Google NotebookLM for source-grounded answers |
| `process-cleanup` | Find and clean up stale/resource-hungry processes |
| `remind` | Search and recall previous Claude Code conversation sessions |
| `runtime-context` | Detect agent execution environment (Claude Code, Vercel Sandbox, etc.) |
| `saas-launch-audit` | Audit SaaS applications for launch readiness |
| `setup` | Audit the local agent harness and build a runtime-specific setup plan in Agent Master |
| `statusline-setup` | Configure custom statusline for Claude Code |
| `wait-for-ci` | Wait for CI/CD pipelines to complete and act on results |

### Integrations
| Skill | Description |
|-------|-------------|
| `auth-md` | Design and validate WorkOS auth.md agent registration, ID-JAG, claim flows, Better Auth adapters, and delegated credential security without conflating adjacent protocols |
| `geo-optimizer` | Audit for AI visibility and optimize for ChatGPT/GEO |
| `mcp-apps` | Build secure MCP Apps with negotiated capabilities, exact CSP, structured data, and useful text fallbacks |
| `plaid-integration` | Banking data via Plaid API |

### Organization
| Skill | Description |
|-------|-------------|
| `front-desk` | Team directory, agent routing, and service provider lookup |

## Slash Commands

Slash commands are a Claude Code surface. Codex users invoke the corresponding
skills in natural language or with `$skill-name`. Claude commands use category
subdirectories, so nested files become category-prefixed commands while
root-level files keep their filename as the command.

- `/bug-hunt` - Adversarial bug hunt with 3 isolated agents — supports path or branch diff mode
- `/prime` - Context warm-up — loads git state, plugin inventory, and project conventions
- `/question` - Read-only Q&A mode — answers questions about the codebase without making changes
- `/diagnose` - Fan out 3-5 agents to investigate a bug from every angle simultaneously
- `/factory-init` - Design and scaffold an autonomous agent loop with explicit goals, gates, state, and stop conditions
- `/impact` - Map the full blast radius before changing a file or function
- `/review-wave` - 4 specialized reviewers examine changes simultaneously (security, perf, correctness, style)
- `/hammertime` - HammerTime behavioral rules — status dashboard (no args) or create a rule from a description
- `/hammertime:status` - HammerTime status dashboard (alias for `/hammertime` with no args)
- `/hammertime:manage` - Interactive rule management — enable, disable, remove, view, test rules
- `/hammertime:start` - Resume the HammerTime stop hook
- `/hammertime:stop` - Pause HammerTime until it is explicitly resumed
- `/visual-review` - Build a self-contained visual recap of a PR, branch, commit, or working-tree diff
- `/utils:context` - Generate repo context snapshot for agents

## Automation Hooks

Hooks are distributed with each plugin manifest; do not copy them into a home
directory. Shared scripts implement the common behavior, while
`hooks/claude-hooks.json` and `hooks/codex-hooks.json` adapt event names and
capabilities for each host.

| Hook | Claude Code | Codex | Description |
|------|-------------|-------|-------------|
| `session-context` | SessionStart | SessionStart | Injects bounded branch, history, and plugin context |
| `prompt-router` | UserPromptSubmit | — | Injects concise skill and agent routing hints with session deduplication |
| `bouncer` | Bash PreToolUse | Shell PreToolUse | Validates commands against safety rules |
| `damage-control` | Bash/write/edit PreToolUse | Shell/`apply_patch` PreToolUse | Protects sensitive paths and destructive operations |
| `publish-gate` | Bash PreToolUse | Shell PreToolUse | Guards publish commands behind release checks |
| browser guidance | `agent-browser-solo` on WebFetch | `browser-intent` on UserPromptSubmit | Encourages isolated browser automation without injecting page content into privileged hook context; ordinary Claude WebSearch remains native |
| `roster-guard` | Task PreToolUse | — | Warns when a generic Claude subagent is used where a roster specialist fits |
| `skill-activity` | Skill PreToolUse | — | Records bounded skill activity for the session UI and diagnostics |
| `hammertime` | Stop | Stop | Applies behavioral guardrails and can request another turn |

On first use, Codex may ask you to review and trust plugin hooks. Inspect the
commands before approving them. Do not use hook-trust bypass flags for normal
work; they exist for controlled diagnostics, not routine installation.

### HammerTime Stop Hook

HammerTime is a behavioral guardrail system that runs on every assistant response. It catches rule violations using three-layer scored detection:

| Layer | Signal | Score | Purpose |
|-------|--------|-------|---------|
| Keywords | Case-insensitive substring match | +1 each | Broad detection |
| Intent Patterns | Regex structural matching | +2 each | Paraphrase catching |
| Co-occurrence | Dismissal verb + qualifier in same sentence | +3 | Highest confidence |

**Score thresholds:** 0 = pass, 1-4 = optional Haiku verification, 5+ =
direct block. The verifier runs only when `ANTHROPIC_API_KEY` is configured;
otherwise an ambiguous match blocks conservatively. When it runs, it sends the
rule and up to the last 4,000 characters of the assistant response to
Anthropic. Complete single-quoted, double-quoted, and backtick-delimited spans
are excluded from deterministic scoring so examples, documentation, and search
terms do not masquerade as the assistant's own behavior.

**Loop safety:** Each rule has a `max_iterations` field (default: 3). The hook
tracks blocks per session and auto-allows exit when the limit is hit. Counters
reset on new sessions. Set `0` for unlimited. Existing Claude installations
continue to use `~/.claude/hammertime`; otherwise the cross-host default is
`~/.bopen-tools/hammertime`. Set `BOPEN_HAMMERTIME_HOME` to override it.

**Per-project rules:** Set `cwd_prefix` to a path string or an array of path
strings to evaluate a rule only in matching projects; omit it for a global
rule. HammerTime uses `CLAUDE_PROJECT_DIR` exactly when that environment
variable is set, otherwise `os.getcwd()`, and applies string `startswith`
matching after expanding `~` in each configured prefix. A malformed
`cwd_prefix` is skipped with a stderr warning instead of failing the hook.

**Full-turn evaluation:** Rules can opt into scoring ALL assistant messages since the user's last message (not just the final one). This catches violations in intermediate responses — e.g., the model dismisses an error mid-turn, then the final message just says "Done." Set `"evaluate_full_turn": true` on a rule to enable. The hook reads the session transcript JSONL backwards (last 2MB max).

Ships with a built-in `project-owner` rule that prevents dismissing errors as "pre-existing" (full-turn enabled).

#### Commands

| Command | Purpose |
|---------|---------|
| `/hammertime` | Status dashboard (no args) or create a rule from a description |
| `/hammertime:manage` | Interactive management — enable, disable, remove, view, test |
| `/hammertime:status` | Status dashboard (alias) |

#### Debugging

```bash
export HAMMERTIME_DEBUG="$HOME/.bopen-tools/hammertime/debug.log"
```

Debug log shows elapsed time, score breakdowns, transcript reads, and phase decisions:

```
[   1ms] LAST_MSG length: 2847 chars
[   3ms] TRANSCRIPT: found 7d5d184f-...jsonl
[   8ms] TRANSCRIPT: collected 3 assistant blocks, 4201 chars
[   8ms] FULL_TURN: scoring 1 rules against 4201 chars
[   9ms] SCORE: rule 'project-owner' score=7 (kw=3, intent=1, cluster=1)
[   9ms] BLOCK: score 7 >= 5, skipping Phase 2
```

Rules live under the selected HammerTime home. See the
[hammertime skill](skills/hammertime/SKILL.md) for the full rule authoring
guide.

## Agent Master and Unified Setup

The `setup` skill launches a local Agent Master UI that re-detects the current
harness on every refresh. It inventories bOpen plugins, Codex agent delivery,
CLIs, environment-key presence, third-party skills, and hook state; the UI then
turns selected gaps into a runtime-specific instruction plan for a human or
parent agent to execute. The zero-install fallback remains read-only. In the
playground, pack dependencies run only after an explicit **Install missing**
action and only from validated manifest fields.

Agent Master also exposes a signed-in **My Packs** library. Purchased packs are
matched to the current machine, their plugin dependencies are checked locally,
and missing requirements become explicit setup-plan steps. Launching setup with
`--pack <toc.json|pack.json>` computes the pack's complete plugin closure and
shows required-versus-installed dependencies for Claude Code, Codex, and Grok
Build.

Plugins may also declare optional `skillInterfaces` entries in
`setup/manifest.json`. Agent Master renders these as trusted bopen.ai links in
the plugin detail view; they advertise a skill-owned dashboard or configurator
without granting capabilities, persisting settings, or requiring the skill to
own a separate build. This release uses that contract for **Visual Wayfinder**.

When Agent Master is launched through Portless with `--agent-master`, it also
exposes an origin-restricted local broker at
`https://agent-master.localhost`. Skill pages on bopen.ai can detect that
explicit session and request one of three compiled-in interfaces: Deck
Creator, Visual Planner, or Visual Wayfinder. Each tool runs on its own named
Portless origin; the website never submits an arbitrary command or filesystem
path, and returned launch URLs are checked against the expected tool hostname.
The signed Agent Master desktop release uses this same broker as a Next.js
standalone build bundled with its pinned Bun and Portless runtimes, so desktop
users do not need a bOpen Tools checkout or global JavaScript tooling.
Managed interfaces allow up to 90 seconds for a cold production start before
reporting a launch failure. For HTTP Portless routes, the readiness probe
connects to the loopback proxy while preserving the tool's named origin in the
`Host` header using a direct loopback socket that bypasses environment proxy
settings. This keeps routing deterministic on machines whose resolver does not
support multi-label `.localhost` names or whose HTTP proxy ignores `NO_PROXY`;
the browser still receives the normal named tool URL.

```bash
portless agent-master bun skills/setup/scripts/playground_server.ts \
  --runtime <claude|codex|grok|opencode|hermes|generic> \
  --agent-master
```

Plugin and skill controls are declared in `settings.json` files validated by
[`settings.schema.json`](settings.schema.json). The SessionStart hook may inject
only declarations that opt into session context; sensitive values are always
excluded. See [settings declarations](docs/settings-declarations.md) for the
contract.

Ask an agent to use `bopen-tools:setup`, or launch the fallback directly from
an installed plugin root:

```bash
bun skills/setup/scripts/server.ts --runtime <claude|codex|grok|opencode|hermes|generic> [--pack <toc.json|pack.json>]
```

## Custom Statusline

**Moved to Plugin:** Statusline is now distributed as the `claude-peacock` plugin.

### Installation

```bash
/plugin marketplace add b-open-io/claude-plugins
/plugin install claude-peacock@b-open-io
```

Auto-configures on first session with:
- **Project tracking** - Shows CWD (⌂) and last edited project (✎)
- **Lint status** - Error/warning counts
- **Git branch** - Branch name with dirty indicator (*)
- **Clickable file paths** - OSC 8 hyperlinks to open in your editor
- **Peacock themes** - 24-bit true color from VSCode settings

### Configuration

No configuration needed - auto-detects code directory and editor!

Optional overrides:
```bash
export CODE_DIR="$HOME/custom/path"    # Override auto-detected code directory
export EDITOR_SCHEME="vscode"          # Override auto-detected editor
```

See the [claude-peacock plugin](https://github.com/b-open-io/claude-peacock) for full documentation.

## Repository Structure

```
prompts/
├── .claude-plugin/         # Claude Code plugin manifest
├── .codex-plugin/          # Codex plugin manifest
├── .agents/plugins/        # Codex marketplace manifest
├── agents/                 # Canonical authored agent personas
├── bots/                   # ClawNet deployment metadata
├── codex/agents/           # Generated Codex TOML adapters
├── commands/               # Claude Code slash commands
│   ├── factory-init.md      #   /factory-init
│   ├── hammertime/         #   /hammertime:* controls
│   └── utils/              #   /utils:context
├── hooks/                  # Shared scripts + host-specific hook manifests
├── plans/                  # Reviewed planning deliverables; implementation remains separately gated
├── skills/                 # Cross-agent skills (each has SKILL.md)
├── setup/manifest.json      # Declarative Agent Master dependency inventory
├── settings.json            # Repository-level settings declarations
├── settings.schema.json     # Settings declaration schema
├── benchmarks/             # Benchmark results (latest.json)
├── scripts/
│   ├── codex-agents/       # Adapter generator and safe installer
│   └── benchmark.tsx       # Skill benchmark CLI
├── docs/                   # Design notes and user-facing contracts
├── references/             # Shared agent reference documentation
├── tsconfig.json           # JSX config for benchmark CLI
├── CHANGELOG.md
├── README.md
└── QUICKSTART.md
```

### One source of truth, two host adapters

The repository avoids parallel hand-maintained copies:

- `agents/*.md` is the canonical persona and instruction source. The committed
  `codex/agents/*.toml` files are deterministic generated artifacts, and the
  generator's `--check` mode catches drift.
- Codex agent setup installs regular files instead of symlinks into a mutable
  plugin cache. Its ownership manifest enables safe updates without taking
  ownership of unrelated user files.
- Hook logic lives in shared scripts. The Claude and Codex JSON manifests only
  describe the different host event surfaces.
- The two plugin manifests have independent host schemas but share one release
  version and common metadata, checked by `scripts/check-plugin-manifests.py`.

Do not manually copy plugin contents into `~/.claude` or `~/.codex`, and do not
symlink agent definitions into a versioned plugin cache. Use the marketplace
and agent setup flows so upgrades remain reproducible.

## Skill Benchmarks

Skills with benchmark coverage keep eval cases in
`skills/<name>/evals/evals.json`. Each eval runs twice — once with the skill
injected and once as a bare baseline — and an LLM judge scores each assertion.
The delta is the signal. Not every authored skill has coverage yet; the CLI
runs the skills that currently include an `evals/` directory, and new or
materially changed skills should add focused cases where the behavior can be
judged reliably.

Live results: **[bopen.ai/benchmarks](https://bopen.ai/benchmarks)**

### Eval Format

Add evals alongside any skill at `skills/<name>/evals/evals.json`:

```json
[
  {
    "id": "basic-usage",
    "prompt": "Write a short README for a CLI tool called 'greet'",
    "assertions": [
      {
        "id": "has-install-section",
        "text": "The output includes an installation section",
        "type": "qualitative"
      },
      {
        "id": "has-usage-section",
        "text": "The output includes a usage section with an example command",
        "type": "qualitative"
      }
    ]
  }
]
```

### Running the Benchmark CLI

```bash
# Run all skills with evals
bun run scripts/benchmark.tsx

# Run a single skill
bun run scripts/benchmark.tsx --skill geo-optimizer

# Custom model or concurrency (use an ID available to your account)
bun run scripts/benchmark.tsx --model "${BENCHMARK_MODEL_ID:?set BENCHMARK_MODEL_ID}" --concurrency 5
```

Results are written to `benchmarks/latest.json`. Commit reviewed results to publish them to bopen.ai.

**Resume support:** Each eval result is cached by content hash (`benchmarks/cache/`). If a run is interrupted, restarting picks up where it left off — no tokens wasted.

### Writing Evals for Your Skill

Invoke the `benchmark-skills` skill to get guided help:

```
"Use the benchmark-skills skill to help me write evals for my skill"
```

Or ask the tester agent directly:

```
"Have the tester agent write evals for the x-research skill and run the benchmark"
```

### Publishing Results

Benchmarks run **locally** using your existing Claude session — no API key needed. They are not run in CI. Commit `benchmarks/latest.json` alongside the reviewed skill changes; bopen.ai picks up the committed results via ISR.

---

## Key Features

### 🚀 Instant Productivity
- Pre-built commands for common tasks
- Expert agents for specialized work
- Automation that works in the background

### 🔗 Ecosystem Integration
- Works with our entire BSV development stack
- Integrates with BigBlocks, Sigma Identity, and more
- Compatible with init-prism project generation

### 🛠️ Extensible
- Create custom commands with prompt-engineer
- Modify agents for your workflow
- Build new automation hooks

## Advanced Usage

### Working with Agents

Agents can be explicitly requested for specific tasks. Use Claude plugin IDs or
Codex adapter IDs according to the current host:

```
"Use bopen-tools:prompt-engineer to create a deployment command"   # Claude
"Have bopen_code_auditor review the authentication boundary"      # Codex
"Ask bopen_designer to review this component system"              # Codex
```

### Orchestration: Codex main, Grok workers, Fable advisor

Use the `orchestrator` skill when the current Claude Code or Codex main should
retain the plan, judgment, verification, and git ownership while other lanes do
bounded work:

```text
Use $bopen-tools:orchestrator. Keep this Codex session in the main seat, use
native bopen specialists for research and review, grok-4.5 for bounded worker
tasks, and Fable only for read-only second opinions at commitment boundaries.
```

The main model is always the model selected for the current session; the skill
does not pin or rename it. The supporting skills divide responsibilities:

- `coordinator` writes precise worker specs, assigns non-overlapping files,
  dispatches implementation, and requires acceptance reports. Its default Grok
  worker is `grok-4.5`, after confirming it appears in the complete
  `grok models` output. Override it with `BOPEN_WORKER_MODEL`.
- `advisor` packages a narrow, read-only consult. From a Codex main it can use
  the Claude CLI with the `fable` model-family alias. Override it with
  `BOPEN_ADVISOR_MODEL`.
- `orchestrator` composes native specialists, Coordinator, Advisor, and staged
  waves while leaving final decisions with the main session.

External lanes cross provider boundaries. A Grok dispatch can send its prompt,
specification, and selected repository content to xAI. A Fable consult can send
its consult and files inspected by read-only tools to Anthropic. State what will
be shared before first use, obtain approval unless the user already authorized
that lane, and never send secrets or unrelated proprietary content.

### Custom Workflows

Create project-specific automation by combining:

1. Specialized agents for expertise
2. Skills and, on Claude Code, slash commands for automation
3. Hooks for background tasks
4. Prompts for complex operations

## Common Use Cases

### Bug Hunting
```bash
/bug-hunt
```

### Documentation
```bash
"Have the documentation-writer create a comprehensive README"
```

### Agent Context
```bash
/utils:context
```



## Claude Code Permissions

Some Claude Code agents use CLI tools that require permission. To avoid
repeated prompts, add these to your `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(agent-browser:*)",
      "Bash(curl:*)",
      "Bash(jq:*)"
    ]
  }
}
```

Or use `/permissions` to add them interactively.

## Claude Code Skill Limits & Configuration

Claude Code has a default **15,000 character budget** for skill metadata. When you have many skills installed, some may be truncated from Claude's context.

### Symptoms
- `/skills` shows fewer skills than expected
- Claude doesn't recognize skills you know are installed
- "75 of 107 skills" type messages

### Fix: Increase the Budget

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

Then restart your terminal and Claude Code.

### Check Current Status

Run `/context` to see token usage and which skills are being truncated.

## Tips & Best Practices

1. **Use agents for expertise** - They have specialized knowledge
2. **Slash commands for speed**
3. **Combine tools** - Agents + commands = powerful workflows
4. **Keep updated** - Use the marketplace update commands in the Installation section, then start a fresh session

## Need Help?

- **New to Claude Code?** See our [Quick Start Guide](QUICKSTART.md)
- **Browse the toolkit:** Start with [agents/](agents/), [skills/](skills/),
  [commands/](commands/), and the shared [references/](references/)

## Contributing

When adding new content:
1. **Commands** go in `commands/` (root-level) or `commands/[category]/`
2. **Agents** go in `agents/`
3. **Hooks** go in `hooks/`
4. **Skills** go in `skills/`
5. Use the prompt-engineer agent for creating commands
6. Test thoroughly before committing
7. Update [CHANGELOG.md](CHANGELOG.md) for every user-visible plugin change
8. Update this README whenever public inventory, setup, or release instructions change

## Skill Provenance

Two layers track skill authorship and integrity:

- **`skills-lock.json`** — Vercel Labs format recording third-party skill sources, versions, and SHA256 content hashes. Ensures reproducible installs and detects tampering.
- **`.clawnet/` directories** — On-chain Bitcoin attestation (B + MAP + AIP + BAP ATTEST) for skills we author. Provides cryptographic proof of authorship anchored to the BSV blockchain.
