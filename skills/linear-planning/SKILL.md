---
name: linear-planning
version: 1.0.2
description: This skill should be used when the user wants to plan a project, feature, or bug fix using Linear as the agent control plane. Use when the user says "plan this in Linear", "create Linear tickets", "break this down into tasks", "push to Linear", "set up our board for this feature", or wants to turn a description or spec into well-structured, agent-ready Linear issues. Requires the official Linear MCP server to be configured.
---

# Linear Planning

Turn project descriptions, feature requests, or codebases into well-structured Linear issues that agents can pick up and implement without ambiguity. Linear acts as the agent control plane — replacing markdown task files with a proper board with status tracking, dependency management, and team visibility.

## Prerequisites: Official Linear MCP Server

Linear provides an official hosted MCP server — no npm package to install.

**Claude Code setup** (one command):
```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` to complete OAuth authentication.

After connecting, run `/mcp` to see all available tools — the official server exposes tools for finding, creating, and updating issues, projects, and comments.

See `references/mcp-setup.md` for setup on other clients (Claude Desktop, Cursor, VS Code) and troubleshooting.

> **Important**: Only the main Claude Code session can call MCP tools. Spawned subagents do not have MCP access — pass issue content to them via task descriptions.

## The Core Principle: Tickets as Agent Briefs

Linear tickets in this workflow are **complete work briefs for an AI agent**, not status cards. A well-written ticket lets an agent pick it up and implement it without clarifying questions.

Every ticket must answer:
1. **What** — the specific deliverable
2. **Why** — context so the goal is clear
3. **Where** — exact files and directories
4. **How** — implementation approach or constraints
5. **Done when** — explicit, testable acceptance criteria

See `references/issue-template.md` for copy-paste templates.

## Workflow: Plan → Create → Execute

### Phase 1: Gather Context

Start by discovering the team, project, and workflow states needed for issue creation:

```
[teams tool]           → get teamId
[projects tool]        → get projectId for the team
[workflow states tool] → get state IDs (Todo, In Progress, In Review, Done)
[labels tool]          → get label IDs if needed
```

Determine before creating any issues:
- Which Linear team and project to use
- Whether there is an existing parent/epic to attach to
- The spec file path in the repo, if one exists
- The branch naming convention (e.g., `feat/PROJ-123-short-title`)

### Phase 2: Decompose the Work

Break the request into independent, implementable tasks:

```
Feature: "Add billing with Stripe"

Parent (Epic):
└── Stripe billing integration

Can run in parallel:
├── Create billing UI components
├── Implement Stripe webhook handler
├── Add subscription creation API route
└── Add customer portal API route

Blocked until implementation complete:
├── Write billing test suite
└── Update environment variable docs
```

Decomposition rules:
- Each issue must be completable in one agent session
- Minimize dependencies between issues
- Separate UI, API, and tests into distinct issues
- Blocked issues must explicitly reference their dependencies in the description

### Phase 3: Create the Parent Issue (Epic)

Create the parent first with full project context — agents read it before working on any child:

```
[create issue tool](
  teamId, projectId,
  title: "Stripe billing integration",
  description: """
  ## Overview
  [What this feature does and why]

  ## Spec
  See: docs/specs/billing.md

  ## Repo Context
  - Repo: ~/code/myapp
  - Framework: Next.js 15, Bun, Tailwind v4
  - Conventions: Biome linting, TypeScript strict, shadcn/ui

  ## Child Issues
  - [ ] Create billing UI components
  - [ ] Implement Stripe webhook handler
  - [ ] Write billing test suite
  """,
  priority: 2   # 1=urgent 2=high 3=medium 4=low
)
```

### Phase 4: Create Child Issues

```
[create issue tool](
  teamId, projectId,
  parentId: "EPIC-ID",
  title: "Create billing UI components",
  description: "...",   # see issue-template.md for the full format
  stateId: "todo-state-id"
)
```

Each child issue description must include: context link to the parent, files to create/modify, implementation approach, and acceptance criteria.

### Phase 5: Assign to Cycles (optional)

```
[active cycle tool](teamId)
[add to cycle tool](issueId, cycleId)
```

## Agent Execution Loop

Include this pattern in every agent task description or spawn prompt so agents know the expected workflow:

```
1. Fetch issue details (read the full brief)
2. Read parent issue for project context
3. Update status → "In Progress"
4. git checkout -b feat/PROJ-3-billing-ui-components
5. Implement the changes
6. bun run build && bun run lint
7. gh pr create --title "PROJ-3: Create billing UI components"
8. Update status → "In Review"
```

## Writing Great Ticket Descriptions

The biggest leverage point in this workflow is ticket quality. A vague ticket wastes the agent's context on clarification. A detailed ticket means straight implementation.

**Bad:**
```
Title: Fix billing page
Description: Something is broken on the billing page.
```

**Good:**
```
Title: Fix invoice download returning 404
Description:
## Bug
Download button on BillingHistory shows 404.
Root cause: URL uses /api/invoice/:id but route is /api/invoices/:id (plural).

## Files
- app/api/invoices/[id]/route.ts — correct route handler
- src/components/billing/BillingHistory.tsx:47 — where URL is built

## Fix
Line 47: `/api/invoice/${id}` → `/api/invoices/${id}`

## Acceptance Criteria
- [ ] Download button fetches PDF without error
- [ ] bun run build passes
```

See `references/issue-template.md` for complete templates (feature, bug, refactor, epic).

## References

- `references/mcp-setup.md` — Installing the official Linear MCP server, authentication, troubleshooting
- `references/issue-template.md` — Copy-paste templates for agent-ready tickets
