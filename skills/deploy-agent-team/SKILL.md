---
name: deploy-agent-team
version: 1.0.0
description: This skill should be used when the user wants to deploy a team of specialized agents to work in parallel on a complex task. Use when breaking down large tasks into coordinated sub-tasks that require multiple domain experts working simultaneously — e.g. "build this feature", "audit and fix the whole codebase", "ship this product". Orchestrates Claude Code's experimental agent team system using our full kit of bopen-tools specialists.
---

# Deploy Agent Team

Deploy a coordinated team of specialized agents from the bopen-tools kit using Claude Code's agent team system. Agents work in parallel on independent tasks and communicate through a shared task list and message bus.

## Prerequisites

Agent teams require this env var to be set:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Add to `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Without this, `TeamCreate` will fail.

## Available Agent Roster

These are the bopen-tools agents available as teammates. Reference them by `subagent_type` when spawning:

| Agent | subagent_type | Model | Best for |
|-------|--------------|-------|----------|
| **research-specialist** | `bopen-tools:research-specialist` | sonnet | Researching libraries, APIs, docs, competitive analysis, web sources |
| **nextjs-specialist** | `bopen-tools:nextjs-specialist` | sonnet | Next.js, React, Vercel, Turbopack, RSC, app router |
| **design-specialist** | `bopen-tools:design-specialist` | sonnet | UI components, Tailwind, shadcn/ui, design systems, accessibility |
| **agent-specialist** | `bopen-tools:agent-specialist` | opus | AI agent systems, tool-calling, LLM integration, Vercel AI SDK |
| **database-specialist** | `bopen-tools:database-specialist` | opus | Schema design, query optimization, PostgreSQL, Redis, Convex |
| **integration-expert** | `bopen-tools:integration-expert` | sonnet | REST APIs, webhooks, third-party services, Payload CMS |
| **code-auditor** | `bopen-tools:code-auditor` | opus | Security review, vulnerability scanning, code quality |
| **test-specialist** | `bopen-tools:test-specialist` | sonnet | Unit, integration, e2e tests, mocking, coverage, CI |
| **documentation-writer** | `bopen-tools:documentation-writer` | sonnet | READMEs, API docs, PRDs, guides |
| **devops-specialist** | `bopen-tools:devops-specialist` | inherit | Vercel+Railway+Bun deployments, CI/CD, monitoring |
| **optimizer** | `bopen-tools:optimizer` | opus | Bundle analysis, Lighthouse, runtime perf, Core Web Vitals |
| **architecture-reviewer** | `bopen-tools:architecture-reviewer` | opus | System design review, refactoring strategy, tech debt |
| **mobile-specialist** | `bopen-tools:mobile-specialist` | sonnet | React Native, Swift, Kotlin, Flutter |
| **data-specialist** | `bopen-tools:data-specialist` | sonnet | ETL pipelines, analytics, data visualization |
| **payment-specialist** | `bopen-tools:payment-specialist` | inherit | Stripe, billing, financial transactions |
| **mcp-specialist** | `bopen-tools:mcp-specialist` | inherit | MCP server setup, config, diagnostics |
| **marketing-specialist** | `bopen-tools:marketing-specialist` | sonnet | CRO, SEO, copy, launch strategy |
| **legal-specialist** | `bopen-tools:legal-specialist` | opus | Privacy, compliance, ToS, data protection |
| **content-specialist** | `bopen-tools:content-specialist` | sonnet | Images, audio, xAI/Grok generation, ElevenLabs |
| **prompt-engineer** | `bopen-tools:prompt-engineer` | sonnet | Slash commands, skills, hooks, YAML frontmatter |
| **consolidator** | `bopen-tools:consolidator` | inherit | File structure cleanup, deduplication, organization |

## Full Team Lifecycle

### Step 1: Decompose the task

Before calling any tools, break the request into independent subtasks. Ask:
- What domains are involved? (frontend, backend, testing, docs, etc.)
- Which tasks can run in parallel vs. must be sequential?
- What are the dependencies? (schema before API, API before tests)

### Step 2: Create the team

```
TeamCreate(
  team_name: "feature-billing",
  description: "Implement Stripe billing with UI, API, tests, and docs"
)
```

### Step 3: Create tasks

Create all tasks upfront. Set dependencies with `addBlockedBy` where order matters:

```
TaskCreate(
  subject: "Design billing UI components",
  description: "Create PricingCard, BillingHistory, and UpgradeModal components
  using shadcn/ui. Repo: ~/code/myapp. Use Tailwind v4. Components go in
  src/components/billing/. Deliverable: typed, working components.",
  activeForm: "Designing billing UI"
)
→ id: "1"

TaskCreate(
  subject: "Implement Stripe integration",
  description: "Set up Stripe webhooks, subscription creation, and customer portal.
  Repo: ~/code/myapp. API routes in app/api/billing/.
  Deliverable: working checkout flow and webhook handler.",
  activeForm: "Implementing Stripe integration"
)
→ id: "2"

