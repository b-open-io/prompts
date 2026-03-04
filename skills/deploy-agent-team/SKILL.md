---
name: deploy-agent-team
version: 1.0.1
description: This skill should be used when the user says "deploy a team", "spin up agents to work on this", "use all our agents", "coordinate specialists", or wants to break a large task into parallel sub-tasks handled by multiple domain experts simultaneously. Orchestrates Claude Code's experimental agent team system using the full bopen-tools specialist roster.
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

## Critical: Set `mode` on Every Agent Spawn

> **WARNING**: The default permission mode **will block teammates** waiting for permission prompts that never arrive, stalling the whole team.

Always set `mode: "bypassPermissions"` when spawning teammates:

```
Agent(
  subagent_type: "bopen-tools:design-specialist",
  team_name: "feature-billing",
  name: "designer",
  mode: "bypassPermissions",   # ← REQUIRED
  prompt: "..."
)
```

See `references/permissions-and-isolation.md` for all mode options and worktree isolation.

## Available Agent Roster (Abbreviated)

| Agent | subagent_type | Best for |
|-------|--------------|----------|
| **research-specialist** | `bopen-tools:research-specialist` | Libraries, APIs, docs, competitive analysis |
| **nextjs-specialist** | `bopen-tools:nextjs-specialist` | Next.js, React, Vercel, RSC, app router |
| **design-specialist** | `bopen-tools:design-specialist` | UI, Tailwind, shadcn/ui, accessibility |
| **agent-specialist** | `bopen-tools:agent-specialist` | AI agent systems, LLM integration, Vercel AI SDK |
| **database-specialist** | `bopen-tools:database-specialist` | Schema, queries, PostgreSQL, Redis, Convex |
| **integration-expert** | `bopen-tools:integration-expert` | REST APIs, webhooks, Payload CMS |
| **code-auditor** | `bopen-tools:code-auditor` | Security review, vulnerability scanning |
| **test-specialist** | `bopen-tools:test-specialist` | Unit, integration, e2e tests, CI |
| **documentation-writer** | `bopen-tools:documentation-writer` | READMEs, API docs, PRDs, guides |
| **devops-specialist** | `bopen-tools:devops-specialist` | Vercel+Railway+Bun, CI/CD, monitoring |
| **optimizer** | `bopen-tools:optimizer` | Bundle analysis, Lighthouse, Core Web Vitals |
| **architecture-reviewer** | `bopen-tools:architecture-reviewer` | System design, refactoring strategy, tech debt |
| **mobile-specialist** | `bopen-tools:mobile-specialist` | React Native, Swift, Kotlin, Flutter |
| **payment-specialist** | `bopen-tools:payment-specialist` | Stripe, billing, financial transactions |
| **marketing-specialist** | `bopen-tools:marketing-specialist` | CRO, SEO, copy, launch strategy |
| **legal-specialist** | `bopen-tools:legal-specialist` | Privacy, compliance, ToS |
| **mcp-specialist** | `bopen-tools:mcp-specialist` | MCP server setup, config, diagnostics |

Full roster with per-agent skills to mention in spawn prompts: `references/agent-roster.md`

## Full Team Lifecycle

### Step 1: Decompose the task

Before calling any tools, identify:
- What domains are involved? (frontend, backend, testing, docs, security...)
- Which tasks can run in parallel vs. must be sequential?
- What are the dependencies? (schema before API, API before tests)

### Step 2: Create the team

```
TeamCreate(
  team_name: "feature-billing",
  description: "Implement Stripe billing with UI, API, tests, and docs"
)
```

### Step 3: Create tasks upfront

Set dependencies with `addBlockedBy` where order matters:

```
TaskCreate(
  subject: "Design billing UI components",
  description: "Create PricingCard, BillingHistory, UpgradeModal using shadcn/ui.
  Repo: ~/code/myapp. Tailwind v4. Output: src/components/billing/.",
  activeForm: "Designing billing UI"
) → id: "1"

TaskCreate(
  subject: "Implement Stripe integration",
  description: "Set up webhooks, subscription creation, customer portal.
  Repo: ~/code/myapp. API routes in app/api/billing/.",
  activeForm: "Implementing Stripe integration"
) → id: "2"

TaskCreate(
  subject: "Write billing test suite",
  description: "Vitest tests for all billing API routes and webhook handler.
  Repo: ~/code/myapp. Tests in __tests__/billing/.",
  activeForm: "Writing billing tests"
) → id: "3"

TaskUpdate(taskId: "3", addBlockedBy: ["2"])  # tests wait for Stripe impl
```

### Step 4: Spawn teammates

```
Agent(
  subagent_type: "bopen-tools:design-specialist",
  team_name: "feature-billing",
  name: "designer",
  mode: "bypassPermissions",
  prompt: "..."  # see references/spawn-prompt-guide.md
)
```

Every spawn prompt must be **self-contained** — teammates have zero conversation history. See `references/spawn-prompt-guide.md` for the full template and how to list each agent's available skills.

### Step 5: Monitor and coordinate

Messages from teammates arrive automatically. Check progress:
```
TaskList()
```

Answer a blocked teammate:
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

## Task Decomposition Patterns

### Feature implementation
```
Parallel from the start:
├── research-specialist: research best practices / prior art
├── design-specialist: UI components
├── nextjs-specialist or integration-expert: API / server logic
└── database-specialist: schema changes

Blocked until implementation complete:
├── test-specialist: test suite
└── documentation-writer: feature docs
```

### Security audit + fix
```
Parallel:
├── code-auditor: full vulnerability scan (Semgrep, CodeQL)
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

- **`mode: "bypassPermissions"`** on every Agent spawn or teammates block
- **Self-contained prompts**: teammates get zero conversation history — include repo path, conventions, and full context
- **Mention agent skills in spawn prompts** — each agent has specialized skills; tell them which to use
- **One task at a time**: claim → complete → claim next. No parallel hoarding
- **No JSON in messages**: use TaskUpdate for status. SendMessage is plain text only
- **Idle is normal**: teammates go idle between tasks. Send a message to wake them
- **No nested teams**: only the lead calls TeamCreate
- **Shutdown before TeamDelete**: TeamDelete fails if any teammate is still active
- **Broadcast sparingly**: each broadcast = one API call per teammate

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `TeamCreate` fails | Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set |
| Teammate blocks/stalls | Missing `mode: "bypassPermissions"` — always set this |
| Teammate not claiming tasks | Check `blockedBy` deps with `TaskGet` |
| Teammate idle and unresponsive | Send a direct `SendMessage` — idle agents wake on receipt |
| `TeamDelete` fails | Teammates still running. Send `shutdown_request` to each |
| Teammate went off-script | Send correction via `SendMessage`. If severe, shutdown and respawn |

## References

- `references/permissions-and-isolation.md` — `mode` parameter options, worktree isolation for parallel edits
- `references/agent-roster.md` — full roster table + which skills to mention per agent in spawn prompts
- `references/spawn-prompt-guide.md` — complete spawn prompt template with skills section
