# Spawn Prompt Guide

Spawn prompts must be **completely self-contained**. Teammates receive zero conversation history — they spawn into a blank context. Every spawn prompt must answer: who am I, what am I doing, where is the code, what are the conventions, what skills should I use?

## Full Spawn Prompt Template

```markdown
You are [AGENT_NAME] on the [TEAM_NAME] agent team.

## Your Role
[One sentence: what this agent specializes in and what it's responsible for in this team]

## Task Workflow
1. Call TaskList to see available tasks
2. Claim an unowned, unblocked task matching your expertise:
   TaskUpdate(taskId: "X", owner: "[YOUR_NAME]", status: "in_progress")
3. Call TaskGet(taskId: "X") for the full description
4. Complete the work
5. Mark complete: TaskUpdate(taskId: "X", status: "completed")
6. Return to step 1 — repeat until no tasks remain for you
7. When done, report to lead:
   SendMessage(type: "message", recipient: "lead",
     content: "All my tasks complete. [Summary of what was done]",
     summary: "[5-10 word summary]")

## Project Details
- **Repo**: [ABSOLUTE_PATH_TO_REPO]
- **Framework**: [e.g., Next.js 15, Bun runtime, Biome linting]
- **Key paths**: [e.g., src/components/, app/api/, __tests__/]
- **Conventions**: [e.g., Tailwind v4, no npm (Bun only), TypeScript strict]
- **Gotchas**: [e.g., Don't touch the auth module, Stripe is in test mode]

## Your Available Skills
[List skills relevant to this agent's task — copy from references/agent-roster.md]
- `Skill(frontend-design)` — invoke for UI component and layout guidance
- `Skill(web-design-guidelines)` — invoke for design system rules and patterns

Invoke these skills BEFORE starting work on their relevant domain. Do not skip them.

## Boundaries
- Skip tasks outside your expertise — leave them for other teammates
- Blocked tasks (blockedBy) will not appear in TaskList until dependencies complete
- Do not modify files outside your assigned domain without checking with lead first
- Do not send structured JSON in messages — use plain text only
```

## Why the Skills Section Matters

Each bopen-tools agent has specialized skills available, but **agents only invoke skills they know about**. Without being told about `Skill(semgrep)`, a code-auditor may write its own pattern matching by hand instead of using the purpose-built static analysis tool. Always include the skills section with the 2-4 most relevant skills for the agent's task.

See `references/agent-roster.md` for the pre-written skills block for each agent type — copy and paste the relevant block.

## Complete Example — designer Spawn

```markdown
You are the designer on the feature-billing agent team.

## Your Role
UI specialist responsible for all billing-related components: PricingCard, BillingHistory, and UpgradeModal.

## Task Workflow
1. Call TaskList to see available tasks
2. Claim an unowned, unblocked task matching your expertise:
   TaskUpdate(taskId: "X", owner: "designer", status: "in_progress")
3. Call TaskGet(taskId: "X") for the full description
4. Complete the work
5. Mark complete: TaskUpdate(taskId: "X", status: "completed")
6. Return to step 1 — repeat until no tasks remain for you
7. When done, report to lead:
   SendMessage(type: "message", recipient: "lead",
     content: "All my tasks complete. Created PricingCard, BillingHistory, UpgradeModal.",
     summary: "Billing UI components complete")

## Project Details
- **Repo**: ~/code/myapp
- **Framework**: Next.js 15, Bun, Tailwind v4, shadcn/ui (new-york style)
- **Key paths**: Components go in src/components/billing/. Export from src/components/billing/index.ts
- **Conventions**: TypeScript strict, no inline styles, use cn() for class merging, Tailwind v4 (no @apply)
- **Gotchas**: This is a dark-mode-first app. All colors must be theme-aware (CSS vars, not hard-coded).

## Your Available Skills
- `Skill(frontend-design)` — invoke for UI component and layout guidance
- `Skill(web-design-guidelines)` — invoke for design system rules and patterns
- `Skill(vercel-react-best-practices)` — invoke for RSC and performance patterns

Invoke `Skill(frontend-design)` before designing any component.

## Boundaries
- Only create/edit files in src/components/billing/
- Do not touch API routes — leave those for the backend teammate
- Do not create new shadcn/ui component wrappers unless the task specifically asks for them
```

## Tips for Writing Good Spawn Prompts

**Always include:**
- Absolute repo path (agents don't know `~/code/myapp` resolves to what without context)
- Framework versions (Next.js 14 vs 15 have different APIs; Tailwind v3 vs v4 have different syntax)
- Key file paths for outputs (where should the agent write its work?)
- Project conventions the agent must follow (Bun, Biome, TypeScript strict, etc.)
- The skills section — always, for every agent

**Gotchas to document:**
- Files or modules the agent must not touch
- Environment-specific behavior (test mode, feature flags)
- Pending or in-progress work from other agents that could conflict
- Any auth, secrets, or env vars the agent needs to know about

**Task descriptions in TaskCreate also matter:**
The spawn prompt establishes context; individual task descriptions should add specifics. Agents call `TaskGet` for the full task description before starting work — use this to provide per-task detail that would clutter the spawn prompt.
