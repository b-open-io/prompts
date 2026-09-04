---
name: deploy-agent-team
version: 1.0.7
description: This skill should be used when the user says "deploy a team", "spin up agents to work on this", "use all our agents", "coordinate specialists", or wants to break a large task into parallel sub-tasks handled by multiple domain experts simultaneously. Orchestrates Claude Code's experimental agent team system using the full installed specialist roster.
disable-model-invocation: true
---

# Deploy Agent Team

Deploy a coordinated team of specialized agents from the core kit using Claude Code's agent team system. Agents work in parallel on independent tasks and communicate through a shared task list and message bus.

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

Without this, team mode stays off and named subagents run as ordinary subagents instead of teammates.

## Critical: Configure Permissions Before Spawning

Start from the lead session's permission settings and inspect the live `Agent`
tool schema before spawning. The schema is the contract: field names and
accepted values change between builds, so read them in-session rather than
relying on a frozen signature copied from docs. When the schema offers a
per-spawn permission mode, prefer a safe non-interactive option with narrow
allow rules. When it does not, the teammate inherits the lead's posture and
permission requests may bubble up to the lead.

Do not launch the lead with `--dangerously-skip-permissions` merely to avoid team
prompts. Reserve that mode for an explicitly trusted, externally sandboxed
environment.

See `references/permissions-and-isolation.md` for the permission and file-ownership
model.

When teammates perform implementation, also load and follow Coordinator's
[dispatch contract](../coordinator/references/dispatch-contract.md). Team mode
changes communication and scheduling; it does not change worktree isolation,
the review barrier, main-owned git operations, or cleanup timing.

## Available Agent Roster (Abbreviated)

| Agent | subagent_type | Best for |
|-------|--------------|----------|
| **researcher** | `research:researcher` | Libraries, APIs, docs, competitive analysis |
| **nextjs** | `web-dev:nextjs` | Next.js, React, Vercel, RSC, app router |
| **native-desktop** | `creative:native-desktop` | Native SDK, Zig, WebViews, menu-bar apps, signed DMGs |
| **designer** | `web-dev:designer` | UI, game HUDs, TV shells, directional focus, Tailwind, accessibility |
| **agent-builder** | `orchestra:agent-builder` | AI SDK v7 agents, durable runtime selection, conditional eve evaluation |
| **database** | `dev-ops:database` | Schema, queries, PostgreSQL, Redis, Convex |
| **integration-expert** | `dev-ops:integration-expert` | REST APIs, webhooks, third-party services |
| **code-auditor** | `review:code-auditor` | Security review, vulnerability scanning |
| **tester** | `review:tester` | Unit, integration, e2e tests, CI |
| **documentation-writer** | `research:documentation-writer` | READMEs, API docs, PRDs, guides |
| **devops** | `dev-ops:devops` | Vercel+Railway+Bun, CI/CD, monitoring |
| **optimizer** | `web-dev:optimizer` | Bundle analysis, Lighthouse, Core Web Vitals |
| **architecture-reviewer** | `review:architecture-reviewer` | System design, refactoring strategy, tech debt |
| **mobile** | `web-dev:mobile` | Expo-first React Native, Swift, Kotlin, Flutter |
| **payments** | `dev-ops:payments` | Stripe, billing, financial transactions |
| **marketer** | `product-skills:marketer` | CRO, SEO, copy, launch strategy |
| **legal** | `product-skills:legal` | Privacy, compliance, ToS |
| **mcp** | `mcp-dev:mcp` | MCP server setup, config, diagnostics |
| **social-media-manager** | `brand-rep:social-media-manager` | Owned-account posts, calendars, mention replies |

Full roster with per-agent skills to mention in spawn prompts: `references/agent-roster.md`

## Full Team Lifecycle

### Step 1: Decompose the task

Before calling any tools, identify:
- What domains are involved? (frontend, backend, testing, docs, security...)
- Which tasks can run in parallel vs. must be sequential?
- What are the dependencies? (schema before API, API before tests)

