<p align="center">
  <img src="assets/banner.jpg" alt="bOpen Tools" width="100%" />
</p>

# OPL Prompts & AI Agents

**Supercharge Claude Code with specialized AI agents and prompts** for BSV blockchain development, project automation, and workflow optimization.

## What This Repository Does

This repository provides:
- **Specialized AI Agents** - Expert sub-agents for specific tasks (design, security, documentation, content, payments, auth, etc.)
- **Slash Commands** - Instant automation tools for common workflows
- **Automation Hooks** - Background workflows to enhance development
- **Powerful Prompts** - Reusable templates for complex operations

## Installation

**Full Plugin** (recommended - includes 28 agents, 49 skills, 8 commands, 4 hooks):
```bash
/plugin install bopen-tools@b-open-io
```

**Skills Only** (for other agentic frameworks — install individually):
```bash
bunx skills add b-open-io/bopen-tools --skill <skill-name>
```

<details>
<summary><strong>All 49 skills — click to expand</strong></summary>

```bash
bunx skills add b-open-io/bopen-tools --skill agent-auditor
bunx skills add b-open-io/bopen-tools --skill agent-decommissioning
bunx skills add b-open-io/bopen-tools --skill agent-onboarding
bunx skills add b-open-io/bopen-tools --skill benchmark-skills
bunx skills add b-open-io/bopen-tools --skill charting
bunx skills add b-open-io/bopen-tools --skill check-version
bunx skills add b-open-io/bopen-tools --skill cli-demo-gif
bunx skills add b-open-io/bopen-tools --skill code-audit-scripts
bunx skills add b-open-io/bopen-tools --skill confess
bunx skills add b-open-io/bopen-tools --skill create-next-project
bunx skills add b-open-io/bopen-tools --skill critique
bunx skills add b-open-io/bopen-tools --skill deploy-agent-team
bunx skills add b-open-io/bopen-tools --skill devops-scripts
bunx skills add b-open-io/bopen-tools --skill front-desk
bunx skills add b-open-io/bopen-tools --skill frontend-performance
bunx skills add b-open-io/bopen-tools --skill generative-ui
bunx skills add b-open-io/bopen-tools --skill geo-optimizer
bunx skills add b-open-io/bopen-tools --skill github-stars
bunx skills add b-open-io/bopen-tools --skill hammertime
bunx skills add b-open-io/bopen-tools --skill hook-manager
bunx skills add b-open-io/bopen-tools --skill humanize
bunx skills add b-open-io/bopen-tools --skill hunter-skeptic-referee
bunx skills add b-open-io/bopen-tools --skill linear-planning
bunx skills add b-open-io/bopen-tools --skill mcp-apps
bunx skills add b-open-io/bopen-tools --skill nextjs-upgrade
bunx skills add b-open-io/bopen-tools --skill notebooklm
bunx skills add b-open-io/bopen-tools --skill npm-publish
bunx skills add b-open-io/bopen-tools --skill perf-audit
bunx skills add b-open-io/bopen-tools --skill persona
bunx skills add b-open-io/bopen-tools --skill plaid-integration
bunx skills add b-open-io/bopen-tools --skill prd-creator
bunx skills add b-open-io/bopen-tools --skill process-cleanup
bunx skills add b-open-io/bopen-tools --skill reinforce-skills
bunx skills add b-open-io/bopen-tools --skill remind
bunx skills add b-open-io/bopen-tools --skill runtime-context
bunx skills add b-open-io/bopen-tools --skill saas-launch-audit
bunx skills add b-open-io/bopen-tools --skill shaders
bunx skills add b-open-io/bopen-tools --skill skill-publish
bunx skills add b-open-io/bopen-tools --skill statusline-setup
bunx skills add b-open-io/bopen-tools --skill threejs-r3f
bunx skills add b-open-io/bopen-tools --skill ui-audio-theme
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

Our 28 expert agents enhance Claude Code with specialized knowledge. See [agents/](agents/) for full details.

### Development & Architecture
- 🔵 [**prompt-engineer**](agents/prompt-engineer.md) — Zack — Slash commands, agent skills, YAML frontmatter, Claude Code config
- 🏗️ [**architecture-reviewer**](agents/architecture-reviewer.md) — Kayle — Large-scale system design, refactoring, multi-file analysis
- 🔴 [**code-auditor**](agents/code-auditor.md) — Nyx — Security vulnerabilities, comprehensive code audits
- 🛡️ [**security-ops**](agents/security-ops.md) — Paul — Runtime security, dependency scanning, supply chain analysis, OWASP
- 🚀 [**optimizer**](agents/optimizer.md) — Torque — Runtime performance, bundle analysis, Core Web Vitals
- 🧪 [**tester**](agents/tester.md) — Iris — Testing strategies, evals, skill benchmarking, CI automation
- 🧹 [**consolidator**](agents/consolidator.md) — Steve — File organization, deduplication, naming conventions

### Platform & Infrastructure
- 🟠 [**devops**](agents/devops.md) — Zoro — Vercel + Railway + Bun stack, CI/CD, security scanning
- 🟢 [**database**](agents/database.md) — Idris — PostgreSQL, MySQL, MongoDB, Redis, SQLite, Turso, Convex
- 📱 [**mobile**](agents/mobile.md) — Kira — React Native, Swift, Kotlin, Flutter
- 🔗 [**integration-expert**](agents/integration-expert.md) — Maxim — API integrations, webhooks, third-party services
- 🟠 [**mcp**](agents/mcp.md) — Orbit — MCP server setup, diagnostics, publishing to NPM, PostgreSQL/Redis/GitHub MCP
- ⚡ [**nextjs**](agents/nextjs.md) — Theo — Next.js, React 19, Turbopack, Bun, Biome

### Specialized Domains
- 🔷 [**creative-developer**](agents/creative-developer.md) — Kris — Three.js, R3F, shaders, physics, interactive 3D prototypes
- 🗺️ [**cartographer**](agents/cartographer.md) — Leaf — MapLibre, Mapbox, Leaflet, CesiumJS, geospatial data
- 💚 [**payments**](agents/payments.md) — Mina — Payment integrations, Plaid, financial operations
- 🤖 [**agent-builder**](agents/agent-builder.md) — Rowan — AI agent systems, tool-calling, multi-agent orchestration
- 📊 [**data**](agents/data.md) — Mr. Data Accumulator — Data processing, analytics, ETL pipelines
- 📣 [**marketer**](agents/marketer.md) — Caal — CRO, copywriting, SEO, launch strategy, email sequences
- 🗂️ [**project-manager**](agents/project-manager.md) — Sage — Linear planning, issue tracking, project organization

### Content & Communication
- 🟣 [**designer**](agents/designer.md) — Ridd — UI/UX, Tailwind, shadcn/ui, accessibility, dark mode
- 🔷 [**documentation-writer**](agents/documentation-writer.md) — Flow — READMEs, API docs, PRDs, guides
- 🎵 [**audio-specialist**](agents/audio-specialist.md) — Juniper — ElevenLabs audio, sound effects, music generation
- 🩷 [**researcher**](agents/researcher.md) — Parker — Web research, docs, APIs, parallel research strategies
- 🎮 [**community-manager**](agents/community-manager.md) — Ordi — 1Sat Ordinals Discord bot, BSV community engagement

### Organization & Operations
- 🏢 [**front-desk**](agents/front-desk.md) — Martha — Team directory, routing, service provider lookup
- 💼 [**executive-assistant**](agents/executive-assistant.md) — Tina — Google Workspace, scheduling, communications
- 🌐 [**account-manager**](agents/account-manager.md) — Kurt — Public-facing sales, visitor qualification, bOpen.io chat
- 🔴 [**satchmo-live**](agents/satchmo-live.md) — Satchmo — Persistent agent at satchmo.dev, BSV knowledge base

**Usage:** `"Use the [agent-name] to [specific task]"`

## Skills

Skills are context-triggered capabilities. They activate automatically or can be invoked directly. Install individually with `bunx skills add b-open-io/bopen-tools --skill <name>`.

### X/Twitter
| Skill | Description |
|-------|-------------|
| `x-research` | AI-powered X/Twitter research via xAI Grok (requires `XAI_API_KEY`) |
| `x-tweet-fetch` | Fetch individual tweets by ID via X API v2 |
| `x-tweet-search` | Search recent X/Twitter posts by query (last 7 days) |
| `x-user-lookup` | Look up X/Twitter user profiles by username |
| `x-user-timeline` | Get recent tweets from an X/Twitter user |

### Content & Media
| Skill | Description |
|-------|-------------|
| `charting` | Full-stack data visualization and charting |
| `cli-demo-gif` | Generate CLI demo GIFs using vhs (Charmbracelet) |
| `generative-ui` | Dynamic, AI-driven generative UI patterns |
| `humanize` | Remove AI writing patterns and restore natural voice |
| `persona` | Capture writing style profiles and social intelligence |
| `prd-creator` | Create PRDs with Shape Up + Working Backwards methodology |
| `ui-audio-theme` | Generate cohesive UI audio themes with subtle sound effects |
| `voice-clone` | Clone voices using ElevenLabs Instant Voice Cloning |

### Development & Quality
| Skill | Description |
|-------|-------------|
| `benchmark-skills` | Write evals for skills and measure impact vs baseline |
| `code-audit-scripts` | Deterministic security and quality scans (secrets, debug artifacts) |
| `confess` | Analyze and document code issues and technical debt |
| `critique` | Show diffs and provide constructive feedback on code changes |
| `create-next-project` | Scaffold a new Next.js app with Bun and Biome |
| `frontend-performance` | Optimize Next.js performance using Lighthouse and bundle analysis |
| `github-stars` | Add GitHub star counts and social proof widgets |
| `hunter-skeptic-referee` | Adversarial bug hunting with three isolated agents |
| `nextjs-upgrade` | Upgrade Next.js to latest version with Turbopack |
| `npm-publish` | Publish packages to npm with changelog and version management |
| `perf-audit` | Run local performance audits without network calls |
| `shaders` | Custom shaders for Three.js and WebGL |
| `threejs-r3f` | Building Three.js and React Three Fiber projects |

### Agent & Plugin Management
| Skill | Description |
|-------|-------------|
| `agent-auditor` | Comprehensive audit for agents and skills across the plugin ecosystem |
| `agent-decommissioning` | Retire and remove agents from the team |
| `agent-onboarding` | End-to-end checklist for adding a new agent |
| `deploy-agent-team` | Spin up parallel agents to work on tasks |
| `hammertime` | Write behavioral guardrail rules for the HammerTime stop hook |
| `hook-manager` | Discover and install automation hooks |
| `reinforce-skills` | Inject skill/agent routing maps into CLAUDE.md |
| `skill-publish` | Publish and version bump plugins |
| `wave-coordinator` | Dispatch 5+ parallel agents with context budget management |

### Operations & DevOps
| Skill | Description |
|-------|-------------|
| `check-version` | Check if bopen-tools plugin is up to date |
| `devops-scripts` | Shell scripts for infrastructure health checks |
| `linear-planning` | Plan projects and features using Linear |
| `notebooklm` | Query Google NotebookLM for source-grounded answers |
| `process-cleanup` | Find and clean up stale/resource-hungry processes |
| `remind` | Search and recall previous Claude Code conversation sessions |
| `runtime-context` | Detect agent execution environment (Claude Code, Vercel Sandbox, etc.) |
| `saas-launch-audit` | Audit SaaS applications for launch readiness |
| `statusline-setup` | Configure custom statusline for Claude Code |
| `wait-for-ci` | Wait for CI/CD pipelines to complete and act on results |

### Integrations
| Skill | Description |
|-------|-------------|
| `geo-optimizer` | Audit for AI visibility and optimize for ChatGPT/GEO |
| `plaid-integration` | Banking data via Plaid API |

### Organization
| Skill | Description |
|-------|-------------|
| `front-desk` | Team directory, agent routing, and service provider lookup |

## Slash Commands

Commands use category subdirectories: `/category:command` or `/command` for root-level commands.

- `/bug-hunt` - Adversarial bug hunt with 3 isolated agents (hunter, skeptic, referee)
- `/hammertime` - HammerTime behavioral rules — status dashboard (no args) or create a rule from a description
- `/hammertime:status` - HammerTime status dashboard (alias for `/hammertime` with no args)
- `/hammertime:manage` - Interactive rule management — enable, disable, remove, view, test rules
- `/prime` - Prime Claude with project context and session setup
- `/question` - Ask a focused question with structured research
- `/docs:prd` - Create comprehensive PRDs with Shape Up + Working Backwards methodology
- `/utils:context` - Generate repo context snapshot for agents

## Automation Hooks

Hooks are distributed automatically with the plugin — no manual installation needed.

| Hook | Event | Description |
|------|-------|-------------|
| `session-context` | SessionStart | Injects branch, commit history, and plugin inventory into session context |
| `bouncer` | PreToolUse (Bash) | Validates Bash commands against safety rules |
| `damage-control` | PreToolUse (Bash, Write, Edit, Read) | Prevents accidental destructive operations |
| `agent-browser-solo` | PreToolUse (WebSearch, WebFetch) | Routes web operations through the agent browser |
| `hammertime` | Stop | Catches bad model behaviors via scored rule matching with optional Haiku verification |

### HammerTime Stop Hook

HammerTime is a behavioral guardrail system that runs on every assistant response. It catches rule violations using three-layer scored detection:

| Layer | Signal | Score | Purpose |
|-------|--------|-------|---------|
| Keywords | Case-insensitive substring match | +1 each | Broad detection |
| Intent Patterns | Regex structural matching | +2 each | Paraphrase catching |
| Co-occurrence | Dismissal verb + qualifier in same sentence | +3 | Highest confidence |

**Score thresholds:** 0 = pass, 1-4 = Haiku verification (~500ms, ~$0.001), 5+ = direct block.

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
export HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log
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

Rules live at `~/.claude/hammertime/rules.json`. See the [hammertime skill](skills/hammertime/SKILL.md) for the full rule authoring guide.

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
├── agents/                 # Specialized AI agents
├── commands/               # Slash commands
│   ├── bug-hunt.md         #   /bug-hunt
│   ├── hammertime.md       #   /hammertime
│   ├── hammertime/         #   /hammertime:status, /hammertime:manage
│   ├── docs/               #   /docs:* commands
│   └── utils/              #   /utils:* commands
├── hooks/                  # Automation hooks (copy to ~/.claude/hooks)
├── skills/                 # Agent skills (each has SKILL.md + evals/)
├── benchmarks/             # Benchmark results (latest.json)
├── scripts/                # CLI tools (benchmark.tsx)
├── references/             # Reference documentation
├── tsconfig.json           # JSX config for benchmark CLI
├── README.md
└── QUICKSTART.md
```

