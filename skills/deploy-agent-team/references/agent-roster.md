# Agent Roster

Full bopen-tools agent roster with `subagent_type` identifiers and the skills to mention in each agent's spawn prompt.

> **Why mention skills in spawn prompts?** Each agent has specialized skills available, but agents only invoke skills they're told about. If you don't mention `Skill(semgrep)` in the code-auditor's prompt, it may skip static analysis entirely. Always tell agents which skills apply to their task.

## Roster

| Agent | subagent_type | Model | Best for |
|-------|--------------|-------|----------|
| **researcher** | `bopen-tools:researcher` | sonnet | Libraries, APIs, docs, competitive analysis, web sources |
| **nextjs** | `bopen-tools:nextjs` | sonnet | Next.js, React, Vercel, Turbopack, RSC, app router |
| **designer** | `bopen-tools:designer` | sonnet | UI components, Tailwind, shadcn/ui, design systems, accessibility |
| **agent-builder** | `bopen-tools:agent-builder` | opus | AI agent systems, tool-calling, LLM integration, Vercel AI SDK |
| **database** | `bopen-tools:database` | opus | Schema design, query optimization, PostgreSQL, Redis, Convex |
| **integration-expert** | `bopen-tools:integration-expert` | sonnet | REST APIs, webhooks, third-party services, Payload CMS |
| **code-auditor** | `bopen-tools:code-auditor` | opus | Security review, vulnerability scanning, code quality |
| **tester** | `bopen-tools:tester` | sonnet | Unit, integration, e2e tests, mocking, coverage, CI |
| **documentation-writer** | `bopen-tools:documentation-writer` | sonnet | READMEs, API docs, PRDs, guides |
| **devops** | `bopen-tools:devops` | sonnet | Vercel+Railway+Bun deployments, CI/CD, monitoring |
| **optimizer** | `bopen-tools:optimizer` | opus | Bundle analysis, Lighthouse, runtime perf, Core Web Vitals |
| **architecture-reviewer** | `bopen-tools:architecture-reviewer` | opus | System design review, refactoring strategy, tech debt |
| **mobile** | `bopen-tools:mobile` | sonnet | React Native, Swift, Kotlin, Flutter |
| **data** | `bopen-tools:data` | sonnet | ETL pipelines, analytics, data visualization |
| **payments** | `bopen-tools:payments` | sonnet | Stripe, billing, financial transactions |
| **mcp** | `bopen-tools:mcp` | sonnet | MCP server setup, config, diagnostics |
| **marketer** | `bopen-tools:marketer` | sonnet | CRO, SEO, copy, launch strategy |
| **legal** | `product-skills:legal` | opus | Privacy, compliance, ToS, data protection |
| **audio-specialist** | `bopen-tools:audio-specialist` | sonnet | Audio, xAI/Grok generation, ElevenLabs |
| **prompt-engineer** | `bopen-tools:prompt-engineer` | sonnet | Slash commands, skills, hooks, YAML frontmatter |
| **consolidator** | `bopen-tools:consolidator` | sonnet | File structure cleanup, deduplication, organization |

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
- `Skill(vercel-react-best-practices)` — invoke for React + Vercel performance rules

Invoke `Skill(frontend-design)` first before designing any component.
```

### optimizer

```markdown
## Your Available Skills
- `Skill(bopen-tools:frontend-performance)` — invoke for Core Web Vitals and bundle optimization
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
- `Skill(bopen-tools:create-next-project)` — invoke when scaffolding a new Next.js project

Always invoke `Skill(vercel-react-best-practices)` before writing any server component or route handler.
```

### researcher

```markdown
## Your Available Skills
- `Skill(agent-browser)` — invoke for scraping pages, extracting structured data from web content
- `Skill(bopen-tools:x-research)` — invoke for real-time X/Twitter data and trends
- `Skill(notebooklm)` — invoke for deep synthesis of multiple research sources

Use `Skill(agent-browser)` for any page that requires interaction or dynamic loading.
```

### integration-expert

```markdown
## Your Available Skills
- `Skill(bopen-tools:payload)` — invoke for any Payload CMS integration work
- `Skill(bopen-tools:resend)` — invoke for email sending integration with Resend
- `Skill(mcp-integration)` — invoke when integrating with MCP servers

Invoke the relevant skill before starting any third-party integration.
```

### devops

```markdown
## Your Available Skills
- `Skill(semgrep)` — invoke to scan CI/CD configuration for security issues
- `Skill(codeql)` — invoke for deep workflow security analysis
- `Skill(bopen-tools:saas-launch-audit)` — invoke before any production deployment
- `Skill(bopen-tools:npm-publish)` — invoke when publishing packages

Always run `Skill(bopen-tools:saas-launch-audit)` before a production deploy.
```

### agent-builder

```markdown
## Your Available Skills
- `Skill(ai-sdk)` — invoke before any Vercel AI SDK work for current API patterns
- `Skill(superpowers:dispatching-parallel-agents)` — invoke when designing multi-agent orchestration
- `Skill(bopen-tools:deploy-agent-team)` — invoke when implementing team coordination patterns

Invoke `Skill(ai-sdk)` first for any Vercel AI SDK or agent framework work.
```

### documentation-writer

```markdown
## Your Available Skills
- `Skill(bopen-tools:markdown-writer)` — invoke for markdown formatting and structure
- `Skill(bopen-tools:humanize)` — invoke to review docs for filler and vague language
- `Skill(bopen-tools:cli-demo-gif)` — invoke to create terminal demo GIFs for docs

Invoke `Skill(bopen-tools:humanize)` after drafting to eliminate padding.
```

### marketer

```markdown
## Your Available Skills
- `Skill(marketing-skills:page-cro)` — invoke for landing page conversion optimization
- `Skill(marketing-skills:seo-audit)` — invoke for SEO analysis
- `Skill(marketing-skills:copywriting)` — invoke for persuasive copy guidance
- `Skill(marketing-skills:launch-strategy)` — invoke when planning a product launch
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
- `Skill(bopen-tools:plaid-integration)` — invoke for any Plaid/banking integration work

Review Stripe docs directly via WebFetch for current API patterns.
```