### Step 2: Start the team (implicit)

There is no create-team call. The first named `Agent` spawn creates the team
implicitly. Current lifecycle rules:

- One team per session with a fixed lead.
- Named subagents become teammates while team mode is enabled.
- No nesting: teammates cannot spawn their own teams.
- Teammates are not restored after the lead uses `/resume` or `/rewind`; an
  idle teammate in the current live session remains messageable — message it
  or respawn it instead.
- Manage assignments and ordering with the task tools (`TaskCreate`,
  `TaskUpdate` with dependencies, `TaskList`, `TaskGet`).

Spawn the first teammate with a name and a self-contained prompt (see Step 4).
The team exists from that spawn until the session ends.

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

Inspect the live `Agent` tool schema, then spawn each teammate by name with a
self-contained prompt (see `references/spawn-prompt-guide.md` for the full
template). Give each spawn the specialist type, a stable teammate name, and the
prompt. Pass only the fields the live schema exposes; do not copy a frozen
parameter list from older docs.

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

### Step 6: Wrap up

Shutdown requests are optional. When work is complete, you may send each
teammate a shutdown request and let it finish, or simply end the session: there
is no delete-team call and the team ends with the session.

```
SendMessage(type: "shutdown_request", recipient: "designer", content: "Work complete")
SendMessage(type: "shutdown_request", recipient: "backend", content: "Work complete")
SendMessage(type: "shutdown_request", recipient: "tester", content: "Work complete")
```

## Task Decomposition Patterns

### Feature implementation
```
Parallel from the start:
├── researcher: research best practices / prior art
├── designer: UI components
├── nextjs or integration-expert: API / server logic
└── database: schema changes

Blocked until implementation complete:
├── tester: test suite
└── documentation-writer: feature docs
```

### Security audit + fix
```
Parallel:
├── code-auditor: full vulnerability scan (Semgrep, CodeQL)
└── architecture-reviewer: structural/design issues

Blocked until audit complete:
├── nextjs or integration-expert: fix findings
└── tester: regression tests
```

### Launch prep
```
Parallel:
├── code-auditor: security review
├── tester: coverage audit
├── optimizer: Lighthouse + bundle
├── documentation-writer: user-facing docs
└── legal: privacy / ToS

Blocked until all above complete:
└── devops: deploy pipeline
```

## Key Rules

- **Use the safest effective permission mode**: pre-approve only the operations teammates need; never default to bypass
- **Self-contained prompts**: teammates get zero conversation history — include repo path, conventions, and full context
- **Mention agent skills in spawn prompts** — each agent has specialized skills; tell them which to use
- **One task at a time**: claim → complete → claim next. No parallel hoarding
- **No JSON in messages**: use TaskUpdate for status. SendMessage is plain text only
- **Idle is normal**: teammates go idle between tasks. Send a message to wake them
- **No nested teams**: one team per session with a fixed lead; teammates never spawn sub-teams
- **No restore across resume**: teammates are not restored after the lead uses `/resume` or `/rewind`; an idle teammate in the current live session remains messageable
- **Shutdown is optional**: the session ends the team; there is nothing to delete
- **Broadcast sparingly**: each broadcast = one API call per teammate

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Team mode stays off (subagents run solo, no teammates) | Check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in the lead session |
| Teammate hits permission prompts | Pre-approve the specific safe operation in the lead's settings, then retry |
| Teammate not claiming tasks | Check `blockedBy` deps with `TaskGet` |
| Teammate idle and unresponsive | Send a direct `SendMessage` — idle agents wake on receipt |
| Teammate went off-script | Send correction via `SendMessage`. If severe, shutdown and respawn |

## References

- `references/permissions-and-isolation.md` — inherited permissions and safe file partitioning
- `references/agent-roster.md` — full roster table + which skills to mention per agent in spawn prompts
- `references/spawn-prompt-guide.md` — complete spawn prompt template with skills section