## Skill Benchmarks

Every skill ships with evals that prove it works. Each eval runs twice — once with the skill injected, once as a bare baseline — and an LLM judge scores each assertion. The delta is the signal.

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
bun run benchmark

# Run a single skill

# Custom model or concurrency
bun run benchmark --model claude-opus-4-6 --concurrency 5
```

Results are written to `benchmarks/latest.json` and automatically published to bopen.ai after each CI run.

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

### CI Integration

Benchmarks run **locally** using your existing Claude session — no API key needed. Commit `benchmarks/latest.json` alongside your skill changes and push. CI validates that results are present and warns if you changed a skill without updating its benchmarks. bopen.ai picks up the committed results via ISR.

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

Agents can be explicitly requested for specific tasks:

```
"Use the prompt-engineer agent to create a deployment command"
"Have the bitcoin-specialist review this transaction builder"
"Ask the design-specialist about component library best practices"
```

### Custom Workflows

Create project-specific automation by combining:
1. Specialized agents for expertise
2. Slash commands for automation
3. Hooks for background tasks
4. Prompts for complex operations

## Common Use Cases

### Bug Hunting
```bash
/bug-hunt
```

### Documentation
```bash
/docs:prd "Project Name"
"Have the documentation-writer create a comprehensive README"
```

### Agent Context
```bash
/utils:context
```



## Recommended Permissions

Some agents use CLI tools that require permission. To avoid repeated prompts, add these to your `~/.claude/settings.json`:

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

## Skill Limits & Configuration

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
4. **Keep updated** - Pull latest from this repo to get new agents/prompts

## Need Help?

- **New to Claude Code?** See our [Quick Start Guide](QUICKSTART.md)
- **Browse examples:** Check the `design/` and `development/` directories

## Contributing

When adding new content:
1. **Commands** go in `commands/` (root-level) or `commands/[category]/`
2. **Agents** go in `agents/`
3. **Hooks** go in `hooks/`
4. **Skills** go in `skills/`
5. Use the prompt-engineer agent for creating commands
6. Test thoroughly before committing

## Skill Provenance

Two layers track skill authorship and integrity:

- **`skills-lock.json`** — Vercel Labs format recording third-party skill sources, versions, and SHA256 content hashes. Ensures reproducible installs and detects tampering.
- **`.clawnet/` directories** — On-chain Bitcoin attestation (B + MAP + AIP + BAP ATTEST) for skills we author. Provides cryptographic proof of authorship anchored to the BSV blockchain.
