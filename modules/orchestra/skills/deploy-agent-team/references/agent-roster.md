# Agent Roster

Full installed agent roster with `subagent_type` identifiers and the skills to mention in each agent's spawn prompt.

> **Why mention skills in spawn prompts?** Each agent has specialized skills available, but agents only invoke skills they're told about. If you don't mention `Skill(semgrep)` in the code-auditor's prompt, it may skip static analysis entirely. Always tell agents which skills apply to their task.

> **Some of these skills are external.** `semgrep`, `codeql`, `differential-review`, and `secure-workflow-guide` come from the `trailofbits/skills` marketplace (plugins `static-analysis`, `differential-review`, `building-secure-contracts`). They resolve by bare name when installed and are simply absent when not — no error. Naming an uninstalled skill in a spawn prompt is worse than omitting it, because the agent reports against a pass it never ran. Add one line to any prompt naming them: *"If a skill isn't available, say which one and what you did instead."*

## Roster

| Agent | subagent_type | Model | Best for |
|-------|--------------|-------|----------|
| **researcher** | `research:researcher` | sonnet | Libraries, APIs, docs, competitive analysis, web sources |
| **nextjs** | `web-dev:nextjs` | sonnet | Next.js, React, Vercel, Turbopack, RSC, app router |
| **native-desktop** | `creative:native-desktop` | sonnet | Native SDK, Zig, system WebViews, menu-bar apps, signed DMGs |
| **designer** | `web-dev:designer` | sonnet | UI components, game HUDs, TV shells, controller/remote focus, design systems, accessibility |
| **agent-builder** | `orchestra:agent-builder` | opus | AI SDK v7 agents, tool-calling, durable runtime selection, conditional eve evaluation |
| **database** | `dev-ops:database` | opus | Schema design, query optimization, PostgreSQL, Redis, Convex |
| **integration-expert** | `dev-ops:integration-expert` | sonnet | REST APIs, webhooks, third-party services |
| **code-auditor** | `review:code-auditor` | opus | Security review, vulnerability scanning, code quality |
| **tester** | `review:tester` | sonnet | Unit, integration, e2e tests, mocking, coverage, CI |
| **documentation-writer** | `research:documentation-writer` | sonnet | READMEs, API docs, PRDs, guides |
| **devops** | `dev-ops:devops` | sonnet | Vercel+Railway+Bun deployments, CI/CD, monitoring |
| **optimizer** | `web-dev:optimizer` | opus | Bundle analysis, Lighthouse, runtime perf, Core Web Vitals |
| **architecture-reviewer** | `review:architecture-reviewer` | opus | System design review, refactoring strategy, tech debt |
| **mobile** | `web-dev:mobile` | sonnet | Expo-first React Native, Swift, Kotlin, Flutter |
| **data** | `dev-ops:data` | sonnet | ETL pipelines, analytics, data visualization |
| **payments** | `dev-ops:payments` | sonnet | Stripe, billing, financial transactions |
| **mcp** | `mcp-dev:mcp` | sonnet | MCP server setup, config, diagnostics |
| **marketer** | `product-skills:marketer` | sonnet | CRO, SEO, copy, launch strategy |
| **social-media-manager** | `brand-rep:social-media-manager` | sonnet | Owned-account posts, calendars, mention replies, humanize pass |
| **account-manager** | `brand-rep:account-manager` | sonnet | Public pre-sales, visitor chat, booking |
| **legal** | `product-skills:legal` | opus | Privacy, compliance, ToS, data protection |
| **audio-specialist** | `creative:audio-specialist` | sonnet | Audio, xAI/Grok generation, ElevenLabs |
| **prompt-engineer** | `plugin-kit:prompt-engineer` | sonnet | Slash commands, skills, hooks, YAML frontmatter |
| **consolidator** | `review:consolidator` | sonnet | File structure cleanup, deduplication, organization |

## Per-Agent Skills to Mention in Spawn Prompts

### code-auditor

```markdown
## Your Available Skills
- `Skill(semgrep)` — invoke for static analysis and vulnerability pattern scanning
- `Skill(codeql)` — invoke for deep semantic code analysis
- `Skill(differential-review)` — invoke to audit diffs between branches
- `Skill(secure-workflow-guide)` — invoke for secure CI/CD and workflow patterns

Invoke these BEFORE writing any security findings.
```

### designer

```markdown
## Your Available Skills
- `Skill(frontend-design)` — invoke for UI component and layout guidance
- `Skill(web-design-guidelines)` — invoke for design system rules and patterns
- `Skill(ui-audio-theme)` — invoke for audio/motion design patterns
- `Skill(creative:design-game-ui)` — invoke for game HUDs, TV interfaces, controller/remote input maps, and spatial focus navigation
- `Skill(vercel-react-best-practices)` — invoke for React + Vercel performance rules

Invoke `Skill(frontend-design)` first before designing any component.
```

### optimizer

```markdown
## Your Available Skills
- `Skill(web-dev:frontend-performance)` — invoke for Core Web Vitals and bundle optimization
- `Skill(vercel-react-best-practices)` — invoke for Vercel-specific perf patterns
- `Skill(vercel-composition-patterns)` — invoke for RSC composition and streaming

Invoke performance skill before auditing any file.
```

