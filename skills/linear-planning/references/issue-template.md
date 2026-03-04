# Issue Template: Agent-Ready Linear Tickets

Copy-paste templates for creating well-structured Linear issues that agents can implement without clarification.

## Parent Issue / Epic Template

```markdown
## Overview
[1-3 sentences: what this feature/project does and why we're building it]

## Spec
[Link to spec file in repo, if one exists]
See: `docs/specs/feature-name.md`

## Architecture & Key Decisions
- [Key technical decision 1]
- [Key technical decision 2]
- [Any constraints or gotchas]

## Repo Context
- **Repo**: ~/code/myapp (or absolute path)
- **Framework**: [e.g., Next.js 15, Bun runtime, Tailwind v4]
- **Key paths**: [e.g., src/components/, app/api/, __tests__/]
- **Conventions**: [e.g., Biome linting, TypeScript strict, shadcn/ui]

## Child Issues
This epic is broken into the following tasks:
- [ ] [Issue title] — [one line description]
- [ ] [Issue title] — [one line description]
- [ ] [Issue title] — [one line description]

## Definition of Done
- [ ] All child issues completed
- [ ] Feature works end-to-end in development
- [ ] bun run build passes
- [ ] No regressions
```

---

## Feature Implementation Issue Template

```markdown
## Context
Part of: [EPIC-XXX — Epic title]
See parent issue for full project context and spec link.

## What to Build
[Clear description of the specific deliverable]

Specific components/functions/routes to create:
- `ComponentName` — [what it does]
- `functionName` — [what it does]

## Files
**Create:**
- `src/components/feature/ComponentName.tsx`
- `app/api/feature/route.ts`

**Update:**
- `src/components/feature/index.ts` — add new exports
- `src/types/feature.ts` — add new types

**Do not touch:**
- `src/auth/` — owned by auth module, hands off

## Implementation Notes
- [Specific approach, library to use, pattern to follow]
- [Any gotchas or edge cases to handle]
- [Example code if helpful]

```typescript
// Example: how the component should be called
<ComponentName
  propA="value"
  onAction={(result) => { ... }}
/>
```

## Environment / Config
- Env var needed: `FEATURE_API_KEY` (already in .env.local)
- API endpoint: `POST /api/feature` (see app/api/feature/route.ts)

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] TypeScript compiles with no errors
- [ ] `bun run build` passes
- [ ] `bun run lint` passes
```

---

## Bug Fix Issue Template

```markdown
## Bug Description
[What's broken, what the user sees]

## Root Cause
[What's causing it — be specific]

Example: `src/components/Billing.tsx:47` constructs URL as `/api/invoice/${id}`
but the route handler is at `/api/invoices/${id}` (plural).

## Files to Change
- `src/components/Billing.tsx` — line 47, fix URL path
- `app/api/invoices/[id]/route.ts` — verify handler exists (read-only)

## Fix
[Exact change to make]
```diff
- const url = `/api/invoice/${id}`
+ const url = `/api/invoices/${id}`
```

## Acceptance Criteria
- [ ] [The thing that was broken now works]
- [ ] No regressions in related functionality
- [ ] `bun run build` passes
```

---

## Refactor Issue Template

```markdown
## What to Refactor
[Current state and why it's a problem]

## Target State
[What it should look like after]

## Scope
**In scope:**
- `src/lib/utils.ts` — extract date helpers into `src/lib/date.ts`
- `src/components/` — update all imports

**Out of scope:**
- Test files (update separately)
- Any behavioral changes — pure structural refactor only

## Files
[List every file that will change]

## Verification
- [ ] All imports resolve (no TypeScript errors)
- [ ] `bun run build` passes
- [ ] No behavioral changes — this is structure only
```

---

## Tips for Agent-Ready Descriptions

**Always include:**
- Exact file paths (relative to repo root)
- Line numbers for bug locations when known
- The framework version (Next.js 14 vs 15 API differences matter)
- Whether to create vs update vs delete files
- What NOT to touch (boundaries)

**Acceptance criteria must be testable:**
- ❌ "Works correctly"
- ✅ "bun run build passes with no type errors"
- ❌ "Looks good"
- ✅ "PricingCard renders plan name and price from props"

**Code examples help more than prose:**
```typescript
// Show the interface the agent should implement
interface PricingCardProps {
  planName: string
  price: number
  features: string[]
  onUpgrade: () => void
}
```

**Reference the spec file, don't duplicate it:**
```markdown
## Spec
Full implementation details in: `docs/specs/billing.md`
Pay special attention to: the "Edge Cases" section on line 47
```
