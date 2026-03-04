# Permissions and Isolation

## The `mode` Parameter — Critical

The `mode` parameter on Agent spawning controls how the agent handles permission prompts. **Without `mode: "bypassPermissions"`, teammates block** waiting for interactive prompts that will never arrive, stalling the entire team indefinitely.

**Always set `mode: "bypassPermissions"` for agent team members.**

```
Agent(
  subagent_type: "bopen-tools:design-specialist",
  team_name: "feature-billing",
  name: "designer",
  mode: "bypassPermissions",   # ← Required for teams
  prompt: "..."
)
```

## Mode Options

| Mode | Behavior | Use when |
|------|----------|----------|
| `bypassPermissions` | Skips ALL permission checks — no prompts | Trusted agents doing known work. **Recommended default for all teammates.** |
| `acceptEdits` | Auto-approves file edits; asks for other permissions | Want edit autonomy but caution on Bash/destructive ops |
| `dontAsk` | Doesn't prompt (silently respects existing restrictions) | Silent operation; agent already has needed permissions via settings |
| `plan` | Agent enters plan mode; requires lead's `plan_approval_response` before proceeding | High-stakes changes where lead wants to review the plan first |
| `default` | Normal interactive behavior — **will block waiting for prompts** | **Avoid in teams.** Only meaningful for solo agents with a human present. |

### When to Use `plan` Mode

Use `plan` mode for agents making large structural changes — database migrations, API redesigns, major refactors — where you want to review their approach before they write a single line:

```
Agent(
  subagent_type: "bopen-tools:database-specialist",
  team_name: "feature-billing",
  name: "db-designer",
  mode: "plan",
  prompt: "Design the billing schema. Present your plan before implementing."
)
```

The agent will exit plan mode and send you a `plan_approval_request`. You respond with:
```
SendMessage(
  type: "plan_approval_response",
  request_id: "...",    # from the request
  recipient: "db-designer",
  approve: true
)
```

Then the agent proceeds with implementation.

## Worktree Isolation — for Parallel Edits

When multiple agents edit the **same codebase in parallel**, you risk git conflicts. Use `isolation: "worktree"` to give each agent its own isolated git worktree:

```
Agent(
  subagent_type: "bopen-tools:nextjs-specialist",
  team_name: "feature-billing",
  name: "frontend",
  mode: "bypassPermissions",
  isolation: "worktree",   # ← Each agent gets its own branch
  prompt: "..."
)
```

### How worktree isolation works

1. Claude Code creates a temporary git worktree at `.claude/worktrees/<name>` with a new branch based on HEAD
2. The agent works on this isolated copy — no conflicts with other agents
3. If the agent makes **no changes**, the worktree is automatically cleaned up
4. If the agent **makes changes**, the worktree path and branch name are returned in the result
5. The lead (you) must then merge each agent's branch once all agents complete

### Trade-offs

| With worktree | Without worktree |
|---------------|-----------------|
| Agents can't conflict with each other | Agents may conflict on same files |
| Lead must merge branches at the end | Changes land directly in working tree |
| Cleaner for large parallel feature work | Simpler for well-partitioned tasks |

### When to use worktree isolation

**Use it when:**
- Multiple agents will edit the same files (e.g., two agents both touch `package.json`)
- Large codebase changes where git conflicts are likely
- You want clean, reviewable branches per agent

**Skip it when:**
- Agents work on strictly separate files/directories
- The task is read-only (analysis, auditing, documentation output)
- The team is small (1-2 agents) with clearly partitioned work

### Merge workflow after worktree agents complete

```bash
# Each agent that made changes returns its branch name
# Example: agent "frontend" worked on branch feature-billing-frontend

git merge feature-billing-frontend
git merge feature-billing-backend
# Resolve any conflicts, then push
```