### architecture-reviewer

```markdown
## Your Available Skills
- `Skill(semgrep)` — invoke for structural code pattern analysis
- `Skill(secure-workflow-guide)` — invoke when reviewing CI/CD or access patterns
- `Skill(vercel-react-best-practices)` — invoke for frontend architecture patterns

Use these to ground your review in concrete analysis, not just intuition.
```

### nextjs

```markdown
## Your Available Skills
- `Skill(vercel-react-best-practices)` — invoke before any RSC, streaming, or routing work
- `Skill(vercel-composition-patterns)` — invoke for layout and composition patterns
- `Skill(web-dev:create-next-project)` — invoke when scaffolding a new Next.js project

Always invoke `Skill(vercel-react-best-practices)` before writing any server component or route handler.
```

### native-desktop

```markdown
## Your Available Skills
- `Skill(macos-design)` — invoke before consequential macOS window, menu, or interaction decisions
- `Skill(native-sdk-macos-release)` — invoke when scaffolding or shipping a signed, notarized Native SDK macOS DMG
- `Skill(core:check-version)` — invoke before Native SDK scaffolding or migration decisions
- `Skill(agent-browser)` — invoke for current Native SDK, Zig, and Apple platform documentation
- `Skill(visual-review)` — invoke for reviewable desktop UI and release-flow recaps
- `Skill(confess)` — invoke before completion to catch unsupported assumptions and missed release gates

Use the Native SDK for new desktop applications. Treat Wails, Electron, and ElectroBun as migration sources only.
```

### researcher

```markdown
## Your Available Skills
- `Skill(agent-browser)` — invoke for scraping pages, extracting structured data from web content
- `Skill(research:x-research)` — invoke for real-time X/Twitter data and trends
- `Skill(notebooklm)` — invoke for deep synthesis of multiple research sources

Use `Skill(agent-browser)` for any page that requires interaction or dynamic loading.
```

### integration-expert

```markdown
## Your Available Skills
- `Skill(resend:resend)` — Resend's own skill (`npx skills add resend/resend-skills`). Do not invent a wrapper.
- `Skill(mcp-integration)` — invoke when integrating with MCP servers

Invoke the relevant skill before starting any third-party integration.
```

### devops

```markdown
## Your Available Skills
- `Skill(semgrep)` — invoke to scan CI/CD configuration for security issues
- `Skill(codeql)` — invoke for deep workflow security analysis
- `Skill(product-skills:saas-launch-audit)` — invoke before any production deployment
- `Skill(plugin-kit:npm-publish)` — invoke when publishing packages

Always run `Skill(product-skills:saas-launch-audit)` before a production deploy.
```

### agent-builder

```markdown
## Your Available Skills
- `Skill(ai-sdk)` — invoke before any Vercel AI SDK work for current API patterns
- `Skill(superpowers:dispatching-parallel-agents)` — invoke when designing multi-agent orchestration
- `Skill(orchestra:deploy-agent-team)` — invoke when implementing team coordination patterns

Invoke `Skill(ai-sdk)` first for any Vercel AI SDK or agent framework work.
For bOpen runtime decisions, preserve the approved conditional posture: eve
must stay behind the bOpen-owned ACL/persistence proxy and pass the hard Phase-2
go/no-go; failed seam proofs select the v7-native runtime.
```

### documentation-writer

```markdown
## Your Available Skills
- `Skill(core:humanize)` — invoke to review docs for filler and vague language
- `Skill(creative:cli-demo-gif)` — invoke to create terminal demo GIFs for docs

Invoke `Skill(core:humanize)` after drafting to eliminate padding.
```

### social-media-manager

```markdown
## Your Available Skills
- `Skill(core:humanize)` — invoke on every draft before you hand it over
- `Skill(marketing-skills:social)` — invoke for platform cadence and post shape
- `Skill(research:persona)` — invoke when matching a named voice
- `Skill(research:x-research)` — invoke before posting about a live conversation on X

Always run `Skill(core:humanize)` last. If it is missing, say so and do not ship the post.
Typefully is a third-party scheduler. If the user uses it, install
`typefully/agent-skills`. Do not wrap their API.
```

### marketer

```markdown
## Your Available Skills
- `Skill(marketing-skills:cro)` — invoke for landing page conversion optimization
- `Skill(marketing-skills:seo-audit)` — invoke for SEO analysis
- `Skill(marketing-skills:copywriting)` — invoke for persuasive copy guidance
- `Skill(marketing-skills:launch)` — invoke when planning a product launch
- `Skill(marketing-skills:programmatic-seo)` — invoke for programmatic SEO strategies

Invoke the most relevant skill before starting any campaign or page work.
```

### tester

```markdown
## Your Available Skills
- `Skill(webapp-testing)` — invoke for web application testing patterns and setup
- `Skill(property-based-testing)` — invoke for generating property-based test cases

Invoke `Skill(webapp-testing)` before setting up any test infrastructure.
```

### payments

```markdown
## Your Available Skills
- `Skill(dev-ops:plaid-integration)` — invoke for any Plaid/banking integration work

Review Stripe docs directly via WebFetch for current API patterns.
```