TaskCreate(
  subject: "Write billing test suite",
  description: "Write tests for all billing API routes and the Stripe webhook handler.
  Repo: ~/code/myapp. Use Vitest. Tests in __tests__/billing/.",
  activeForm: "Writing billing tests"
)
→ id: "3"

# Tests must wait for Stripe impl to be done
TaskUpdate(taskId: "3", addBlockedBy: ["2"])
```

### Step 4: Spawn teammates

Spawn one agent per independent domain. **Every spawn prompt must be self-contained** — teammates do not inherit your conversation history.

```
Agent(
  subagent_type: "bopen-tools:design-specialist",
  team_name: "feature-billing",
  name: "designer",
  prompt: "..."   # see Spawn Prompt Template below
)

Agent(
  subagent_type: "bopen-tools:integration-expert",
  team_name: "feature-billing",
  name: "backend",
  prompt: "..."
)

Agent(
  subagent_type: "bopen-tools:test-specialist",
  team_name: "feature-billing",
  name: "tester",
  prompt: "..."   # task 3 is blocked — tester will wait and self-claim when unblocked
)
```

### Step 5: Monitor and coordinate

Messages from teammates arrive automatically. Check overall progress:
```
TaskList()
```

Send a correction or answer to a blocked teammate:
```
SendMessage(
  type: "message",
  recipient: "backend",
  content: "Stripe webhook secret is STRIPE_WEBHOOK_SECRET in .env.local",
  summary: "Stripe secret location"
)
```

### Step 6: Shutdown and cleanup

```
SendMessage(type: "shutdown_request", recipient: "designer", content: "Work complete")
SendMessage(type: "shutdown_request", recipient: "backend", content: "Work complete")
SendMessage(type: "shutdown_request", recipient: "tester", content: "Work complete")

# Wait for each shutdown_response, then:
TeamDelete()
```

## Spawn Prompt Template

```markdown
You are part of the [TEAM_NAME] agent team working on [REPO_PATH].

## Your Role
[One sentence: what this agent specializes in]

## Task Workflow
1. Call TaskList to see available tasks
2. Claim an unowned, unblocked task that matches your expertise:
   TaskUpdate(taskId: "X", owner: "[YOUR_NAME]", status: "in_progress")
3. Call TaskGet(taskId) for the full description
4. Complete the work
5. Mark complete: TaskUpdate(taskId: "X", status: "completed")
6. Return to step 1 — repeat until no tasks remain for you
7. Report to lead when done:
   SendMessage(type: "message", recipient: "lead",
     content: "All my tasks complete. [Summary of what was done]",
     summary: "[5-10 word summary]")

## Project Conventions
- Bun (not npm)
- [Framework and version specifics]
- Biome for linting
- [Key file paths]
- [Any gotchas or constraints]

## Boundaries
Skip tasks outside your expertise — leave them for other teammates.
Blocked tasks (blockedBy) will not appear in TaskList until dependencies complete.
```

## Task Decomposition Patterns

### Feature implementation
```
Parallel from the start:
├── research-specialist: research best practices / prior art
├── design-specialist: UI components
├── nextjs-specialist or integration-expert: API / server logic
├── database-specialist: schema changes

Blocked until implementation complete:
├── test-specialist: test suite
└── documentation-writer: feature docs
```

### Security audit + fix
```
Parallel:
├── code-auditor: full vulnerability scan
└── architecture-reviewer: structural/design issues

Blocked until audit complete:
├── nextjs-specialist or integration-expert: fix findings
└── test-specialist: regression tests
```

### Launch prep
```
Parallel:
├── code-auditor: security review
├── test-specialist: coverage audit
├── optimizer: Lighthouse + bundle
├── documentation-writer: user-facing docs
└── legal-specialist: privacy / ToS

Blocked until all above complete:
└── devops-specialist: deploy pipeline
```

## Key Rules

- **Self-contained prompts**: teammates get zero conversation history. Include repo path, conventions, and full context in every spawn prompt.
- **One task at a time**: agents claim → complete → claim next. No parallel hoarding.
- **No JSON in messages**: use TaskUpdate for status. SendMessage content is plain text only.
- **Idle is normal**: teammates go idle between tasks. Send a message to wake them.
- **No nested teams**: only the lead calls TeamCreate. Teammates cannot spawn sub-teams.
- **Shutdown before TeamDelete**: TeamDelete fails if any teammate is still active.
- **Broadcast sparingly**: each broadcast = one API call per teammate. Default to direct messages.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `TeamCreate` fails | Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set |
| Teammate not claiming tasks | Check `blockedBy` deps with `TaskGet` — task may be waiting on another |
| Teammate idle and unresponsive | Send a direct `SendMessage` — idle agents wake on receipt |
| `TeamDelete` fails | Teammates still running. Send `shutdown_request` to each, wait for `shutdown_response` |
| Teammate went off-script | Send correction via `SendMessage`. If severe, shutdown and respawn with clearer prompt |
