---
name: linear-planning
version: 1.0.0
description: This skill should be used when the user wants to plan a project, feature, or bug fix using Linear as the agent control plane. Use when the user says "plan this in Linear", "create Linear tickets", "break this down into tasks", "push to Linear", "set up our board for this feature", or wants to turn a description or spec into well-structured, agent-ready Linear issues. Requires the Linear MCP server to be configured.
---

# Linear Planning

Turn project descriptions, feature requests, or codebases into well-structured Linear issues that agents can pick up and implement without ambiguity. Linear acts as the agent control plane — replacing markdown task files with a proper board that has status tracking, dependency management, and team visibility.

## Prerequisites: Linear MCP Server

The Linear MCP server must be installed before using this skill:

```bash
# One-time setup in Claude Code
/mcp
# Then authenticate with your Linear account
```

If not yet installed, see `references/mcp-setup.md` for full setup instructions.

Verify access is working:
```
linear_get_teams()    # Should return your teams
linear_get_projects() # Should return your projects
```

## The Core Principle: Tickets as Agent Briefs

Linear tickets in this workflow are not just status trackers — they are **complete work briefs for an AI agent**. A good ticket should let an agent pick it up and implement it without asking any clarifying questions.

Every ticket needs:
1. **What** — clear description of the change
2. **Why** — context so the agent understands the goal
3. **Where** — exact files/directories involved
4. **How** — implementation approach or constraints
5. **Done when** — explicit acceptance criteria

See `references/issue-template.md` for the full template.

## Workflow: Plan → Create → Execute

### Phase 1: Understand the Project

Before creating any tickets:

```
# Get your team and project context
linear_get_teams()
linear_get_projects(teamId: "...")
```

Ask the user (or infer from context):
- Which Linear team and project to use?
- Is there an existing parent/epic to attach to?
- What's the spec file path in the repo (if any)?
- What's the branch naming convention? (e.g., `feat/`, `fix/`)
- What states are available? (e.g., Todo, In Progress, In Review, Done)

### Phase 2: Plan the Work

Break the request into independent, implementable tasks. Good decomposition:

```
Feature: "Add billing with Stripe"

Parent issue (Epic):
└── Stripe billing integration

Child issues:
├── Create billing UI components (PricingCard, BillingHistory, UpgradeModal)
├── Implement Stripe webhook handler
├── Add subscription creation API route
├── Add customer portal API route
├── Write billing test suite
└── Update environment variable documentation
```

Rules for decomposition:
- Each issue should be completable in one agent session (a few hours max)
- Issues should be as independent as possible — minimize blockers
- Blocked issues should reference what they depend on
- Group UI, API, and tests as separate issues when possible

### Phase 3: Create the Parent Issue (Epic)

Create a parent issue first that contains the full project context:

```
linear_create_issue(
  teamId: "...",
  projectId: "...",
  title: "Stripe billing integration",
  description: """
  ## Overview
  [What this feature does and why we're building it]

  ## Spec
  See: [path/to/spec.md in repo]

  ## Architecture
  [Key decisions, constraints, tech choices]

  ## Child Issues
  This epic will be broken into the following issues:
  - [ ] Billing UI components
  - [ ] Stripe webhook handler
  - etc.

  ## Project Context
  - Repo: ~/code/myapp
  - Framework: Next.js 15, Bun, Tailwind v4
  - Key paths: src/components/, app/api/billing/
  """,
  priority: 2  # 1=urgent, 2=high, 3=medium, 4=low
)
```

### Phase 4: Create Child Issues

Create each implementation ticket with full detail. Reference the parent:

```
linear_create_issue(
  teamId: "...",
  projectId: "...",
  parentId: "EPIC-123",   # link to parent
  title: "Create billing UI components",
  description: """
  ## Context
  Part of the Stripe billing integration (EPIC-123).
  See parent issue for full project context and spec link.

  ## What to Build
  Create three reusable billing components:
  - `PricingCard` — displays plan name, price, features list, CTA button
  - `BillingHistory` — table of past invoices with download links
  - `UpgradeModal` — modal triggered when user hits a plan limit

  ## Files
  - Create: `src/components/billing/PricingCard.tsx`
  - Create: `src/components/billing/BillingHistory.tsx`
  - Create: `src/components/billing/UpgradeModal.tsx`
  - Update: `src/components/billing/index.ts` (add exports)

  ## Implementation Notes
  - Use shadcn/ui components (Card, Table, Dialog)
  - Tailwind v4 — no @apply, no hard-coded colors
  - All colors must be theme-aware (CSS vars)
  - TypeScript strict — define prop interfaces

  ## Acceptance Criteria
  - [ ] PricingCard renders plan details and calls onUpgrade callback
  - [ ] BillingHistory shows invoice rows with date, amount, status
  - [ ] UpgradeModal opens/closes via isOpen prop
  - [ ] All components have TypeScript prop types
  - [ ] `bun run build` passes with no type errors
  """,
  priority: 3
)
```

### Phase 5: Set Up Dependencies

After creating issues, set blockers where order matters:

```
# Tests must wait for implementation
linear_update_issue(
  issueId: "PROJ-5",  # test issue
  description: "...\n\n**Blocked by**: PROJ-3, PROJ-4"
)
```

Note: Linear's API may support direct dependency linking depending on your plan — check available tools with your MCP installation.

## Agent Execution Workflow

Once tickets are in Linear, agents follow this workflow to implement them:

```
1. linear_get_issue(issueId: "PROJ-3")
2. Read parent issue for project context
3. Read spec file if referenced
4. linear_update_issue(issueId: "PROJ-3", stateId: "in-progress-state-id")
5. Create git branch: git checkout -b feat/PROJ-3-billing-ui-components
6. Implement the changes
7. Run verification: bun run build && bun run lint
8. Open PR: gh pr create --title "PROJ-3: Create billing UI components"
9. linear_update_issue(issueId: "PROJ-3", stateId: "in-review-state-id")
```

Tell agents to follow this pattern in their spawn prompts or task descriptions.

## Writing Great Ticket Descriptions

The single biggest leverage point in this workflow is ticket quality. A vague ticket wastes the agent's context window on clarification. A detailed ticket lets the agent go straight to implementation.

**Bad:**
```
Title: Fix the billing page
Description: The billing page has some issues, please fix them.
```

**Good:**
```
Title: Fix invoice download button not working on billing history page
Description:
## Bug
The "Download PDF" button on BillingHistory shows a 404 error.
Root cause: invoice URL uses /api/invoice/:id but the route is at /api/invoices/:id (plural).

## Files
- app/api/invoices/[id]/route.ts — the correct route handler
- src/components/billing/BillingHistory.tsx:47 — where URL is constructed

## Fix
Change line 47: `/api/invoice/${id}` → `/api/invoices/${id}`

## Acceptance Criteria
- [ ] Download button fetches PDF without error
- [ ] bun run build passes
```

See `references/issue-template.md` for a copy-paste template.

## Useful Linear MCP Tools

| Tool | Use |
|------|-----|
| `linear_get_teams` | Find your team ID |
| `linear_get_projects` | Find project ID for a team |
| `linear_create_issue` | Create a new issue |
| `linear_update_issue` | Update status, assignee, description |
| `linear_get_issue` | Read full issue details |
| `linear_search_issues` | Find issues by keyword |
| `linear_get_issue_statuses` | Get available state IDs for a team |
| `linear_get_labels` | Get label IDs for a team |

## References

- `references/mcp-setup.md` — Installing and configuring the Linear MCP server
- `references/issue-template.md` — Copy-paste template for agent-ready tickets
